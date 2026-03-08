"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useActivityStore } from "@/lib/activity-store";
import { decryptFile, uploadPreview, unlockVaultKey } from "@/lib/crypto-engine";
import { Upload, FileText, Send, Trash2, Users, Check, Tag, XCircle, Eye, ShieldCheck, Clock, CheckCircle2, ImagePlus, FolderUp, Link2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Modal } from "@/components/ui-kits";
import FilePreviewModal from "@/components/FilePreviewModal";
import BatchUpload from "@/components/BatchUpload";
import ShareWithExpiry from "@/components/ShareWithExpiry";
import PriceHistory from "@/components/PriceHistory";
import { NETWORK_CONFIG } from "@/lib/constants";
import { useContactsStore } from "@/lib/contact-store";

const SERIF = "'EB Garamond', 'Cormorant Garamond', Georgia, serif";
const MONO = "'JetBrains Mono', 'Courier New', monospace";
const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function VaultPage() {
  const router = useRouter();
  const { contract, wallet, signer, ensureGas, syncAll, startAutoRefresh,
    vaultItems, salesItems, mintAndEncrypt, listAssetForSale, updateListing,
    cancelListing, transferAsset, sendCopyAsset, confirmTrade, cancelTrade, burnAsset,
  } = useStore();
  const { addActivity } = useActivityStore();
  const { contacts, getByAddress } = useContactsStore();

  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [modals, setModals] = useState({ sell: false, edit: false, transfer: false, burn: false, preview: false, batchUpload: false, share: false });
  const [activeId, setActiveId] = useState<number | null>(null);
  const [txLoading, setTxLoading] = useState<Record<number, string | null>>({});
  const [formData, setFormData] = useState({ price: "", desc: "", escrow: true, address: "", mode: "MOVE" as "MOVE" | "COPY", cid: "", name: "", previewUrl: "", previewFile: null as File | null, previewObj: null as File | null, previewType: "", previewName: "" });

  useEffect(() => {
    setIsClient(true);
    if (!contract || !wallet) { router.push("/"); return; }
    startAutoRefresh();
    if (signer) unlockVaultKey(signer).catch(() => toast.error("Failed to unlock vault key."));
  }, [contract, wallet, router, startAutoRefresh]);

  const openModal = (type: keyof typeof modals, id: number | null = null, extra: any = {}) => {
    setActiveId(id); setModals({ ...modals, [type]: true }); setFormData((prev) => ({ ...prev, ...extra }));
  };
  const closeModal = (type: keyof typeof modals) => { setModals({ ...modals, [type]: false }); setActiveId(null); };

  const handleUpload = async (e: any) => {
    const f: File = e.target.files[0];
    if (!f || !signer) return;
    setLoading(true);
    const t = toast.loading("Encrypting & uploading…");
    try {
      await ensureGas();
      const tokenId = await mintAndEncrypt(f);
      toast.dismiss(t); toast.success(`Asset #${tokenId} minted.`);
      addActivity({ type: "upload", title: "Asset uploaded", description: `"${f.name}" encrypted & minted to vault`, walletAddress: wallet!.address, tokenId });
    } catch (e: any) { toast.dismiss(t); toast.error(e.message || "Upload failed"); }
    setLoading(false); e.target.value = "";
  };

  const handleDecrypt = async (cid: string, mode: "PREVIEW" | "DOWNLOAD") => {
    if (!wallet || !signer) return;
    const t = toast.loading("Decrypting…");
    try {
      const file = await decryptFile(cid, signer);
      if (mode === "PREVIEW") {
        setFormData((p) => ({ ...p, previewObj: file, previewUrl: "", previewName: file.name }));
        setModals((p) => ({ ...p, preview: true }));
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a"); a.href = url; a.download = file.name; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      toast.dismiss(t);
    } catch (err: any) { toast.dismiss(t); toast.error(err.message || "Decryption failed"); }
  };

  const handleListForSale = async () => {
    if (!formData.price || !activeId) return;
    setLoading(true);
    try {
      await ensureGas();
      let previewCid = "";
      if (formData.previewFile) {
        const t = toast.loading("Uploading preview…");
        previewCid = await uploadPreview(formData.previewFile); toast.dismiss(t);
      }
      await listAssetForSale(activeId, formData.price, formData.desc, previewCid || null, true);
      toast.success("Asset listed.");
      addActivity({ type: "list", title: "Asset listed", description: `Asset #${activeId} listed at ${formData.price} ${NETWORK_CONFIG.tokenSymbol}`, walletAddress: wallet!.address, tokenId: activeId, amount: formData.price });
      closeModal("sell");
    } catch (e: any) { toast.error(e.message || "Listing failed"); }
    setLoading(false);
  };

  if (!isClient || !contract) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cv-bg)", color: "var(--cv-fg)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap');
        :root{--cv-bg:#FAFAF8;--cv-fg:#0A0A0A;--cv-muted:#6B6B6B;--cv-border:#D8D4CC;--cv-border-light:#EDEAE4;--cv-card:#FFFFFF;--cv-surface:#F4F2EE;--cv-ink-light:#3A3A3A;}
        .dark{--cv-bg:#0A0A08;--cv-fg:#F0EDE6;--cv-muted:#8A857C;--cv-border:#2A2820;--cv-border-light:#1E1C18;--cv-card:#111109;--cv-surface:#161410;--cv-ink-light:#C5BFB5;}
        .cv-asset-card{border:1px solid var(--cv-border-light);background:var(--cv-card);transition:border-color 0.35s,transform 0.35s;border-radius:0;}
        .cv-asset-card:hover{border-color:var(--cv-border);transform:translateY(-2px);}
        .cv-asset-card.escrow{border-color:var(--cv-border);background:var(--cv-surface);}
        .cv-action-btn{background:transparent;border:1px solid var(--cv-border-light);padding:10px 16px;font-family:${SERIF};font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--cv-muted);cursor:pointer;transition:all 0.25s;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:0;}
        .cv-action-btn:hover{border-color:var(--cv-fg);color:var(--cv-fg);}
        .cv-action-btn.danger:hover{border-color:#dc2626;color:#dc2626;}
        .cv-action-btn.primary{background:var(--cv-fg);color:var(--cv-bg);border-color:var(--cv-fg);}
        .cv-action-btn.primary:hover{opacity:0.85;}
        .cv-badge{font-family:${SERIF};font-size:8px;letter-spacing:0.2em;text-transform:uppercase;padding:4px 10px;border:1px solid var(--cv-border-light);color:var(--cv-muted);border-radius:0;}
      `}</style>

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "120px 48px 96px" }}>

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}
          style={{ paddingBottom: "40px", borderBottom: "1px solid var(--cv-border-light)", marginBottom: "48px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "24px" }}>
          <div>
            <p style={{ fontSize: "9px", letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--cv-muted)", fontFamily: SERIF, fontStyle: "italic", marginBottom: "16px" }}>
              Encrypted · {NETWORK_CONFIG.name}
            </p>
            <h1 style={{ fontFamily: SERIF, fontSize: "clamp(52px, 8vw, 80px)", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 0.9, margin: 0 }}>
              Vault<br /><em style={{ color: "var(--cv-muted)" }}>Repository.</em>
            </h1>
            <p style={{ fontFamily: SERIF, fontSize: "12px", color: "var(--cv-muted)", fontStyle: "italic", marginTop: "12px" }}>
              {vaultItems.length} asset{vaultItems.length !== 1 ? "s" : ""} secured
            </p>
          </div>

          <div style={{ display: "flex", gap: "2px" }}>
            <button onClick={() => setModals((p) => ({ ...p, batchUpload: true }))}
              style={{ background: "var(--cv-surface)", border: "1px solid var(--cv-border-light)", padding: "14px 24px", fontFamily: SERIF, fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--cv-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", transition: "all 0.25s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--cv-border)"; e.currentTarget.style.color = "var(--cv-fg)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--cv-border-light)"; e.currentTarget.style.color = "var(--cv-muted)"; }}>
              <FolderUp size={13} strokeWidth={1.5} /> Batch Upload
            </button>

            <label style={{ background: "var(--cv-fg)", border: "1px solid var(--cv-fg)", padding: "14px 28px", fontFamily: SERIF, fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--cv-bg)", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "10px", opacity: loading ? 0.6 : 1, transition: "opacity 0.25s" }}>
              <Upload size={13} strokeWidth={1.5} />
              {loading ? "Encrypting…" : "Upload Asset"}
              <input type="file" style={{ display: "none" }} onChange={handleUpload} disabled={loading} />
            </label>
          </div>
        </motion.div>

        {/* ── Incoming Offers ── */}
        <AnimatePresence>
          {salesItems.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              style={{ marginBottom: "40px", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div style={{ width: "24px", height: "1px", background: "var(--cv-fg)" }} />
                <p style={{ fontSize: "9px", letterSpacing: "0.26em", textTransform: "uppercase", color: "var(--cv-muted)", fontFamily: SERIF }}>
                  Pending Offers — Awaiting Confirmation
                </p>
                <span style={{ width: "6px", height: "6px", borderRadius: "0", background: "#f59e0b", display: "inline-block", animation: "pulse 2s infinite" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {salesItems.map((sale: any, i: number) => (
                  <div key={`sale-${i}`} style={{ border: "1px solid var(--cv-border-light)", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--cv-surface)" }}>
                    <div>
                      <p style={{ fontFamily: SERIF, fontSize: "16px", color: "var(--cv-fg)", marginBottom: "4px" }}>{sale.name}</p>
                      <p style={{ fontFamily: MONO, fontSize: "10px", color: "var(--cv-muted)" }}>
                        Buyer: {sale.buyer.slice(0, 6)}…{sale.buyer.slice(-4)} · <span style={{ color: "var(--cv-fg)" }}>{sale.price} {NETWORK_CONFIG.tokenSymbol}</span>
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "2px" }}>
                      <Button variant="primary" isLoading={txLoading[sale.tokenId] === 'confirm'} disabled={!!txLoading[sale.tokenId]} className="cv-action-btn primary"
                        onClick={async () => {
                          try {
                            setTxLoading(prev => ({ ...prev, [sale.tokenId]: 'confirm' }));
                            await confirmTrade(sale.tokenId); toast.success("Trade confirmed.");
                            addActivity({ type: "escrow_confirm", title: "Trade confirmed", description: `Confirmed sale of asset #${sale.tokenId} "${sale.name}" for ${sale.price} ${NETWORK_CONFIG.tokenSymbol}`, walletAddress: wallet!.address, tokenId: sale.tokenId, amount: sale.price, address: sale.buyer });
                          } catch (e: any) { toast.error(e.message); }
                          finally { setTxLoading(prev => ({ ...prev, [sale.tokenId]: null })); }
                        }}>
                        Confirm
                      </Button>
                      <Button variant="danger" isLoading={txLoading[sale.tokenId] === 'cancel'} disabled={!!txLoading[sale.tokenId]} className="cv-action-btn danger h-auto"
                        onClick={async () => {
                          try {
                            setTxLoading(prev => ({ ...prev, [sale.tokenId]: 'cancel' }));
                            await cancelTrade(sale.tokenId); toast.success("Trade cancelled, buyer refunded.");
                            addActivity({ type: "escrow_cancel", title: "Trade cancelled", description: `Trade for asset #${sale.tokenId} cancelled, buyer refunded`, walletAddress: wallet!.address, tokenId: sale.tokenId, address: sale.buyer });
                          } catch (e: any) { toast.error(e.message); }
                          finally { setTxLoading(prev => ({ ...prev, [sale.tokenId]: null })); }
                        }}>
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Asset Grid ── */}
        {vaultItems.length === 0 ? (
          <div style={{ border: "1px solid var(--cv-border-light)", padding: "96px 48px", textAlign: "center" }}>
            <p style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "var(--cv-fg)", marginBottom: "12px" }}>Vault is empty.</p>
            <p style={{ fontFamily: SERIF, fontSize: "13px", fontStyle: "italic", color: "var(--cv-muted)" }}>Upload a file to secure it on the blockchain.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "2px" }}>
            {vaultItems.map((file: any, i: number) => {
              const isSeller = wallet?.address.toLowerCase() === file.seller?.toLowerCase();
              const isBuyer = wallet?.address.toLowerCase() === file.buyer?.toLowerCase();
              const inEscrow = file.isEscrowActive;

              return (
                <motion.div key={file.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, ease }}
                  className={`cv-asset-card ${inEscrow ? "escrow" : ""}`}>
                  <div style={{ padding: "24px 24px 0" }}>
                    {/* Card header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {file.isListed && !inEscrow && <span className="cv-badge">On Sale</span>}
                        {inEscrow && <span className="cv-badge">{isSeller ? "Seller" : "Buyer"}</span>}
                        {file.isCopy && <span className="cv-badge">Copy</span>}
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: "9px", color: "var(--cv-border)", letterSpacing: "0.1em" }}>#{file.id}</span>
                    </div>

                    {/* File name */}
                    <p style={{ fontFamily: SERIF, fontSize: "20px", fontWeight: 400, letterSpacing: "-0.01em", color: "var(--cv-fg)", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {file.name}
                    </p>

                    {(file.isListed || inEscrow) && (
                      <p style={{ fontFamily: SERIF, fontSize: "13px", color: "var(--cv-muted)", fontStyle: "italic", marginBottom: "16px" }}>
                        {file.price} {NETWORK_CONFIG.tokenSymbol}
                        {file.isListed && <PriceHistory tokenId={file.id} currentPrice={file.price} compact />}
                      </p>
                    )}

                    {/* Escrow status */}
                    {inEscrow && (
                      <div style={{ border: "1px solid var(--cv-border-light)", padding: "14px 16px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: file.sellerConfirmed ? "#16a34a" : "var(--cv-muted)" }}>
                          {file.sellerConfirmed ? <CheckCircle2 size={13} strokeWidth={1.5} /> : <Clock size={13} strokeWidth={1.5} />}
                          <span style={{ fontFamily: SERIF, fontSize: "10px", letterSpacing: "0.1em" }}>Seller {file.sellerConfirmed ? "✓" : "Pending"}</span>
                        </div>
                        <div style={{ flex: 1, height: "1px", background: "var(--cv-border-light)", margin: "0 16px" }} />
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: file.buyerConfirmed ? "#16a34a" : "var(--cv-muted)" }}>
                          <span style={{ fontFamily: SERIF, fontSize: "10px", letterSpacing: "0.1em" }}>Buyer {file.buyerConfirmed ? "✓" : "Pending"}</span>
                          {file.buyerConfirmed ? <CheckCircle2 size={13} strokeWidth={1.5} /> : <Clock size={13} strokeWidth={1.5} />}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action bar */}
                  <div style={{ display: "flex", gap: "1px", padding: "1px", background: "var(--cv-border-light)", margin: "0 1px 1px" }}>
                    {inEscrow ? (
                      isSeller ? (
                        <button className="cv-action-btn danger" style={{ flex: 1 }}
                          onClick={async () => {
                            try { await cancelTrade(file.id); toast.success("Trade cancelled."); } catch (e: any) { toast.error(e.message); }
                          }}>
                          <XCircle size={11} strokeWidth={1.5} /> Cancel Trade
                        </button>
                      ) : (
                        <>
                          {file.previewURI && (
                            <button className="cv-action-btn" onClick={() => {
                              setFormData((p) => ({ ...p, previewUrl: `${NETWORK_CONFIG.ipfsGateway}/ipfs/${file.previewURI}`, previewObj: null, previewName: file.name + " (Preview)", previewType: "image/jpeg" }));
                              setModals((p) => ({ ...p, preview: true }));
                            }}>
                              <Eye size={11} strokeWidth={1.5} />
                            </button>
                          )}
                          <button className="cv-action-btn primary" disabled={file.buyerConfirmed} style={{ flex: 1 }}
                            onClick={async () => {
                              try {
                                await confirmTrade(file.id); toast.success("Payment confirmed.");
                                addActivity({ type: "escrow_confirm", title: "Payment confirmed", description: `Confirmed purchase of asset #${file.id} "${file.name}"`, walletAddress: wallet!.address, tokenId: file.id, amount: file.price });
                              } catch (e: any) { toast.error(e.message); }
                            }}>
                            {file.buyerConfirmed ? "Awaiting seller…" : <><Check size={11} strokeWidth={1.5} /> Confirm Payment</>}
                          </button>
                          <button className="cv-action-btn danger"
                            onClick={async () => {
                              try { await cancelTrade(file.id); toast.success("Trade cancelled."); } catch (e: any) { toast.error(e.message); }
                            }}>
                            <XCircle size={11} strokeWidth={1.5} />
                          </button>
                        </>
                      )
                    ) : file.isListed ? (
                      <>
                        <button className="cv-action-btn danger" style={{ flex: 1 }}
                          onClick={async () => {
                            try { await cancelListing(file.id); toast.success("Listing cancelled."); } catch (e: any) { toast.error(e.message); }
                          }}>
                          Cancel Listing
                        </button>
                        <button className="cv-action-btn" onClick={() => openModal("edit", file.id, { price: file.price, desc: file.description, escrow: true })}>
                          <Tag size={11} strokeWidth={1.5} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="cv-action-btn primary" style={{ flex: 1 }} onClick={() => handleDecrypt(file.cid, "PREVIEW")}>
                          Open File
                        </button>
                        {!file.isCopy && (
                          <>
                            <button className="cv-action-btn" title="Share" onClick={() => openModal("share", file.id, { name: file.name })}>
                              <Link2 size={11} strokeWidth={1.5} />
                            </button>
                            <button className="cv-action-btn" title="Transfer" onClick={() => openModal("transfer", file.id, { mode: "MOVE", cid: file.cid, name: file.name })}>
                              <Send size={11} strokeWidth={1.5} />
                            </button>
                            <button className="cv-action-btn" title="List for sale" onClick={() => openModal("sell", file.id)}>
                              <Tag size={11} strokeWidth={1.5} />
                            </button>
                          </>
                        )}
                        <button className="cv-action-btn danger" title="Destroy" onClick={() => openModal("burn", file.id, { cid: file.cid })}>
                          <Trash2 size={11} strokeWidth={1.5} />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ MODALS ══ */}
      <AnimatePresence>
        <FilePreviewModal isOpen={modals.preview} onClose={() => closeModal("preview")} file={formData.previewObj} url={formData.previewUrl || null} fileName={formData.previewName} fileType={formData.previewType} />
        {modals.batchUpload && (<Modal key="batchUpload" isOpen onClose={() => closeModal("batchUpload")} title="Batch Upload"><BatchUpload onClose={() => closeModal("batchUpload")} /></Modal>)}
        {modals.share && activeId && (<Modal key="share" isOpen onClose={() => closeModal("share")} title="Share Asset"><ShareWithExpiry tokenId={activeId} fileName={formData.name} onClose={() => closeModal("share")} /></Modal>)}

        {modals.sell && (
          <Modal key="sell" isOpen onClose={() => closeModal("sell")} title="List Asset for Sale">
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingTop: "8px" }}>
              <Input label={`Price (${NETWORK_CONFIG.tokenSymbol})`} type="number" min="0" step="0.001" value={formData.price} onChange={(e: any) => setFormData({ ...formData, price: e.target.value })} placeholder="0.100" />
              <div>
                <label style={{ display: "block", fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--cv-muted)", fontFamily: SERIF, marginBottom: "8px" }}>Description</label>
                <textarea value={formData.desc} onChange={(e) => setFormData({ ...formData, desc: e.target.value })} style={{ width: "100%", background: "var(--cv-surface)", border: "1px solid var(--cv-border-light)", padding: "14px 16px", fontFamily: SERIF, fontSize: "13px", color: "var(--cv-fg)", resize: "none", outline: "none", height: "80px" }} placeholder="Describe this asset…" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--cv-muted)", fontFamily: SERIF, marginBottom: "8px" }}>
                  Preview Image <em style={{ fontStyle: "italic", textTransform: "none", letterSpacing: 0 }}>(optional, unencrypted)</em>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", border: "1px solid var(--cv-border-light)", cursor: "pointer", background: "var(--cv-surface)" }}>
                  <ImagePlus size={14} strokeWidth={1.5} style={{ color: "var(--cv-muted)" }} />
                  <span style={{ fontFamily: SERIF, fontSize: "12px", fontStyle: "italic", color: "var(--cv-muted)" }}>{formData.previewFile ? formData.previewFile.name : "Select thumbnail image…"}</span>
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setFormData({ ...formData, previewFile: e.target.files?.[0] || null })} />
                </label>
              </div>
              <Button onClick={handleListForSale} isLoading={loading} disabled={!formData.price || loading} className="w-full h-12 rounded-none">Confirm Listing</Button>
            </div>
          </Modal>
        )}

        {modals.edit && (
          <Modal key="edit" isOpen onClose={() => closeModal("edit")} title="Update Listing">
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingTop: "8px" }}>
              <Input label={`New Price (${NETWORK_CONFIG.tokenSymbol})`} type="number" value={formData.price} onChange={(e: any) => setFormData({ ...formData, price: e.target.value })} />
              <Button onClick={async () => { try { await updateListing(activeId!, formData.price, formData.desc, true); toast.success("Listing updated."); closeModal("edit"); } catch (e: any) { toast.error(e.message); } }} className="w-full h-12 rounded-none">Update</Button>
            </div>
          </Modal>
        )}

        {modals.transfer && (
          <Modal key="transfer" isOpen onClose={() => { closeModal("transfer"); setShowContactPicker(false); setContactSearch(""); }} title="Transfer Asset">
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingTop: "8px" }}>
              <div style={{ display: "flex", gap: "1px", background: "var(--cv-border-light)", padding: "1px" }}>
                {(["MOVE", "COPY"] as const).map((m) => (
                  <button key={m} onClick={() => setFormData({ ...formData, mode: m })}
                    style={{ flex: 1, padding: "10px", fontFamily: SERIF, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", background: formData.mode === m ? "var(--cv-fg)" : "var(--cv-surface)", color: formData.mode === m ? "var(--cv-bg)" : "var(--cv-muted)", border: "none", cursor: "pointer", transition: "all 0.25s" }}>
                    {m === "MOVE" ? "Move NFT" : "Send Copy"}
                  </button>
                ))}
              </div>
              {formData.mode === "COPY" && (
                <p style={{ fontFamily: SERIF, fontSize: "11px", fontStyle: "italic", color: "var(--cv-muted)", padding: "12px 16px", border: "1px solid var(--cv-border-light)", background: "var(--cv-surface)" }}>
                  Copies share the same CID. The recipient will be able to decrypt this file.
                </p>
              )}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <label style={{ fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--cv-muted)", fontFamily: SERIF }}>Recipient Address</label>
                  {contacts.length > 0 && (
                    <button onClick={() => { setShowContactPicker((p) => !p); setContactSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "9px", letterSpacing: "0.14em", color: "var(--cv-muted)", fontFamily: SERIF, fontStyle: "italic" }}>
                      {showContactPicker ? "Close" : "Select contact"}
                    </button>
                  )}
                </div>
                <AnimatePresence>
                  {showContactPicker && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden", marginBottom: "8px" }}>
                      <div style={{ border: "1px solid var(--cv-border-light)", background: "var(--cv-surface)" }}>
                        <input value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder="Search contacts…"
                          style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid var(--cv-border-light)", padding: "10px 14px", fontFamily: SERIF, fontSize: "12px", color: "var(--cv-fg)", outline: "none" }} />
                        <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                          {contacts.filter((c) => { const q = contactSearch.toLowerCase(); return !q || c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q); }).map((contact) => (
                            <button key={contact.id} onClick={() => { setFormData((p) => ({ ...p, address: contact.address })); setShowContactPicker(false); setContactSearch(""); }}
                              style={{ width: "100%", background: formData.address.toLowerCase() === contact.address.toLowerCase() ? "var(--cv-border-light)" : "transparent", border: "none", borderBottom: "1px solid var(--cv-border-light)", padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", textAlign: "left" }}>
                              <span style={{ fontSize: "16px" }}>{contact.emoji}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontFamily: SERIF, fontSize: "13px", color: "var(--cv-fg)", marginBottom: "2px" }}>{contact.name}</p>
                                <p style={{ fontFamily: MONO, fontSize: "9px", color: "var(--cv-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>{contact.address.slice(0, 12)}…{contact.address.slice(-6)}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="0x…"
                  style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid var(--cv-border)", padding: "12px 0", fontFamily: MONO, fontSize: "13px", color: "var(--cv-fg)", outline: "none" }} />
                {formData.address && getByAddress(formData.address) && (
                  <p style={{ fontFamily: SERIF, fontSize: "10px", fontStyle: "italic", color: "var(--cv-muted)", marginTop: "6px" }}>
                    {getByAddress(formData.address)?.emoji} {getByAddress(formData.address)?.name}
                  </p>
                )}
              </div>
              <Button
                onClick={async () => {
                  if (!formData.address) return toast.error("Enter recipient address");
                  setLoading(true);
                  try {
                    const success = formData.mode === "MOVE" ? await transferAsset(activeId!, formData.address) : await sendCopyAsset(activeId!, formData.address, formData.name, formData.cid);
                    if (success) {
                      addActivity({ type: "transfer_out", title: formData.mode === "MOVE" ? "Asset transferred" : "Copy sent", description: `Asset #${activeId} sent to ${getByAddress(formData.address)?.name ?? formData.address.slice(0, 8) + "…"}`, walletAddress: wallet!.address, tokenId: activeId!, address: formData.address });
                      toast.success("Transfer complete.");
                      closeModal("transfer");
                      setShowContactPicker(false);
                    }
                  } catch (e: any) {
                    toast.error(e.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                isLoading={loading}
                disabled={!formData.address || loading}
                className="w-full h-12 rounded-none">
                Confirm Transfer
              </Button>
            </div>
          </Modal>
        )}

        {modals.burn && (
          <Modal key="burn" isOpen onClose={() => closeModal("burn")} title="Destroy Asset">
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ width: "60px", height: "60px", border: "1px solid var(--cv-border-light)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <Trash2 size={22} strokeWidth={1.5} style={{ color: "var(--cv-muted)" }} />
              </div>
              <p style={{ fontFamily: SERIF, fontSize: "13px", fontStyle: "italic", color: "var(--cv-muted)", lineHeight: 1.7, marginBottom: "24px", padding: "0 20px" }}>
                This action is <strong style={{ fontStyle: "normal", color: "var(--cv-fg)" }}>permanent</strong>. The asset will be removed from the blockchain and cannot be recovered.
              </p>
              <div style={{ display: "flex", gap: "2px" }}>
                <Button onClick={() => closeModal("burn")} variant="secondary" className="flex-1 h-12 rounded-none">Cancel</Button>
                <Button onClick={async () => {
                  setLoading(true);
                  try {
                    await burnAsset(activeId!, formData.cid);
                    toast.success("Asset destroyed.");
                    addActivity({
                      type: "burn",
                      title: "Asset destroyed",
                      description: `Asset #${activeId} permanently removed`,
                      walletAddress: wallet!.address,
                      tokenId: activeId!,
                    });
                    closeModal("burn");
                  } catch (e: any) {
                    toast.error(e.message);
                  } finally {
                    setLoading(false);
                  }
                }} variant="danger" isLoading={loading} disabled={loading} className="flex-1 h-12 rounded-none">Destroy</Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}