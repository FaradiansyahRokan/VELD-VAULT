"use client";

/**
 * tools.tsx — CipherVault Developer & Utility Suite
 *
 * Layout: Two-column split (left ink-rail + right workspace). No overlapping layers.
 * Mobile: Top scrollable tab list → content below.
 *
 * Tools:
 *  I.   Contact Manager     — full CRUD for contacts (useContactsStore)
 *  II.  Address Explorer    — read-only vault/balance lookup for any address
 *  III. Tx History          — filter + search activity log (useActivityStore)
 *  IV.  Sign Document       — upload file → SHA-256 → EIP-191 sign → verify
 *  V.   Hash Verifier       — drag file → compare SHA-256 vs on-chain hash
 *  VI.  Multi-Signer        — simulate 2-of-N approval signing flow
 *  VII. Analytics           — SVG charts of activity distribution & balance history
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useContactsStore, type Contact } from "@/lib/contact-store";
import { useActivityStore } from "@/lib/activity-store";
import { NETWORK_CONFIG } from "@/lib/constants";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getSubtleCrypto } from "@/lib/webcrypto-shim";

/* ── Constants ───────────────────────────────────────────────── */


const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const EMOJIS = ["🦊", "🐺", "🦁", "🐯", "🦅", "🦋", "🐉", "🌙", "⚡", "🔮", "🎯", "🛡️", "🌊", "🔥", "❄️", "🎭"];

/* ── Tool registry ───────────────────────────────────────────── */
const TOOLS = [
  { id: "contacts", num: "01", label: "Contact Manager", hint: "Add, edit & organise wallet contacts" },
  { id: "explorer", num: "02", label: "Address Explorer", hint: "Inspect any address — balance & assets" },
  { id: "history", num: "03", label: "Tx History", hint: "Filter & search your transaction log" },
  { id: "sign-doc", num: "04", label: "Sign Document", hint: "Upload a file, sign its hash, verify" },
  { id: "hash", num: "05", label: "Hash Verifier", hint: "Compare file SHA-256 vs any known hash" },
  { id: "multisig", num: "06", label: "Multi-Signer", hint: "Simulate 2-of-N approval signing flows" },
  { id: "analytics", num: "07", label: "Analytics", hint: "Activity charts & balance distribution" },
] as const;
type ToolId = typeof TOOLS[number]["id"];



/* ══════════════════════════════════════════════════════════════ */
/*  SVG ICONS                                                     */
/* ══════════════════════════════════════════════════════════════ */
const Ic = {
  Search: () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" /><line x1="9.5" y1="9.5" x2="13" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>,
  Plus: () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><line x1="6.5" y1="1" x2="6.5" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><line x1="1" y1="6.5" x2="12" y2="6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>,
  Edit: () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 10 8.5 3.5l2 2L4 12H2v-2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><line x1="7.5" y1="4.5" x2="9.5" y2="2.5" stroke="currentColor" strokeWidth="1.2" /></svg>,
  Trash: () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><line x1="1" y1="3" x2="12" y2="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M2 3l.8 8.2h7.4L11 3" stroke="currentColor" strokeWidth="1.2" /><line x1="5" y1="5.5" x2="5" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><line x1="8" y1="5.5" x2="8" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M4.5 3V1.5h4V3" stroke="currentColor" strokeWidth="1.2" /></svg>,
  Copy: () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="3" width="9" height="9" stroke="currentColor" strokeWidth="1.2" /><path d="M3 3V1h9v9H10" stroke="currentColor" strokeWidth="1.2" /></svg>,
  Check: () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><polyline points="2,6.5 5,9.5 11,3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  File: () => <svg width="14" height="16" viewBox="0 0 14 16" fill="none"><path d="M2 1h7l3 3v11H2V1z" stroke="currentColor" strokeWidth="1.2" /><polyline points="8,1 8,5 12,5" stroke="currentColor" strokeWidth="1.2" /></svg>,
  Send: () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><line x1="1.5" y1="11.5" x2="11.5" y2="1.5" stroke="currentColor" strokeWidth="1.3" /><polyline points="5,1.5 11.5,1.5 11.5,8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  Chevron: ({ d = "down" }: { d?: "up" | "down" | "right" }) => {
    const pts = d === "right" ? "3,1 7,6.5 3,12" : d === "up" ? "1,7 6.5,2 12,7" : "1,4 6.5,9 12,4";
    return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points={pts} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  },
  Msg: () => <svg width="14" height="13" viewBox="0 0 14 13" fill="none"><path d="M1 1h12v9H7.5L4 12v-2H1V1z" stroke="currentColor" strokeWidth="1.2" /></svg>,
  X: () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.3" /><line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.3" /></svg>,
};

