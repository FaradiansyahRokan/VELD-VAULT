"use client";

import { useState } from "react";
import { useContactsStore, type Contact } from "../lib/contact-store";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import { Users, Plus, Search, Pencil, Trash2, X, Check, Copy, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const EMOJIS = ["🦊", "🐺", "🦁", "🐯", "🦅", "🦋", "🐉", "🌙", "⚡", "🔮", "🎯", "🛡️", "🌊", "🔥", "❄️", "🎭"];

interface ContactFormData {
  name: string;
  address: string;
  note: string;
  emoji: string;
}

const EMPTY_FORM: ContactFormData = { name: "", address: "", note: "", emoji: "🦊" };

export default function ContactsBook() {
  const router = useRouter();
  const { contacts, addContact, updateContact, removeContact } = useContactsStore();

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactFormData>(EMPTY_FORM);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = search
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.address.toLowerCase().includes(search.toLowerCase()) ||
          c.note?.toLowerCase().includes(search.toLowerCase())
      )
    : contacts;

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (contact: Contact) => {
    setEditId(contact.id);
    setForm({ name: contact.name, address: contact.address, note: contact.note || "", emoji: contact.emoji || "🦊" });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Nama wajib diisi"); return; }
    if (!ethers.isAddress(form.address.trim())) { toast.error("Address wallet tidak valid"); return; }

    if (editId) {
      updateContact(editId, { name: form.name.trim(), address: form.address.trim(), note: form.note.trim(), emoji: form.emoji });
      toast.success("Kontak diperbarui!");
    } else {
      addContact({ name: form.name.trim(), address: form.address.trim(), note: form.note.trim(), emoji: form.emoji });
      toast.success("Kontak ditambahkan!");
    }
    setShowForm(false);
    setForm(EMPTY_FORM);
    setEditId(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Hapus kontak "${name}"?`)) return;
    removeContact(id);
    toast.success("Kontak dihapus");
  };

  const copyAddress = (address: string, id: string) => {
    navigator.clipboard.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Address disalin!");
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold text-foreground flex items-center gap-2 text-lg">
          <Users size={18} className="text-muted-foreground" />
          Kontak
          <span className="text-sm font-normal text-muted-foreground">({contacts.length})</span>
        </h2>
        <button
          onClick={openAdd}
          className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
        >
          <Plus size={13} /> Tambah
        </button>
      </div>

      {/* Search */}
      {contacts.length > 0 && (
        <div className="relative mb-4">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau alamat..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted/20 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/30 transition-all"
          />
        </div>
      )}

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="p-4 rounded-2xl bg-card border border-primary/20 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-foreground text-sm">{editId ? "Edit Kontak" : "Kontak Baru"}</p>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
              </div>

              {/* Emoji picker */}
              <div className="mb-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Avatar</p>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                        form.emoji === e ? "bg-primary/20 border-2 border-primary scale-110" : "bg-muted/30 hover:bg-muted/60 border-2 border-transparent"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Nama *</p>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Nama kontak"
                    autoFocus
                    className="w-full h-9 px-3 rounded-xl bg-muted/30 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Address Wallet *</p>
                  <input
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="0x..."
                    className="w-full h-9 px-3 rounded-xl bg-muted/30 border border-border/40 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Catatan</p>
                  <input
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Opsional"
                    className="w-full h-9 px-3 rounded-xl bg-muted/30 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSave}
                  className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  {editId ? "Simpan" : "Tambah"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 h-9 rounded-xl bg-muted/30 text-muted-foreground text-sm font-medium hover:bg-muted/60 transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {contacts.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mb-4 text-3xl">👤</div>
          <p className="font-bold text-foreground mb-1">Belum ada kontak</p>
          <p className="text-sm text-muted-foreground mb-4">Simpan alamat wallet yang sering dipakai</p>
          <button onClick={openAdd} className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
            Tambah Kontak Pertama
          </button>
        </div>
      )}

      {/* Contact List */}
      <div className="space-y-2">
        {filtered.map((contact) => (
          <motion.div
            key={contact.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="group flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/40 hover:border-border/70 transition-all"
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center text-xl shrink-0">
              {contact.emoji}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">{contact.name}</p>
              <p className="text-[11px] font-mono text-muted-foreground truncate">
                {contact.address.slice(0, 10)}...{contact.address.slice(-8)}
              </p>
              {contact.note && (
                <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{contact.note}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => router.push(`/messages?to=${contact.address}`)}
                className="w-7 h-7 rounded-lg bg-muted/30 hover:bg-emerald-500/10 hover:text-emerald-500 flex items-center justify-center text-muted-foreground transition-colors"
                title="Kirim pesan"
              >
                <MessageSquare size={12} />
              </button>
              <button
                onClick={() => copyAddress(contact.address, contact.id)}
                className="w-7 h-7 rounded-lg bg-muted/30 hover:bg-blue-500/10 hover:text-blue-400 flex items-center justify-center text-muted-foreground transition-colors"
                title="Salin address"
              >
                {copiedId === contact.id
                  ? <Check size={12} className="text-emerald-500" />
                  : <Copy size={12} />}
              </button>
              <button
                onClick={() => openEdit(contact)}
                className="w-7 h-7 rounded-lg bg-muted/30 hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title="Edit"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => handleDelete(contact.id, contact.name)}
                className="w-7 h-7 rounded-lg bg-muted/30 hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center text-muted-foreground transition-colors"
                title="Hapus"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </motion.div>
        ))}

        {search && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">Tidak ada kontak yang cocok</p>
        )}
      </div>
    </div>
  );
}