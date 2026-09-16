"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useActivityStore } from "@/lib/activity-store";
import { decryptFile, uploadPreview, unlockVaultKey } from "@/lib/crypto-engine";
import {
  Upload,
  FileText,
  Send,
  Trash2,
  Users,
  Check,
  Tag,
  XCircle,
  Eye,
  ShieldCheck,
  Clock,
  CheckCircle2,
  ImagePlus,
  FolderUp,
  Link2,
  File,
  Lock,
  Search,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Modal } from "@/components/ui-kits";
import FilePreviewModal from "@/components/FilePreviewModal";
import BatchUpload from "@/components/BatchUpload";
import ShareWithExpiry from "@/components/ShareWithExpiry";
import PriceHistory from "@/components/PriceHistory";
import { NETWORK_CONFIG } from "@/lib/constants";
import { useContactsStore } from "@/lib/contact-store";

const spring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 32,
  mass: 0.8,
};

export default function VaultPage() {
  const router = useRouter();
  const {
    contract,
    wallet,
    signer,
    ensureGas,
    syncAll,
    startAutoRefresh,
    vaultItems,
    salesItems,
    mintAndEncrypt,
    listAssetForSale,
    updateListing,
    cancelListing,
    transferAsset,
    sendCopyAsset,
    confirmTrade,
    cancelTrade,
    burnAsset,
  } = useStore();
  const { addActivity } = useActivityStore();
  const { contacts, getByAddress } = useContactsStore();

  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modals, setModals] = useState({
    sell: false,
    edit: false,
    transfer: false,
    burn: false,
    preview: false,
    batchUpload: false,
    share: false,
  });
  const [activeId, setActiveId] = useState<number | null>(null);
  const [txLoading, setTxLoading] = useState<Record<number, string | null>>({});
  const [formData, setFormData] = useState({
    price: "",
    desc: "",
    escrow: true,
    address: "",
    mode: "MOVE" as "MOVE" | "COPY",
    cid: "",
    name: "",
    previewUrl: "",
    previewFile: null as File | null,
    previewObj: null as File | null,
    previewType: "",
    previewName: "",
  });

  useEffect(() => {
    setIsClient(true);
    if (!contract || !wallet) {
      router.push("/login");
      return;
    }
    startAutoRefresh();
    if (signer) unlockVaultKey(signer).catch(() => toast.error("Failed to unlock vault key."));
  }, [contract, wallet, signer, router, startAutoRefresh]);

  const openModal = (type: keyof typeof modals, id: number | null = null, extra: any = {}) => {
    setActiveId(id);
    setModals({ ...modals, [type]: true });
    setFormData((prev) => ({ ...prev, ...extra }));
  };

  const closeModal = (type: keyof typeof modals) => {
    setModals({ ...modals, [type]: false });
    setActiveId(null);
  };

  const handleUpload = async (e: any) => {
    const f: File = e.target.files[0];
    if (!f || !signer) return;
    setLoading(true);
    const t = toast.loading(`Encrypting & storing "${f.name}"…`);
    try {
      await ensureGas();
      const tokenId = await mintAndEncrypt(f);
      toast.dismiss(t);
      toast.success(`Asset #${tokenId} encrypted & minted to vault!`);
      addActivity({
        type: "upload",
        title: "Asset uploaded",
        description: `"${f.name}" encrypted & minted to vault`,
        walletAddress: wallet!.address,
        tokenId,
      });
    } catch (e: any) {
      toast.dismiss(t);
      toast.error(e.message || "Upload failed");
    }
    setLoading(false);
    e.target.value = "";
  };

  const handleDecrypt = async (cid: string, mode: "PREVIEW" | "DOWNLOAD") => {
    if (!wallet || !signer) return;
    const t = toast.loading("Decrypting on-device with your private key…");
    try {
      const file = await decryptFile(cid, signer);
      if (mode === "PREVIEW") {
        setFormData((p) => ({ ...p, previewObj: file, previewUrl: "", previewName: file.name }));
        setModals((p) => ({ ...p, preview: true }));
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      toast.dismiss(t);
    } catch (err: any) {
      toast.dismiss(t);
      toast.error(err.message || "Decryption failed");
    }
  };

  const handleListForSale = async () => {
    if (!formData.price || !activeId) return;
    setLoading(true);
    try {
      await ensureGas();
      let previewCid = "";
      if (formData.previewFile) {
        const t = toast.loading("Uploading preview thumbnail…");
        previewCid = await uploadPreview(formData.previewFile);
        toast.dismiss(t);
      }
      await listAssetForSale(activeId, formData.price, formData.desc, previewCid || null, true);
      toast.success("Asset listed on marketplace.");
      addActivity({
        type: "list",
        title: "Asset listed",
        description: `Asset #${activeId} listed at ${formData.price} ${NETWORK_CONFIG.tokenSymbol}`,
        walletAddress: wallet!.address,
        tokenId: activeId,
        amount: formData.price,
      });
      closeModal("sell");
    } catch (e: any) {
      toast.error(e.message || "Listing failed");
    }
    setLoading(false);
  };

  if (!isClient || !contract) return null;

  const filteredVault = vaultItems.filter((file: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return file.name?.toLowerCase().includes(q) || String(file.id).includes(q);
  });

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 md:px-8 max-w-7xl mx-auto font-sans">
      {/* ── Vault Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8 pb-6 border-b border-black/[0.05] dark:border-white/[0.08]"
      >
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Encrypted <span className="text-muted-foreground font-normal">Vault</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1.5">
            {vaultItems.length} secured file{vaultItems.length !== 1 ? "s" : ""} in decentralized storage
          </p>
        </div>

        {/* Action Buttons: Batch Upload & New Asset */}
        <div className="flex items-center gap-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setModals((p) => ({ ...p, batchUpload: true }))}
            className="px-4 py-2.5 rounded-2xl bg-card hover:bg-muted text-foreground text-xs font-semibold border border-border flex items-center gap-2 cursor-pointer transition-all shadow-sm"
          >
            <FolderUp size={15} className="text-primary" />
            <span>Batch Upload</span>
          </motion.button>

          <label className="cursor-pointer">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="px-5 py-2.5 rounded-2xl btn-enterprise-primary text-primary-foreground flex items-center gap-2 transition-all cursor-pointer"
            >
              <Upload size={15} />
              <span>{loading ? "Encrypting…" : "Upload File"}</span>
            </motion.div>
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={loading}
            />
          </label>
        </div>
      </motion.div>

      {/* ── Pending Offers Banner (Escrow Trades) ── */}
      <AnimatePresence>
        {salesItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Pending Offers Awaiting Your Confirmation
                </h3>
              </div>

              <div className="space-y-2.5">
                {salesItems.map((sale: any, i: number) => (
                  <div
                    key={`sale-${i}`}
                    className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-bold text-foreground">{sale.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Buyer: <span className="font-mono">{sale.buyer.slice(0, 6)}…{sale.buyer.slice(-4)}</span> ·{" "}
                        <span className="font-bold text-[#1B2CC1] dark:text-[#7692FF]">
                          {sale.price} {NETWORK_CONFIG.tokenSymbol}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        disabled={!!txLoading[sale.tokenId]}
                        onClick={async () => {
                          try {
                            setTxLoading((prev) => ({ ...prev, [sale.tokenId]: "confirm" }));
                            await confirmTrade(sale.tokenId);
                            toast.success("Trade confirmed! Funds received.");
                            addActivity({
                              type: "escrow_confirm",
                              title: "Trade confirmed",
                              description: `Confirmed sale of asset #${sale.tokenId} "${sale.name}" for ${sale.price} ${NETWORK_CONFIG.tokenSymbol}`,
                              walletAddress: wallet!.address,
                              tokenId: sale.tokenId,
                              amount: sale.price,
                              address: sale.buyer,
                            });
                          } catch (e: any) {
                            toast.error(e.message);
                          } finally {
                            setTxLoading((prev) => ({ ...prev, [sale.tokenId]: null }));
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm cursor-pointer transition-all"
                      >
                        {txLoading[sale.tokenId] === "confirm" ? "Confirming…" : "Accept & Release"}
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        disabled={!!txLoading[sale.tokenId]}
                        onClick={async () => {
                          try {
                            setTxLoading((prev) => ({ ...prev, [sale.tokenId]: "cancel" }));
                            await cancelTrade(sale.tokenId);
                            toast.success("Trade cancelled. Buyer refunded.");
                            addActivity({
                              type: "escrow_cancel",
                              title: "Trade cancelled",
                              description: `Trade for asset #${sale.tokenId} cancelled`,
                              walletAddress: wallet!.address,
                              tokenId: sale.tokenId,
                              address: sale.buyer,
                            });
                          } catch (e: any) {
                            toast.error(e.message);
                          } finally {
                            setTxLoading((prev) => ({ ...prev, [sale.tokenId]: null }));
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold cursor-pointer transition-all"
                      >
                        Decline
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search & Filter Pill ── */}
      {vaultItems.length > 0 && (
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets by name or ID…"
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-card/85 border border-black/[0.06] dark:border-[#ABD2FA]/20 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-[#7692FF] focus:ring-4 focus:ring-[#7692FF]/15 transition-all shadow-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
            Showing {filteredVault.length} of {vaultItems.length}
          </span>
        </div>
      )}

      {/* ── Asset Grid (iOS Files style) ── */}
      {vaultItems.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl p-16 text-center bg-card/85 border border-black/[0.06] dark:border-[#ABD2FA]/20 shadow-sm flex flex-col items-center justify-center"
        >
          <div className="w-16 h-16 rounded-3xl bg-primary/15 text-[#1B2CC1] dark:text-[#7692FF] flex items-center justify-center mb-4 border border-[#1B2CC1]/20">
            <Lock size={28} />
          </div>
          <h3 className="text-xl font-bold text-foreground">Your Vault is Empty</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-6">
            Upload files to store them end-to-end encrypted on IPFS with decentralized ownership verified on-chain.
          </p>
          <label className="cursor-pointer">
            <div className="px-5 py-2.5 rounded-2xl btn-enterprise-primary text-primary-foreground flex items-center gap-2 cursor-pointer transition-all">
              <Upload size={14} />
              <span>Upload Your First File</span>
            </div>
            <input type="file" className="hidden" onChange={handleUpload} disabled={loading} />
          </label>
        </motion.div>
      ) : filteredVault.length === 0 ? (
        <div className="rounded-3xl p-12 text-center bg-card border border-border text-muted-foreground text-sm">
          No assets match your search query "{searchQuery}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVault.map((file: any, i: number) => {
            const isSeller = wallet?.address.toLowerCase() === file.seller?.toLowerCase();
            const inEscrow = file.isEscrowActive;

            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: i * 0.03 }}
                className={`rounded-3xl ios-card transition-all flex flex-col justify-between overflow-hidden group ${
                  inEscrow ? "ring-2 ring-amber-500/30 bg-amber-50/20 dark:bg-amber-950/10" : ""
                }`}
              >
                <div className="p-6">
                  {/* Top Bar: Badges + Token ID */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#7692FF]/15 text-[#1B2CC1] dark:text-[#ABD2FA] border border-[#7692FF]/25">
                        #{file.id}
                      </span>
                      {file.isListed && !inEscrow && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15">
                          On Sale
                        </span>
                      )}
                      {inEscrow && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/15">
                          In Escrow ({isSeller ? "Seller" : "Buyer"})
                        </span>
                      )}
                      {file.isCopy && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/15">
                          Copy
                        </span>
                      )}
                    </div>

                    <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] text-muted-foreground">
                      <Lock size={13} />
                    </div>
                  </div>

                  {/* File Icon & Name */}
                  <div className="flex items-start gap-3.5 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#7692FF]/12 text-[#1B2CC1] dark:text-[#7692FF] flex items-center justify-center shrink-0">
                      <FileText size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-bold text-foreground truncate group-hover:text-[#1B2CC1] dark:group-hover:text-[#7692FF] transition-colors" title={file.name}>
                        {file.name}
                      </h4>
                      <p className="text-[11px] font-mono text-[#1B2CC1] dark:text-[#ABD2FA] truncate mt-0.5">
                        {file.cid ? `${file.cid.slice(0, 10)}...${file.cid.slice(-6)}` : "Encrypted IPFS CID"}
                      </p>
                    </div>
                  </div>

                  {/* Price Tag if Listed or in Escrow */}
                  {(file.isListed || inEscrow) && (
                    <div className="mt-3 p-3 rounded-2xl bg-background border border-border flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground font-medium">Price</span>
                      <span className="text-sm font-extrabold text-[#1B2CC1] dark:text-[#ABD2FA]">
                        {file.price} {NETWORK_CONFIG.tokenSymbol}
                      </span>
                    </div>
                  )}

                  {/* Escrow Progress Bar */}
                  {inEscrow && (
                    <div className="mt-3 p-3 rounded-2xl bg-[#7692FF]/10 border border-[#7692FF]/20 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#1B2CC1] dark:text-[#ABD2FA] mb-1.5">
                        <span>Dual Confirmation</span>
                        <span>{file.sellerConfirmed && file.buyerConfirmed ? "2/2" : file.sellerConfirmed || file.buyerConfirmed ? "1/2" : "0/2"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className={file.sellerConfirmed ? "text-emerald-400 font-bold" : "text-muted-foreground"}>
                          Seller {file.sellerConfirmed ? "✓" : "..."}
                        </span>
                        <span>·</span>
                        <span className={file.buyerConfirmed ? "text-emerald-400 font-bold" : "text-muted-foreground"}>
                          Buyer {file.buyerConfirmed ? "✓" : "..."}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Action Footer ── */}
                <div className="p-3 bg-slate-50/60 dark:bg-[#091540]/60 border-t border-border flex items-center gap-1.5">
                  {inEscrow ? (
                    isSeller ? (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={async () => {
                          try {
                            await cancelTrade(file.id);
                            toast.success("Trade cancelled.");
                          } catch (e: any) {
                            toast.error(e.message);
                          }
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors"
                      >
                        Cancel Trade
                      </motion.button>
                    ) : (
                      <div className="flex items-center gap-1.5 w-full">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          disabled={file.buyerConfirmed}
                          onClick={async () => {
                            try {
                              await confirmTrade(file.id);
                              toast.success("Payment confirmed!");
                              addActivity({
                                type: "escrow_confirm",
                                title: "Payment confirmed",
                                description: `Confirmed purchase of asset #${file.id} "${file.name}"`,
                                walletAddress: wallet!.address,
                                tokenId: file.id,
                                amount: file.price,
                              });
                            } catch (e: any) {
                              toast.error(e.message);
                            }
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition-all"
                        >
                          {file.buyerConfirmed ? "Awaiting Seller…" : "Confirm Payment"}
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={async () => {
                            try {
                              await cancelTrade(file.id);
                              toast.success("Trade cancelled.");
                            } catch (e: any) {
                              toast.error(e.message);
                            }
                          }}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
                        >
                          <XCircle size={15} />
                        </motion.button>
                      </div>
                    )
                  ) : file.isListed ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={async () => {
                          try {
                            await cancelListing(file.id);
                            toast.success("Listing cancelled.");
                          } catch (e: any) {
                            toast.error(e.message);
                          }
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors"
                      >
                        Cancel Listing
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openModal("edit", file.id, { price: file.price, desc: file.description, escrow: true })}
                        className="p-2 rounded-xl bg-muted dark:bg-[#7692FF]/15 hover:bg-[#7692FF]/25 text-foreground transition-colors"
                        title="Edit Price"
                      >
                        <Tag size={15} className="text-[#1B2CC1] dark:text-[#7692FF]" />
                      </motion.button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 w-full">
                      {/* Open / Decrypt Button */}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDecrypt(file.cid, "PREVIEW")}
                        className="flex-1 py-2 px-3.5 rounded-xl btn-enterprise-primary text-primary-foreground flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Eye size={14} />
                        <span>Decrypt & Open</span>
                      </motion.button>

                      {!file.isCopy && (
                        <>
                          {/* Share Button */}
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openModal("share", file.id, { name: file.name })}
                            className="p-2 rounded-xl bg-muted dark:bg-[#091540]/80 hover:bg-[#7692FF]/15 text-foreground transition-colors cursor-pointer border border-transparent dark:border-[#ABD2FA]/15"
                            title="Share with Expiry"
                          >
                            <Link2 size={15} className="text-[#1B2CC1] dark:text-[#7692FF]" />
                          </motion.button>

                          {/* Transfer Button */}
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openModal("transfer", file.id, { mode: "MOVE", cid: file.cid, name: file.name })}
                            className="p-2 rounded-xl bg-muted dark:bg-[#091540]/80 hover:bg-[#7692FF]/15 text-foreground transition-colors cursor-pointer border border-transparent dark:border-[#ABD2FA]/15"
                            title="Transfer / Send"
                          >
                            <Send size={15} className="text-[#1B2CC1] dark:text-[#7692FF]" />
                          </motion.button>

                          {/* Sell Button */}
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openModal("sell", file.id)}
                            className="p-2 rounded-xl bg-muted dark:bg-[#091540]/80 hover:bg-[#7692FF]/15 text-foreground transition-colors cursor-pointer border border-transparent dark:border-[#ABD2FA]/15"
                            title="List on Marketplace"
                          >
                            <Tag size={15} className="text-[#1B2CC1] dark:text-[#7692FF]" />
                          </motion.button>
                        </>
                      )}

                      {/* Burn Button */}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openModal("burn", file.id, { cid: file.cid })}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                        title="Permanently Destroy"
                      >
                        <Trash2 size={15} />
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ══ BUBBLY MODALS ══ */}
      <AnimatePresence>
        <FilePreviewModal
          isOpen={modals.preview}
          onClose={() => closeModal("preview")}
          file={formData.previewObj}
          url={formData.previewUrl || null}
          fileName={formData.previewName}
          fileType={formData.previewType}
        />

        {modals.batchUpload && (
          <Modal
            key="batchUpload"
            isOpen
            onClose={() => closeModal("batchUpload")}
            title="Batch Upload Assets"
          >
            <BatchUpload onClose={() => closeModal("batchUpload")} />
          </Modal>
        )}

        {modals.share && activeId && (
          <Modal
            key="share"
            isOpen
            onClose={() => closeModal("share")}
            title="Share Encrypted Asset"
          >
            <ShareWithExpiry
              tokenId={activeId}
              fileName={formData.name}
              onClose={() => closeModal("share")}
            />
          </Modal>
        )}

        {/* Sell Modal */}
        {modals.sell && (
          <Modal
            key="sell"
            isOpen
            onClose={() => closeModal("sell")}
            title="List Asset for Sale"
          >
            <div className="space-y-4 pt-2">
              <Input
                label={`Asking Price (${NETWORK_CONFIG.tokenSymbol})`}
                type="number"
                min="0"
                step="0.001"
                value={formData.price}
                onChange={(e: any) => setFormData({ ...formData, price: e.target.value })}
                placeholder="e.g. 10.5"
              />

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Item Description
                </label>
                <textarea
                  value={formData.desc}
                  onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                  className="w-full bg-muted border border-black/[0.08] dark:border-white/[0.1] rounded-2xl p-3.5 text-xs text-foreground outline-none focus:border-[#7692FF] transition-colors resize-none h-20"
                  placeholder="Describe your asset for buyers…"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Public Thumbnail Preview <span className="text-[10px] font-normal normal-case">(optional, unencrypted)</span>
                </label>
                <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-black/[0.12] dark:border-white/[0.15] bg-muted dark:bg-white/[0.03] cursor-pointer hover:border-primary/50 transition-colors">
                  <ImagePlus size={18} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">
                    {formData.previewFile ? formData.previewFile.name : "Select an image preview…"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setFormData({ ...formData, previewFile: e.target.files?.[0] || null })}
                  />
                </label>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleListForSale}
                disabled={!formData.price || loading}
                className="w-full py-3.5 rounded-2xl btn-enterprise-primary text-primary-foreground transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Listing on Chain…" : "Publish Listing"}
              </motion.button>
            </div>
          </Modal>
        )}

        {/* Edit Price Modal */}
        {modals.edit && (
          <Modal
            key="edit"
            isOpen
            onClose={() => closeModal("edit")}
            title="Update Listing Price"
          >
            <div className="space-y-4 pt-2">
              <Input
                label={`New Price (${NETWORK_CONFIG.tokenSymbol})`}
                type="number"
                value={formData.price}
                onChange={(e: any) => setFormData({ ...formData, price: e.target.value })}
              />
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  try {
                    await updateListing(activeId!, formData.price, formData.desc, true);
                    toast.success("Listing updated successfully.");
                    closeModal("edit");
                  } catch (e: any) {
                    toast.error(e.message);
                  }
                }}
                className="w-full py-3.5 rounded-2xl btn-enterprise-primary text-primary-foreground transition-all cursor-pointer"
              >
                Update Price
              </motion.button>
            </div>
          </Modal>
        )}

        {/* Transfer Modal */}
        {modals.transfer && (
          <Modal
            key="transfer"
            isOpen
            onClose={() => {
              closeModal("transfer");
              setShowContactPicker(false);
              setContactSearch("");
            }}
            title="Transfer Encrypted Asset"
          >
            <div className="space-y-4 pt-2">
              {/* Segmented Control */}
              <div className="flex p-1 rounded-2xl bg-muted dark:bg-white/[0.06] border border-black/5 dark:border-white/5">
                {(["MOVE", "COPY"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setFormData({ ...formData, mode: m })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      formData.mode === m
                        ? "bg-white dark:bg-[#2C2C2E] text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "MOVE" ? "Transfer Ownership" : "Send Copy"}
                  </button>
                ))}
              </div>

              {formData.mode === "COPY" && (
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/15 text-[11px] text-blue-600 dark:text-blue-400">
                  Sending a copy maintains the same IPFS CID. The recipient will receive decryption credentials.
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Recipient Address
                  </label>
                  {contacts.length > 0 && (
                    <button
                      onClick={() => setShowContactPicker(!showContactPicker)}
                      className="text-xs font-semibold text-[#1B2CC1] dark:text-[#7692FF] hover:underline cursor-pointer"
                    >
                      {showContactPicker ? "Close Contacts" : "Pick Contact"}
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {showContactPicker && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-3 overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-muted dark:bg-white/[0.03] p-2"
                    >
                      <input
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        placeholder="Filter contacts…"
                        className="w-full px-3 py-1.5 mb-2 rounded-xl bg-white dark:bg-[#1C1C1E] text-xs outline-none border border-black/5 dark:border-white/10"
                      />
                      <div className="max-h-36 overflow-y-auto space-y-1">
                        {contacts
                          .filter((c) => {
                            const q = contactSearch.toLowerCase();
                            return !q || c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q);
                          })
                          .map((contact) => (
                            <button
                              key={contact.id}
                              onClick={() => {
                                setFormData((p) => ({ ...p, address: contact.address }));
                                setShowContactPicker(false);
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted dark:hover:bg-white/[0.08] text-left text-xs transition-colors cursor-pointer"
                            >
                              <span className="font-semibold text-foreground">{contact.name}</span>
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {contact.address.slice(0, 6)}…{contact.address.slice(-4)}
                              </span>
                            </button>
                          ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="0x…"
                  className="w-full px-3.5 py-3 rounded-2xl bg-muted border border-black/[0.08] dark:border-white/[0.1] font-mono text-xs text-foreground outline-none focus:border-[#7692FF] transition-colors"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  if (!formData.address) return toast.error("Enter recipient address");
                  setLoading(true);
                  try {
                    const success =
                      formData.mode === "MOVE"
                        ? await transferAsset(activeId!, formData.address)
                        : await sendCopyAsset(activeId!, formData.address, formData.name, formData.cid);
                    if (success) {
                      addActivity({
                        type: "transfer_out",
                        title: formData.mode === "MOVE" ? "Asset transferred" : "Copy sent",
                        description: `Asset #${activeId} sent to ${formData.address.slice(0, 8)}…`,
                        walletAddress: wallet!.address,
                        tokenId: activeId!,
                        address: formData.address,
                      });
                      toast.success("Transfer confirmed on-chain.");
                      closeModal("transfer");
                    }
                  } catch (e: any) {
                    toast.error(e.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={!formData.address || loading}
                className="w-full py-3.5 rounded-2xl btn-enterprise-primary text-primary-foreground transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Confirming…" : "Execute Transfer"}
              </motion.button>
            </div>
          </Modal>
        )}

        {/* Burn Modal */}
        {modals.burn && (
          <Modal
            key="burn"
            isOpen
            onClose={() => closeModal("burn")}
            title="Permanently Destroy Asset"
          >
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={26} />
              </div>
              <p className="text-sm font-bold text-foreground mb-1">
                Are you absolutely sure?
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-6">
                This action is irreversible. The asset NFT will be burned and permanently purged from your vault.
              </p>
              <div className="flex items-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => closeModal("burn")}
                  className="flex-1 py-3 rounded-2xl bg-muted dark:bg-white/[0.06] text-foreground text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await burnAsset(activeId!, formData.cid);
                      toast.success("Asset burned.");
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
                  }}
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-md shadow-red-500/25 cursor-pointer"
                >
                  {loading ? "Destroying…" : "Yes, Destroy"}
                </motion.button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}