/* ══════════════════════════════════════════════════════════════ */
/*  TOOL I — CONTACT MANAGER                                      */
/* ══════════════════════════════════════════════════════════════ */
function ContactManager({ walletAddr }: { walletAddr: string }) {
  const router = useRouter();
  const { contacts, addContact, updateContact, removeContact } = useContactsStore();
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", note: "", emoji: "🦊" });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = search
    ? contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.address.toLowerCase().includes(search.toLowerCase()))
    : contacts;

  const openAdd = () => { setEditId(null); setForm({ name: "", address: "", note: "", emoji: "🦊" }); setShowForm(true); };
  const openEdit = (c: Contact) => { setEditId(c.id); setForm({ name: c.name, address: c.address, note: c.note || "", emoji: c.emoji || "🦊" }); setShowForm(true); };
  const save = () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!ethers.isAddress(form.address.trim())) { toast.error("Invalid wallet address"); return; }
    if (editId) { updateContact(editId, { name: form.name.trim(), address: form.address.trim(), note: form.note.trim(), emoji: form.emoji }); toast.success("Contact updated"); }
    else { addContact({ name: form.name.trim(), address: form.address.trim(), note: form.note.trim(), emoji: form.emoji }); toast.success("Contact added"); }
    setShowForm(false); setEditId(null);
  };
  const del = (id: string, name: string) => { if (confirm(`Remove "${name}"?`)) { removeContact(id); toast.success("Removed"); } };
  const copy = (addr: string, id: string) => { navigator.clipboard.writeText(addr); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 border border-border mb-7">
        <div className="p-5 border-b md:border-b-0 md:border-r border-border last:border-r-0"><div className="text-[28px] font-bold text-foreground tracking-tight leading-none mb-1">{contacts.length}</div><div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">Contacts</div></div>
        <div className="p-5 border-b md:border-b-0 md:border-r border-border last:border-r-0"><div className="text-[28px] font-bold text-foreground tracking-tight leading-none mb-1">{filtered.length}</div><div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">Shown</div></div>
        <div className="p-5 border-b md:border-b-0 md:border-r border-border last:border-r-0"><div className="text-[28px] font-bold text-foreground tracking-tight leading-none mb-1">{contacts.filter(c => c.note).length}</div><div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">With Notes</div></div>
      </div>

      {/* Search + Add */}
      <div className="flex gap-[10px] mb-[20px] items-end">
        <div className="relative mb-5 flex-1 flex-1 mb-0">
          <Ic.Search /><span className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none left-0 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts…"
            className="w-full bg-transparent border-0 border-b border-border py-2.5 pl-6 italic text-[16px] text-foreground outline-none transition-colors focus:border-foreground placeholder:text-muted-foreground pl-[24px]" />
        </div>
        <button className="btn-enterprise-primary h-[38px] px-[18px] text-[15px]" onClick={openAdd}>
          <Ic.Plus /> Add
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-[24px]">
            <div className="border border-border p-[24px_22px] bg-card">
              <div className="flex justify-between items-center mb-[18px]">
                <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
                  {editId ? "Edit Contact" : "New Contact"}
                </span>
                <button onClick={() => setShowForm(false)} className="bg-transparent border-none cursor-pointer text-muted-foreground"><Ic.X /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-5">
                  <label className="block font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2">Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Alice" className="w-full bg-transparent border-0 border-b border-border py-2.5 font-mono text-[13px] text-foreground outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground" />
                </div>
                <div className="mb-5">
                  <label className="block font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2">Wallet Address</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="0x…"
                    className={`w-full bg-transparent border-0 border-b border-border py-2.5 font-mono text-[13px] text-foreground outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground ${form.address ? (ethers.isAddress(form.address.trim()) ? "valid" : "invalid") : ""}`} />
                </div>
              </div>
              <div className="mb-5">
                <label className="block font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2">Note (optional)</label>
                <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Personal wallet, trading, etc." className="w-full bg-transparent border-0 border-b border-border py-2.5 font-mono text-[13px] text-foreground outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground" />
              </div>
              <div className="mb-5">
                <label className="block font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2">Avatar</label>
                <div className="grid grid-cols-8 gap-1 mt-2">
                  {EMOJIS.map(e => (
                    <button key={e} className={`w-[36px] h-[36px] border border-border cursor-pointer text-[18px] flex items-center justify-center transition-colors ${form.emoji === e ? "border-foreground bg-foreground" : "bg-muted/5 hover:border-foreground"}`}
                      onClick={() => setForm(f => ({ ...f, emoji: e }))}>{e}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap mt-1.5">
                <button className="btn-enterprise-primary" onClick={save}><Ic.Check /> {editId ? "Update" : "Save Contact"}</button>
                <button className="inline-flex items-center justify-center gap-2 h-[38px] px-4.5 bg-muted/10 text-muted-foreground border border-border rounded-xl font-mono text-[11px] tracking-widest uppercase font-semibold transition-colors hover:border-primary hover:text-foreground hover:bg-muted/20 disabled:opacity-35 disabled:cursor-not-allowed" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {filtered.length === 0
        ? <p className="font-serif text-[16px] italic text-muted-foreground py-[32px] text-center">
          {search ? "No matching contacts." : "No contacts yet. Add one above."}
        </p>
        : filtered.map(c => (
          <motion.div key={c.id} className="enterprise-card flex items-center gap-3.5 p-3.5 mb-2 transition-all hover:border-primary/40 hover:shadow-md" layout
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-10 h-10 border border-primary/25 rounded-xl bg-primary/10 flex items-center justify-center text-[20px] shrink-0">{c.emoji}</div>
            <div className="flex-1 min-w-0">
              <p className="font-serif text-[16px] text-foreground mb-[3px]">{c.name}</p>
              <p className="font-mono text-[11px] text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                {c.address}
              </p>
              {c.note && <p className="font-serif text-[13px] italic text-muted-foreground mt-[2px]">{c.note}</p>}
            </div>
            <div className="flex gap-[6px] shrink-0">
              <button className={`inline-flex items-center gap-[5px] p-[4px_10px] rounded-[8px] font-mono text-[11px] tracking-[0.1em] uppercase cursor-pointer transition-colors whitespace-nowrap shrink-0 border ${copiedId === c.id ? "border-green-500 text-green-500" : "bg-transparent border-border text-muted-foreground hover:border-primary hover:text-foreground"}`} onClick={() => copy(c.address, c.id)}>
                {copiedId === c.id ? <Ic.Check /> : <Ic.Copy />}
              </button>
              <button className="inline-flex items-center justify-center gap-2 h-[38px] px-4.5 bg-muted/10 text-muted-foreground border border-border rounded-xl font-mono text-[11px] tracking-widest uppercase font-semibold transition-colors hover:border-primary hover:text-foreground hover:bg-muted/20 disabled:opacity-35 disabled:cursor-not-allowed h-[32px] px-[10px]"
                onClick={() => router.push(`/messages?to=${c.address}`)}>
                <Ic.Msg />
              </button>
              <button className="inline-flex items-center justify-center gap-2 h-[38px] px-4.5 bg-muted/10 text-muted-foreground border border-border rounded-xl font-mono text-[11px] tracking-widest uppercase font-semibold transition-colors hover:border-primary hover:text-foreground hover:bg-muted/20 disabled:opacity-35 disabled:cursor-not-allowed h-[32px] px-[10px]" onClick={() => openEdit(c)}>
                <Ic.Edit />
              </button>
              <button className="inline-flex items-center justify-center gap-2 h-[38px] px-4.5 bg-muted/10 text-muted-foreground border border-border rounded-xl font-mono text-[11px] tracking-widest uppercase font-semibold transition-colors hover:border-primary hover:text-foreground hover:bg-muted/20 disabled:opacity-35 disabled:cursor-not-allowed danger h-[32px] px-[10px]" onClick={() => del(c.id, c.name)}>
                <Ic.Trash />
              </button>
            </div>
          </motion.div>
        ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  TOOL II — ADDRESS EXPLORER                                    */
/* ══════════════════════════════════════════════════════════════ */
function AddressExplorer() {
  const { contract } = useStore();
  const [addr, setAddr] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ balance: string; txCount: number; isContract: boolean } | null>(null);

  const lookup = async () => {
    if (!ethers.isAddress(addr.trim())) { toast.error("Invalid address"); return; }
    setLoading(true); setData(null);
    try {
      const provider = (contract as any)?.runner?.provider ?? new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const [rawBal, txCount, code] = await Promise.all([
        provider.getBalance(addr.trim()),
        provider.getTransactionCount(addr.trim()),
        provider.getCode(addr.trim()),
      ]);
      setData({ balance: ethers.formatEther(rawBal), txCount, isContract: code !== "0x" });
    } catch (e: any) { toast.error("Lookup failed — check RPC"); }
    finally { setLoading(false); }
  };

  const isValid = ethers.isAddress(addr.trim());

  return (
    <div>
      <div className="mb-5">
        <label className="block font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2">Wallet or Contract Address</label>
        <div className="flex items-start gap-2.5 items-end">
          <input value={addr} onChange={e => setAddr(e.target.value)}
            onKeyDown={e => e.key === "Enter" && lookup()}
            placeholder="0x…" className={`w-full bg-transparent border-0 border-b border-border py-[10px] font-mono text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground flex-1 ${addr ? (isValid ? "border-green-500" : "border-red-500") : "focus:border-foreground"}`}
             />
          <button className="btn-enterprise-primary ml-[10px] h-[38px] px-[20px] text-[15px] shrink-0"
            onClick={lookup} disabled={!isValid || loading}>
            {loading ? <span className="animate-spin inline-block">◌</span> : "Inspect"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {data && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
            <div className="grid grid-cols-2 md:grid-cols-3 border border-border mb-7">
              <div className="p-5 border-b md:border-b-0 md:border-r border-border last:border-r-0">
                <div className="text-[28px] font-bold text-foreground tracking-tight leading-none mb-1">{parseFloat(data.balance).toFixed(4)}</div>
                <div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">{NETWORK_CONFIG.tokenSymbol} Balance</div>
              </div>
              <div className="p-5 border-b md:border-b-0 md:border-r border-border last:border-r-0">
                <div className="text-[28px] font-bold text-foreground tracking-tight leading-none mb-1">{data.txCount.toLocaleString()}</div>
                <div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">Transactions</div>
              </div>
              <div className="p-5 border-b md:border-b-0 md:border-r border-border last:border-r-0">
                <div className="text-[28px] font-bold text-foreground tracking-tight leading-none mb-1">{data.isContract ? "Smart" : "EOA"}</div>
                <div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">Account Type</div>
              </div>
            </div>

            <div className="enterprise-card p-4 mt-4">
              <div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2.5">Address Details</div>
              <table className="w-full border-collapse">
                <tbody>
                  <tr><td className="w-[160px]"><span className="block font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2 m-0">Address</span></td>
                    <td className="mono">{addr.trim()}</td></tr>
                  <tr><td><span className="block font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2 m-0">Balance</span></td>
                    <td>{parseFloat(data.balance).toFixed(6)} {NETWORK_CONFIG.tokenSymbol}</td></tr>
                  <tr><td><span className="block font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2 m-0">Nonce / Tx Count</span></td>
                    <td>{data.txCount}</td></tr>
                  <tr><td><span className="block font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2 m-0">Type</span></td>
                    <td><span className={`inline-flex items-center gap-[5px] px-[9px] py-[3px] font-mono text-[11px] tracking-[0.12em] uppercase border ${data.isContract ? "text-muted-foreground border-border bg-muted/10" : "text-green-500 border-green-500/30 bg-green-500/10"}`}>
                      {data.isContract ? "Smart Contract" : "Externally Owned Account"}
                    </span></td></tr>
                  <tr><td><span className="block font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2 m-0">Network</span></td>
                    <td>{NETWORK_CONFIG.name} — Chain {NETWORK_CONFIG.chainId}</td></tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  TOOL III — TX HISTORY EXPLORER                               */
/* ══════════════════════════════════════════════════════════════ */
function TxHistory({ walletAddr }: { walletAddr: string }) {
  const { getActivities } = useActivityStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const all = useMemo(() => getActivities(walletAddr), [walletAddr, getActivities]);
  const TYPES = [
    "all", "transfer_out", "transfer_in", "buy", "sell",
    "list", "delist", "upload", "burn", "escrow_confirm",
    "message_sent", "message_received"
  ];

  const shown = all.filter(a => {
    const matchType = filter === "all" || a.type === filter;
    const matchQ = !search || a.title.toLowerCase().includes(search.toLowerCase()) || (a.description || "").toLowerCase().includes(search.toLowerCase()) || (a.address || "").toLowerCase().includes(search.toLowerCase());
    return matchType && matchQ;
  });

  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      transfer_out: "Sent", transfer_in: "Received", buy: "Bought", sell: "Sold",
      list: "Listed", delist: "Delisted", upload: "Uploaded", burn: "Burned",
      escrow_start: "Escrow Started", escrow_confirm: "Escrow Confirmed", escrow_cancel: "Escrow Cancelled",
      message_sent: "Sent Msg", message_received: "Rcvd Msg", sign: "Signed", faucet: "Faucet"
    };
    return map[t] || t.toUpperCase();
  };

  const typeBadge = (t: string) => {
    const fails = ["transfer_out", "sell", "burn", "delist", "escrow_cancel", "message_sent"];
    const infos = ["upload", "list", "escrow_start", "sign", "faucet"];
    if (fails.includes(t)) return "fail";
    if (infos.includes(t)) return "info";
    return "ok";
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 border border-border mb-7">
        <div className="p-5 border-b md:border-b-0 md:border-r border-border last:border-r-0"><div className="text-[28px] font-bold text-foreground tracking-tight leading-none mb-1">{all.length}</div><div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">Total Events</div></div>
        <div className="p-5 border-b md:border-b-0 md:border-r border-border last:border-r-0"><div className="text-[28px] font-bold text-foreground tracking-tight leading-none mb-1">{all.filter(a => a.type === "transfer_out" || a.type === "transfer_in").length}</div><div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">Transfers</div></div>
        <div className="p-5 border-b md:border-b-0 md:border-r border-border last:border-r-0"><div className="text-[28px] font-bold text-foreground tracking-tight leading-none mb-1">{shown.length}</div><div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">Filtered</div></div>
      </div>

      <div className="relative mb-5 flex-1">
        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"><Ic.Search /></span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions…" className="w-full bg-transparent border-0 border-b border-border py-2.5 pl-6 italic text-[16px] text-foreground outline-none transition-colors focus:border-foreground placeholder:text-muted-foreground" />
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {TYPES.map(t => (
          <button key={t} className={`p-[6px_14px] border border-border font-mono text-[11px] tracking-[0.1em] uppercase cursor-pointer transition-colors ${filter === t ? "bg-foreground text-background border-foreground" : "bg-transparent text-muted-foreground hover:border-foreground hover:text-foreground"}`} onClick={() => setFilter(t)}>
            {t === "all" ? "All" : typeLabel(t)}
          </button>
        ))}
      </div>

      {shown.length === 0
        ? <p className="font-serif text-[16px] italic text-muted-foreground py-[32px] text-center">
          No matching transactions.
        </p>
        : <div className="border border-border max-h-[450px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th>Event</th>
                <th>Description</th>
                <th>Type</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a, i) => (
                <tr key={i}>
                  <td className="font-serif text-[15px] font-medium">{a.title}</td>
                  <td className="font-serif text-[14px] text-muted-foreground max-w-[240px]">
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap block">
                      {a.description || "—"}
                    </span>
                  </td>
                  <td><span className={`inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[11px] tracking-widest uppercase border ${typeBadge(a.type)}`}>{typeLabel(a.type)}</span></td>
                  <td className="mono whitespace-nowrap text-[11px]">
                    {new Date(a.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  TOOL IV — SIGN DOCUMENT                                       */
/* ══════════════════════════════════════════════════════════════ */
function SignDocument({ wallet, signer }: { wallet: any; signer: any }) {
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState("");
  const [sig, setSig] = useState("");
  const [verifyAddr, setVerifyAddr] = useState("");
  const [verified, setVerified] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "hashed" | "signed">("idle");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hashFile = async (f: File) => {
    setFile(f); setHash(""); setSig(""); setVerified(null); setPhase("idle");
    const buf = await f.arrayBuffer();
    const raw = await getSubtleCrypto().digest("SHA-256", buf);
    const hex = "0x" + Array.from(new Uint8Array(raw)).map(b => b.toString(16).padStart(2, "0")).join("");
    setHash(hex); setPhase("hashed");
    toast.success("File hashed — ready to sign");
  };

  const sign = async () => {
    if (!hash || !signer) return;
    setBusy(true);
    try {
      const signature = await (signer as ethers.Wallet).signMessage(hash);
      setSig(signature); setPhase("signed");
      toast.success("Document signed");
    } catch (e: any) { toast.error(e.message || "Signing failed"); }
    finally { setBusy(false); }
  };

  const verify = () => {
    if (!hash || !sig) return;
    try {
      const recovered = ethers.verifyMessage(hash, sig);
      const matches = recovered.toLowerCase() === verifyAddr.trim().toLowerCase();
      setVerified(matches);
    } catch { setVerified(false); }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) hashFile(f);
  };

  return (
    <div>
      {/* Step 1: upload */}
      <div className="mb-9">
        <div className="flex items-center gap-3 font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-4 after:content-[''] after:flex-1 after:h-px after:bg-border">Step 1 — Upload Document</div>
        <div className={`border border-dashed border-border p-[36px_24px] text-center cursor-pointer transition-colors bg-transparent ${dragOver ? "border-foreground bg-muted/5" : "hover:border-foreground hover:bg-muted/5"}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}>
          <div className="text-[28px] mb-[10px]"><Ic.File /></div>
          <p className="text-[17px] italic text-muted-foreground mb-1.5">{file ? file.name : "Drop a file here, or click to browse"}</p>
          <p className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">{file ? `${(file.size / 1024).toFixed(1)} KB · ${file.type || "unknown type"}` : "PDF, DOC, TXT, any format"}</p>
        </div>
        <input ref={fileRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && hashFile(e.target.files[0])} />
      </div>

      {/* Step 2: hash result */}
      {hash && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-9">
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-4 after:content-[''] after:flex-1 after:h-px after:bg-border">Step 2 — SHA-256 Hash</div>
          <div className="enterprise-card p-4 mt-4">
            <div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2.5">File fingerprint (SHA-256)</div>
            <div className="flex items-start gap-2.5">
              <div className="font-mono text-[12px] text-foreground break-all leading-relaxed flex-1">{hash}</div>
              <button className="inline-flex items-center gap-1.5 bg-transparent border border-border px-2.5 py-1 rounded-lg font-mono text-[11px] tracking-widest uppercase text-muted-foreground cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:border-primary hover:text-foreground" onClick={() => { navigator.clipboard.writeText(hash); toast.success("Copied") }}><Ic.Copy /></button>
            </div>
          </div>

          {!wallet && <p className="font-serif text-[14px] italic text-red-500 mt-[12px]">Connect wallet to sign</p>}
          {wallet && phase === "hashed" && (
            <div className="flex items-center gap-2.5 flex-wrap mt-1.5 mt-[16px]">
              <button className="btn-enterprise-primary" onClick={sign} disabled={busy}>
                {busy ? <span className="animate-spin inline-block">◌</span> : <Ic.Send />}
                {busy ? "Signing…" : "Sign with Wallet"}
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Step 3: signature */}
      {sig && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-9">
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-4 after:content-[''] after:flex-1 after:h-px after:bg-border">Step 3 — Signature</div>
          <div className="enterprise-card p-4 mt-4">
            <div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2.5">EIP-191 Signature</div>
            <div className="flex items-start gap-2.5">
              <div className="font-mono text-[12px] text-foreground break-all leading-relaxed flex-1 break-all">{sig}</div>
              <button className="inline-flex items-center gap-1.5 bg-transparent border border-border px-2.5 py-1 rounded-lg font-mono text-[11px] tracking-widest uppercase text-muted-foreground cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:border-primary hover:text-foreground" onClick={() => { navigator.clipboard.writeText(sig); toast.success("Copied") }}><Ic.Copy /></button>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-4 after:content-[''] after:flex-1 after:h-px after:bg-border mt-[24px]">Step 4 — Verify Signer</div>
          <div className="mb-5">
            <label className="block font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2">Expected Signer Address</label>
            <input value={verifyAddr} onChange={e => setVerifyAddr(e.target.value)} placeholder="0x…" className="w-full bg-transparent border-0 border-b border-border py-2.5 font-mono text-[13px] text-foreground outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground" />
          </div>
          <button className="btn-enterprise-primary" onClick={verify} disabled={!verifyAddr.trim()}>
            <Ic.Check /> Verify Signature
          </button>
          {verified !== null && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-[14px]">
              <span className={`inline-flex items-center gap-[5px] px-[9px] py-[3px] font-mono text-[11px] tracking-[0.12em] uppercase border ${verified ? "text-green-500 border-green-500/30 bg-green-500/10" : "text-red-500 border-red-500/30 bg-red-500/10"}`}>
                {verified ? "✓ Signature matches — document is authentic" : "✗ Signature mismatch"}
              </span>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  TOOL V — HASH VERIFIER                                        */
/* ══════════════════════════════════════════════════════════════ */
function HashVerifier() {
  const [file, setFile] = useState<File | null>(null);
  const [computed, setComputed] = useState("");
  const [expected, setExpected] = useState("");
  const [result, setResult] = useState<"match" | "mismatch" | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hashFile = async (f: File) => {
    setFile(f); setComputed(""); setResult(null); setLoading(true);
    try {
      const buf = await f.arrayBuffer();
      const raw = await getSubtleCrypto().digest("SHA-256", buf);
      const hex = Array.from(new Uint8Array(raw)).map(b => b.toString(16).padStart(2, "0")).join("");
      setComputed(hex);
    } catch { toast.error("Hash computation failed"); }
    finally { setLoading(false); }
  };

  const compare = () => {
    if (!computed || !expected.trim()) return;
    const clean = expected.trim().replace(/^0x/, "").toLowerCase();
    setResult(clean === computed ? "match" : "mismatch");
  };

  return (
    <div>
      <div className="mb-9">
        <div className="flex items-center gap-3 font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-4 after:content-[''] after:flex-1 after:h-px after:bg-border">Upload File to Hash</div>
        <div className={`border border-dashed border-border p-[36px_24px] text-center cursor-pointer transition-colors bg-transparent ${dragOver ? "border-foreground bg-muted/5" : "hover:border-foreground hover:bg-muted/5"}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) hashFile(f); }}
          onClick={() => fileRef.current?.click()}>
          <div className="text-[28px] mb-[10px]"><Ic.File /></div>
          <p className="text-[17px] italic text-muted-foreground mb-1.5">{file ? file.name : "Drop file here or click to browse"}</p>
          <p className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">{file ? `${(file.size / 1024).toFixed(1)} KB` : "Any file type accepted"}</p>
        </div>
        <input ref={fileRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && hashFile(e.target.files[0])} />
      </div>

      {loading && <p className="font-mono text-[12px] text-muted-foreground"><span className="animate-spin inline-block">◌</span> Computing…</p>}

      {computed && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="enterprise-card p-4 mt-4 mb-[16px]">
            <div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2.5">Computed SHA-256</div>
            <div className="flex items-start gap-2.5">
              <div className="font-mono text-[12px] text-foreground break-all leading-relaxed flex-1">{computed}</div>
              <button className="inline-flex items-center gap-1.5 bg-transparent border border-border px-2.5 py-1 rounded-lg font-mono text-[11px] tracking-widest uppercase text-muted-foreground cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:border-primary hover:text-foreground" onClick={() => { navigator.clipboard.writeText(computed); toast.success("Copied") }}><Ic.Copy /></button>
            </div>
          </div>

          <div className="mb-9">
            <div className="flex items-center gap-3 font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-4 after:content-[''] after:flex-1 after:h-px after:bg-border">Compare Against Known Hash</div>
            <div className="mb-5">
              <label className="block font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2">Expected Hash (hex, with or without 0x)</label>
              <input value={expected} onChange={e => setExpected(e.target.value)}
                placeholder="sha256 hash to compare…" className="w-full bg-transparent border-0 border-b border-border py-2.5 font-mono text-[13px] text-foreground outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground" />
            </div>
            <button className="btn-enterprise-primary" onClick={compare} disabled={!expected.trim()}>
              Compare Hashes
            </button>
            {result && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-[14px]">
                <span className={`inline-flex items-center gap-[5px] px-[9px] py-[3px] font-mono text-[11px] tracking-[0.12em] uppercase border ${result === "match" ? "text-green-500 border-green-500/30 bg-green-500/10" : "text-red-500 border-red-500/30 bg-red-500/10"}`}>
                  {result === "match" ? "✓ Hashes match — file is unmodified" : "✗ Hash mismatch — file may have been altered"}
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  TOOL VI — MULTI-SIGNER                                        */
/* ══════════════════════════════════════════════════════════════ */
function MultiSigner({ wallet, signer }: { wallet: any; signer: any }) {
  const [message, setMessage] = useState("");
  const [threshold, setThreshold] = useState(2);
  const [signers, setSigners] = useState([
    { label: "Signer A (You)", addr: wallet?.address || "", signed: false, sig: "", isYou: true },
    { label: "Signer B", addr: "", signed: false, sig: "", isYou: false },
    { label: "Signer C", addr: "", signed: false, sig: "", isYou: false },
  ]);
  const [busy, setBusy] = useState(false);

  const signAs = async (idx: number) => {
    if (!message.trim() || !signer) return;
    setBusy(true);
    try {
      const sig = await (signer as ethers.Wallet).signMessage(`[Multisig Proposal]\n\n${message}`);
      setSigners(prev => prev.map((s, i) => i === idx ? { ...s, signed: true, sig } : s));
      toast.success(`${signers[idx].label} signed`);
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setBusy(false); }
  };

  const signedCount = signers.filter(s => s.signed).length;
  const approved = signedCount >= threshold;
  const msgHash = message ? ethers.keccak256(ethers.toUtf8Bytes(`[Multisig Proposal]\n\n${message}`)) : "";

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 border border-border mb-7">
        <div className="p-5 border-b md:border-b-0 md:border-r border-border last:border-r-0"><div className="text-[28px] font-bold text-foreground tracking-tight leading-none mb-1">{signedCount}/{threshold}</div><div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">Signatures</div></div>
        <div className="p-5 border-b md:border-b-0 md:border-r border-border last:border-r-0"><div className="text-[28px] font-bold text-foreground tracking-tight leading-none mb-1">{threshold}</div><div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">Required</div></div>
        <div className="p-5 border-b md:border-b-0 md:border-r border-border last:border-r-0"><div className="text-[28px] font-bold text-foreground tracking-tight leading-none mb-1">{approved ? "Yes" : "No"}</div><div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">Approved</div></div>
      </div>

      <div className="mb-9">
        <div className="flex items-center gap-3 font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-4 after:content-[''] after:flex-1 after:h-px after:bg-border">Proposal Message</div>
        <div className="mb-5">
          <label className="block font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2">Message / Proposal</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Describe the transaction or proposal requiring multi-party approval…"
            className="w-full bg-transparent border border-border p-3.5 font-mono text-[13px] text-foreground outline-none resize-y min-h-[80px] focus:border-foreground transition-colors leading-relaxed placeholder:text-muted-foreground" rows={3} />
        </div>
        {msgHash && (
          <div className="enterprise-card p-4 mt-4">
            <div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2.5">Proposal Hash (Keccak-256)</div>
            <div className="font-mono text-[12px] text-foreground break-all leading-relaxed">{msgHash}</div>
          </div>
        )}
      </div>

      <div className="mb-9">
        <div className="flex items-center gap-3 font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-4 after:content-[''] after:flex-1 after:h-px after:bg-border">
          Signers — threshold: &nbsp;
          {[2, 3].map(n => (
            <button key={n} className={`px-[10px] py-[3px] text-[11px] border border-border font-mono tracking-[0.1em] uppercase cursor-pointer transition-colors ${threshold === n ? "bg-foreground text-background border-foreground" : "bg-transparent text-muted-foreground hover:border-foreground hover:text-foreground"} px-[10px] py-[3px] text-[11px]`} onClick={() => setThreshold(n)}>{n}-of-3</button>
          ))}
        </div>

        {signers.map((s, i) => (
          <div key={i} className={`flex items-center gap-[14px] p-[14px_16px] border mb-[6px] transition-all ${s.signed ? "border-green-500/35 bg-green-500/5" : "border-border bg-card"}`}>
            <div className={`w-[10px] h-[10px] border-[1.5px] shrink-0 transition-all ${s.signed ? "bg-green-500 border-green-500" : "border-border"}`} />
            <div className="flex-1 min-w-0">
              <p className="font-serif text-[16px] text-foreground mb-[3px]">{s.label}</p>
              {s.isYou
                ? <p className="font-mono text-[11px] text-muted-foreground overflow-hidden text-ellipsis">{s.addr || "No wallet connected"}</p>
                : <input value={s.addr} onChange={e => setSigners(prev => prev.map((x, j) => j === i ? { ...x, addr: e.target.value } : x))}
                  placeholder="0x… (simulated signer)" className="w-full bg-transparent border-0 border-b border-border py-2.5 font-mono text-[13px] text-foreground outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground text-[12px] py-[4px]" />
              }
            </div>
            {!s.signed
              ? <button className="inline-flex items-center justify-center gap-2 h-[38px] px-[18px] bg-muted/10 text-muted-foreground border border-border rounded-xl font-mono text-[11px] tracking-widest uppercase font-semibold transition-colors hover:border-primary hover:text-foreground hover:bg-muted/20 disabled:opacity-35 disabled:cursor-not-allowed shrink-0" disabled={!message.trim() || busy || (s.isYou && !wallet)}
                onClick={() => signAs(i)}>
                {busy ? "…" : "Sign →"}
              </button>
              : <span className="inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[11px] tracking-widest uppercase border ok"><Ic.Check /> Signed</span>
            }
          </div>
        ))}
      </div>

      {approved && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="border border-green-500/30 bg-green-500/5 p-[20px_22px] mt-[8px]">
          <p className="font-serif text-[18px] text-green-500 mb-[4px]">Proposal approved.</p>
          <p className="font-serif text-[14px] italic text-muted-foreground">
            {signedCount} of {signers.length} signers have confirmed. Threshold of {threshold} met — safe to execute.
          </p>
        </motion.div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  TOOL VII — ANALYTICS                                          */
/* ══════════════════════════════════════════════════════════════ */
function Analytics({ walletAddr, balance }: { walletAddr: string; balance: string }) {
  const { getActivities } = useActivityStore();
  const activities = useMemo(() => getActivities(walletAddr), [walletAddr, getActivities]);

  /* Activity by type */
  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    activities.forEach(a => { m[a.type] = (m[a.type] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [activities]);

  /* Activity over last 30 days (day buckets) */
  const timeData = useMemo(() => {
    const now = Date.now();
    const buckets = Array.from({ length: 14 }, (_, i) => {
      const dayStart = now - (13 - i) * 86400000;
      const dayEnd = dayStart + 86400000;
      return {
        label: new Date(dayStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        count: activities.filter(a => a.timestamp >= dayStart && a.timestamp < dayEnd).length,
      };
    });
    return buckets;
  }, [activities]);

  const maxCount = Math.max(...timeData.map(d => d.count), 1);
  const totalBal = parseFloat(balance || "0");
  const typeColorMap: Record<string, string> = {
    transfer_out: "var(--t-dn)", transfer_in: "var(--t-up)", buy: "#a07c20",
    sell: "#5a5a8a", message_sent: "var(--t-muted)", message_received: "var(--t-muted)",
    upload: "var(--t-fg)", list: "#a07c20", delist: "var(--t-muted)", burn: "var(--t-dn)",
    escrow_confirm: "var(--t-up)", escrow_cancel: "var(--t-dn)", escrow_start: "#a07c20"
  };

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 border border-border mb-7">
        <div className="p-5 border-b md:border-b-0 md:border-r border-border last:border-r-0"><div className="text-[28px] font-bold text-foreground tracking-tight leading-none mb-1">{activities.length}</div><div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">Total Events</div></div>
        <div className="p-5 border-b md:border-b-0 md:border-r border-border last:border-r-0"><div className="text-[28px] font-bold text-foreground tracking-tight leading-none mb-1">{parseFloat(balance || "0").toFixed(3)}</div><div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">{NETWORK_CONFIG.tokenSymbol} Balance</div></div>
        <div className="p-5 border-b md:border-b-0 md:border-r border-border last:border-r-0"><div className="text-[28px] font-bold text-foreground tracking-tight leading-none mb-1">{typeCounts.length}</div><div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">Event Types</div></div>
      </div>

      {/* Activity timeline bar chart */}
      <div className="border border-border p-5 bg-card mb-4">
        <div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-3.5">Daily Activity — Last 14 Days</div>
        {activities.length === 0
          ? <p className="font-serif text-[14px] italic text-muted-foreground text-center py-[28px]">No activity data yet.</p>
          : <div className="flex items-end gap-[6px] h-[100px]">
            {timeData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-[4px]">
                <motion.div
                  initial={{ height: 0 }} animate={{ height: d.count === 0 ? 2 : `${(d.count / maxCount) * 80}px` }}
                  transition={{ delay: i * 0.03, duration: 0.5, ease: EASE }}
                  className={`w-full min-h-[2px] ${d.count > 0 ? "bg-foreground" : "bg-muted/10"}`} />
                <span className="font-mono text-[9px] text-muted-foreground -rotate-45 origin-top-left whitespace-nowrap w-[20px] overflow-hidden">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        }
      </div>

      {/* Event type distribution */}
      {typeCounts.length > 0 && (
        <div className="border border-border p-5 bg-card mb-4">
          <div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-3.5">Event Distribution</div>
          {typeCounts.map(([type, count]) => {
            const pct = Math.round((count / activities.length) * 100);
            return (
              <div key={type} className="mb-[12px]">
                <div className="flex justify-between mb-[5px]">
                  <span className="font-serif text-[15px] text-foreground">
                    {type.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">{count} · {pct}%</span>
                </div>
                <div className="h-[4px] bg-muted/10 relative">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: EASE }}
                    className="absolute inset-0" style={{ background: typeColorMap[type] || "var(--foreground)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Balance context */}
      <div className="enterprise-card p-4 mt-4">
        <div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2.5">Current Position</div>
        <div className="flex justify-between items-baseline flex-wrap gap-[12px]">
          <span className="font-serif text-[36px] font-bold text-foreground tracking-[-0.025em]">
            {totalBal.toFixed(4)} <em className="text-[18px] font-normal text-muted-foreground">{NETWORK_CONFIG.tokenSymbol}</em>
          </span>
          <span className={`inline-flex items-center gap-[5px] px-[9px] py-[3px] font-mono text-[11px] tracking-[0.12em] uppercase border ${totalBal > 0 ? "text-green-500 border-green-500/30 bg-green-500/10" : "text-muted-foreground border-border bg-muted/10"}`}>
            {totalBal > 0 ? "Active" : "Empty"} · {NETWORK_CONFIG.name}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                     */
/* ══════════════════════════════════════════════════════════════ */
export default function ToolsPage() {
  const router = useRouter();
  const { contract, wallet, signer, balance } = useStore();
  const [active, setActive] = useState<ToolId>("contacts");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!contract || !wallet) { router.push("/"); return; }
  }, [contract, wallet, router]);

  if (!mounted) return null;

  const tool = TOOLS.find(t => t.id === active)!;

  const renderContent = () => {
    switch (active) {
      case "contacts": return <ContactManager walletAddr={wallet?.address || ""} />;
      case "explorer": return <AddressExplorer />;
      case "history": return <TxHistory walletAddr={wallet?.address || ""} />;
      case "sign-doc": return <SignDocument wallet={wallet} signer={signer} />;
      case "hash": return <HashVerifier />;
      case "multisig": return <MultiSigner wallet={wallet} signer={signer} />;
      case "analytics": return <Analytics walletAddr={wallet?.address || ""} balance={balance || "0"} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row bg-background pt-[56px] md:pt-[92px] min-h-screen relative w-full">
      

      {/* ══ LEFT RAIL ══════════════════════════════════════ */}
      <aside className="w-full md:w-[240px] shrink-0 bg-muted/20 border-b md:border-b-0 md:border-r border-border flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto sticky top-[92px] md:h-[calc(100vh-92px)]">
        <div className="hidden md:block p-6 shrink-0">
          <div className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground mb-1">CipherVault</div>
          <div className="text-[17px] font-bold italic text-foreground tracking-tight">Tools &amp; Utils</div>
        </div>

        <div className="flex md:flex-col flex-row p-0 md:py-2 md:px-0 flex-none md:flex-1 min-w-full md:min-w-0 w-max md:w-auto">
          {TOOLS.map(t => (
            <button key={t.id}
              className={`flex flex-col md:flex-row items-center gap-[3px] md:gap-[14px] w-full p-[12px_18px] md:p-[13px_22px] bg-transparent border-b-[2px] md:border-b-0 md:border-l-[3px] border-transparent text-left transition-colors relative hover:bg-muted/5 shrink-0 md:shrink ${active === t.id ? "border-primary bg-muted/10 md:border-l-primary" : ""}`}
              onClick={() => setActive(t.id)}>
              <span className="hidden md:block font-serif text-[13px] italic text-muted-foreground shrink-0 w-5 transition-colors">{t.num}</span>
              <div>
                <div className="text-[12px] md:text-[14px] text-muted-foreground transition-colors whitespace-nowrap leading-none">{t.label}</div>
                <div className="hidden md:block font-mono text-[10px] text-muted-foreground leading-relaxed tracking-wider mt-0.5">{t.hint}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer (desktop) */}
        <div className="p-[20px_22px] border-t border-white/5 shrink-0 hidden md:block" /* reuse hide-on-mobile */>
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
            {wallet?.address.slice(0, 6)}…{wallet?.address.slice(-4)}
          </p>
          <p className="font-mono text-[10px] text-muted-foreground mt-[3px]">
            {parseFloat(balance || "0").toFixed(4)} {NETWORK_CONFIG.tokenSymbol}
          </p>
        </div>
      </aside>

      {/* ══ WORKSPACE ══════════════════════════════════════ */}
      <main className="flex-1 min-w-0 overflow-y-visible md:overflow-y-auto flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div key={active}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3, ease: EASE }}>

            {/* Workspace header */}
            <div className="p-6 md:px-11 md:py-9 border-b border-border shrink-0">
              <p className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2 italic">{tool.num} · {tool.hint}</p>
              <h1 className="text-2xl md:text-[42px] font-bold tracking-tight leading-none text-foreground">{tool.label.split(" ").map((w, i) => i === 0 ? w : <em key={i}> {w}</em>)}</h1>
            </div>

            {/* Workspace body */}
            <div className="flex-1 p-5 md:px-11 md:py-9">
              {renderContent()}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}