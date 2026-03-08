"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useActivityStore } from "@/lib/activity-store";
import { decryptFile, uploadPreview, unlockVaultKey } from "@/lib/crypto-engine";
import {
  Upload, FileText, Send, Trash2, Box, Users, Check, Tag, XCircle,
  Eye, Lock, ShieldCheck, Clock, CheckCircle2, ImagePlus, FolderUp, Link2
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Modal } from "@/components/ui-kits";
import FilePreviewModal from "@/components/FilePreviewModal";
import BatchUpload from "@/components/BatchUpload";
import ShareWithExpiry from "@/components/ShareWithExpiry";
import PriceHistory from "@/components/PriceHistory";
import { NETWORK_CONFIG } from "@/lib/constants";

export default function VaultPage() {
  const router = useRouter();
  const {
    contract, wallet, signer, ensureGas, syncAll, startAutoRefresh,
    vaultItems, salesItems,
    mintAndEncrypt,
    listAssetForSale, updateListing, cancelListing,
    transferAsset, sendCopyAsset, confirmTrade, cancelTrade, burnAsset,
    getEffectiveCid,
  } = useStore();

  const { addActivity } = useActivityStore();
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [modals, setModals] = useState({
    sell: false, edit: false, transfer: false, burn: false, preview: false, batchUpload: false, share: false,
  });
  const [activeId, setActiveId] = useState<number | null>(null);
  const [txLoading, setTxLoading] = useState<Record<number, boolean>>({});

  const [formData, setFormData] = useState({
    price: "", desc: "", escrow: true, address: "",
    mode: "MOVE" as "MOVE" | "COPY",
    cid: "", name: "", previewUrl: "",
    previewFile: null as File | null,
    previewObj: null as File | null,
    previewType: "",
    previewName: "",
  });

  useEffect(() => {
    setIsClient(true);
    if (!contract || !wallet) { router.push("/"); return; }
    startAutoRefresh();
    // Unlock vault key ONCE — satu-satunya titik sign untuk enkripsi.
    if (signer) {
      unlockVaultKey(signer).catch(() => {
        toast.error("Gagal membuka kunci vault. Coba refresh.");
      });
    }
  }, [contract, wallet, router, startAutoRefresh]);

  const openModal = (type: keyof typeof modals, id: number | null = null, extra: any = {}) => {
    setActiveId(id);
    setModals({ ...modals, [type]: true });
    setFormData((prev) => ({ ...prev, ...extra }));
  };
  const closeModal = (type: keyof typeof modals) => {
    setModals({ ...modals, [type]: false });
    setActiveId(null);
  };

  // ──────────────────────────────────────────
  // UPLOAD & ENCRYPT
  // FIX: Pakai mintAndEncrypt dari store (bukan contract.mintToVault langsung).
  // mintAndEncrypt sudah include gas override, urutan arg yang benar, dan syncAll.
  // ──────────────────────────────────────────
  const handleUpload = async (e: any) => {
    const f: File = e.target.files[0];
    if (!f || !signer) return;
    setLoading(true);
    const t = toast.loading("Mengenkripsi & mengupload...");
    try {
      await ensureGas();
      const tokenId = await mintAndEncrypt(f); // ← FIXED: was contract!.mintToVault(cid, f.name) — arg terbalik & tanpa gas override
      toast.dismiss(t);
      toast.success(`Asset #${tokenId} berhasil di-mint ke vault!`);
      addActivity({
        type: "upload",
        title: "Asset di-upload",
        description: `File "${f.name}" berhasil dienkripsi & di-mint ke vault`,
        walletAddress: wallet!.address,
        tokenId,
      });
    } catch (e: any) {
      toast.dismiss(t);
      toast.error(e.message || "Upload gagal");
    }
    setLoading(false);
    e.target.value = "";
  };

  // ──────────────────────────────────────────
  // DECRYPT & PREVIEW / DOWNLOAD
  // ──────────────────────────────────────────
  const handleDecrypt = async (tokenId: number, cidFromChain: string, mode: "PREVIEW" | "DOWNLOAD") => {
    if (!wallet || !signer) return;
    const t = toast.loading("Mendekripsi...");
    try {
      // Resolve CID yang benar — cek KV override dulu (file mungkin di-transfer)
      const cid = await getEffectiveCid(tokenId, cidFromChain);
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
      toast.error(err.message || "Dekripsi gagal");
    }
  };

  // ──────────────────────────────────────────
  // LIST FOR SALE (with optional preview)
  // ──────────────────────────────────────────
  const handleListForSale = async () => {
    if (!formData.price || !activeId) return;
    setLoading(true);
    try {
      await ensureGas(); // ← FIXED: pastikan gas cukup sebelum listing
      let previewCid = "";
      if (formData.previewFile) {
        const t = toast.loading("Mengupload preview...");
        previewCid = await uploadPreview(formData.previewFile);
        toast.dismiss(t);
      }
      await listAssetForSale(activeId, formData.price, formData.desc, previewCid || null, true);
      toast.success("Asset berhasil di-listing!");
      addActivity({
        type: "list",
        title: "Asset di-listing",
        description: `Asset #${activeId} di-listing seharga ${formData.price} ${NETWORK_CONFIG.tokenSymbol}`,
        walletAddress: wallet!.address,
        tokenId: activeId,
        amount: formData.price,
      });
      closeModal("sell");
    } catch (e: any) {
      toast.error(e.message || "Listing gagal");
    }
    setLoading(false);
  };

  if (!isClient || !contract) return null;

  return (
    <div className="min-h-screen pt-40 px-6 pb-32 max-w-[1400px] mx-auto transition-colors duration-700">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-4">
          <h1 className="text-7xl md:text-8xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50 mb-4">
            Vault.
          </h1>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="px-3 py-1 rounded-full border border-border/50 bg-muted/20 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              Encrypted · {NETWORK_CONFIG.name}
            </span>
            <span className="text-muted-foreground text-sm font-medium">
              {vaultItems.length} Asset{vaultItems.length !== 1 && "s"} Secured
            </span>
          </div>
        </motion.div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setModals((p) => ({ ...p, batchUpload: true }))}
            className="group px-6 py-4 bg-muted/60 text-foreground text-sm font-bold rounded-2xl flex items-center gap-3 hover:bg-muted transition-all border border-border/50"
          >
            <FolderUp size={18} strokeWidth={2.5} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="tracking-wide text-muted-foreground group-hover:text-foreground transition-colors">BATCH UPLOAD</span>
          </button>

          <label className={`cursor-pointer group px-8 py-4 bg-foreground text-background text-sm font-bold rounded-2xl shadow-2xl flex items-center gap-3 hover:opacity-90 transition-all ${loading ? "opacity-70 pointer-events-none" : ""}`}>
            <div className="flex items-center gap-3">
              {loading
                ? <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                : <Upload size={18} strokeWidth={2.5} />}
              <span className="tracking-wide">{loading ? "ENCRYPTING..." : "UPLOAD ASSET"}</span>
            </div>
            <input type="file" className="hidden" onChange={handleUpload} disabled={loading} />
          </label>
        </div>
      </div>

      {/* INCOMING OFFERS (Seller Notification) */}
      <AnimatePresence>
        {salesItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-16 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-4 px-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Incoming Offers — Perlu Konfirmasi
              </span>
            </div>
            <div className="grid gap-3">
              {salesItems.map((sale: any, i: number) => (
                <motion.div
                  key={`sale-${i}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-card/50 border border-amber-500/30 p-6 rounded-3xl flex justify-between items-center shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                      <Users size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Offer: {sale.name}</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Buyer: {sale.buyer.slice(0, 6)}...{sale.buyer.slice(-4)} ·{" "}
                        <span className="text-foreground font-bold">
                          {sale.price} {NETWORK_CONFIG.tokenSymbol}
                        </span>
                      </p>
                      <PriceHistory tokenId={sale.tokenId} currentPrice={sale.price} compact />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      isLoading={txLoading[sale.tokenId]}
                      disabled={txLoading[sale.tokenId]}
                      onClick={async () => {
                        try {
                          setTxLoading(prev => ({ ...prev, [sale.tokenId]: true }));
                          await confirmTrade(sale.tokenId);
                          toast.success("Deal dikonfirmasi!");
                          addActivity({
                            type: "escrow_confirm",
                            title: "Trade dikonfirmasi",
                            description: `Kamu konfirmasi penjualan asset #${sale.tokenId} "${sale.name}" seharga ${sale.price} ${NETWORK_CONFIG.tokenSymbol}`,
                            walletAddress: wallet!.address,
                            tokenId: sale.tokenId,
                            amount: sale.price,
                            address: sale.buyer,
                          });
                        } catch (e: any) {
                          toast.error(e.message);
                        } finally {
                          setTxLoading(prev => ({ ...prev, [sale.tokenId]: false }));
                        }
                      }}
                      className="h-10 text-xs px-6 bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      Terima
                    </Button>
                    <Button
                      disabled={txLoading[sale.tokenId]}
                      onClick={async () => {
                        try {
                          setTxLoading(prev => ({ ...prev, [sale.tokenId]: true }));
                          await cancelTrade(sale.tokenId);
                          toast.success("Trade dibatalkan, buyer di-refund");
                          addActivity({
                            type: "escrow_cancel",
                            title: "Trade dibatalkan",
                            description: `Trade asset #${sale.tokenId} "${sale.name}" dibatalkan, buyer di-refund`,
                            walletAddress: wallet!.address,
                            tokenId: sale.tokenId,
                            address: sale.buyer,
                          });
                        } catch (e: any) {
                          toast.error(e.message);
                        } finally {
                          setTxLoading(prev => ({ ...prev, [sale.tokenId]: false }));
                        }
                      }}
                      variant="danger"
                      className="h-10 w-10 p-0 rounded-full flex items-center justify-center shrink-0"
                    >
                      <XCircle size={18} />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VAULT GRID */}
      {vaultItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 bg-muted/5 border border-dashed border-border/50 rounded-[3rem]">
          <div className="w-28 h-28 bg-muted/10 rounded-full flex items-center justify-center mb-8 border border-white/5">
            <Box size={40} className="text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Vault Kosong</h3>
          <p className="text-muted-foreground text-sm max-w-xs text-center leading-relaxed">
            Upload file pertama untuk mengamankannya di blockchain.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vaultItems.map((file: any, i: number) => {
            const isSeller = wallet?.address.toLowerCase() === file.seller?.toLowerCase();
            const isBuyer = wallet?.address.toLowerCase() === file.buyer?.toLowerCase();
            const inEscrow = file.isEscrowActive;

            const cardStyle = inEscrow
              ? "bg-amber-500/5 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)]"
              : "bg-card/40 border-border/50 hover:bg-card/80 hover:border-primary/20 hover:shadow-2xl";

            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`group relative backdrop-blur-md border rounded-[2.5rem] p-2 transition-all duration-500 ${cardStyle}`}
              >
                <div className="p-6 pb-2">
                  {/* CARD HEADER */}
                  <div className="flex justify-between items-start mb-8">
                    <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center border ${file.isCopy
                      ? "bg-muted/50 border-border text-muted-foreground"
                      : inEscrow
                        ? "bg-amber-500/20 text-amber-500 border-amber-500/30"
                        : "bg-gradient-to-br from-background to-muted border-white/10 text-foreground"
                      }`}>
                      {inEscrow ? <ShieldCheck size={24} /> : file.isCopy ? <Users size={24} /> : <FileText size={24} />}
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {file.isListed && !inEscrow && (
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-muted text-muted-foreground border border-border uppercase tracking-wide">
                          On Sale
                        </span>
                      )}
                      {inEscrow && (
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold border uppercase tracking-wide ${isSeller
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                          }`}>
                          {isSeller ? "Kamu Seller" : "Kamu Buyer"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* INFO */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-foreground truncate tracking-tight mb-2">
                      {file.name}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-muted-foreground/60 font-mono bg-muted/30 px-2 py-1 rounded-md">
                        #{file.id}
                      </span>
                      {(file.isListed || inEscrow) && (
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-sm font-bold text-foreground">
                            {file.price} {NETWORK_CONFIG.tokenSymbol}
                          </span>
                          {file.isListed && (
                            <PriceHistory tokenId={file.id} currentPrice={file.price} compact />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ESCROW STATUS */}
                  {inEscrow && (
                    <div className="bg-background/50 rounded-2xl p-4 border border-border/50 mb-2">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                        <span>Seller</span>
                        <span>Buyer</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className={`flex items-center gap-2 ${file.sellerConfirmed ? "text-emerald-500" : "text-muted-foreground"}`}>
                          {file.sellerConfirmed ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                          <span className="font-bold text-xs">{file.sellerConfirmed ? "OK" : "Pending"}</span>
                        </div>
                        <div className="h-[1px] flex-1 bg-border mx-4" />
                        <div className={`flex items-center gap-2 ${file.buyerConfirmed ? "text-emerald-500" : "text-muted-foreground"}`}>
                          <span className="font-bold text-xs">{file.buyerConfirmed ? "OK" : "Pending"}</span>
                          {file.buyerConfirmed ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACTION BAR */}
                <div className="bg-muted/30 rounded-[2rem] p-2 mt-2 gap-2 flex items-center justify-between border border-white/5">

                  {inEscrow ? (
                    <>
                      {isSeller ? (
                        // SELLER: hanya bisa batalkan trade (refund buyer)
                        <button
                          onClick={async () => {
                            try {
                              await cancelTrade(file.id);
                              toast.success("Trade dibatalkan, buyer di-refund");
                              addActivity({
                                type: "escrow_cancel",
                                title: "Trade dibatalkan",
                                description: `Trade asset #${file.id} "${file.name}" dibatalkan, buyer di-refund`,
                                walletAddress: wallet!.address,
                                tokenId: file.id,
                              });
                            } catch (e: any) { toast.error(e.message); }
                          }}
                          className="flex-1 h-12 rounded-[1.5rem] bg-red-500/10 text-red-500 font-bold text-xs hover:bg-red-500 hover:text-white transition-all border border-red-500/20 flex items-center justify-center gap-2"
                        >
                          <XCircle size={14} /> Batalkan & Refund Buyer
                        </button>
                      ) : (
                        // BUYER: Preview + Confirm + Cancel
                        <>
                          <button
                            onClick={() => {
                              if (file.previewURI) {
                                setFormData((p) => ({
                                  ...p,
                                  previewUrl: `${NETWORK_CONFIG.ipfsGateway}/ipfs/${file.previewURI}`,
                                  previewObj: null,
                                  previewName: file.name + " (Preview)",
                                  previewType: "image/jpeg",
                                }));
                                setModals((p) => ({ ...p, preview: true }));
                              } else {
                                toast.error("Tidak ada preview tersedia");
                              }
                            }}
                            className="h-12 w-12 rounded-full bg-background border border-border/50 flex items-center justify-center text-blue-500 hover:scale-105 transition-transform"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await confirmTrade(file.id);
                                toast.success("Payment dikonfirmasi!");
                                addActivity({
                                  type: "escrow_confirm",
                                  title: "Payment dikonfirmasi",
                                  description: `Kamu konfirmasi pembelian asset #${file.id} "${file.name}" seharga ${file.price} ${NETWORK_CONFIG.tokenSymbol}`,
                                  walletAddress: wallet!.address,
                                  tokenId: file.id,
                                  amount: file.price,
                                });
                              } catch (e: any) { toast.error(e.message); }
                            }}
                            disabled={file.buyerConfirmed}
                            className={`flex-1 h-12 rounded-[1.5rem] font-bold text-xs transition-all border flex items-center justify-center gap-2 ${file.buyerConfirmed
                              ? "bg-muted text-muted-foreground border-border"
                              : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border-emerald-500/20"
                              }`}
                          >
                            {file.buyerConfirmed ? "Menunggu Seller..." : <><Check size={14} /> Konfirmasi Payment</>}
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await cancelTrade(file.id);
                                toast.success("Trade dibatalkan, saldo di-refund");
                                addActivity({
                                  type: "escrow_cancel",
                                  title: "Trade dibatalkan",
                                  description: `Trade asset #${file.id} "${file.name}" dibatalkan, saldo di-refund`,
                                  walletAddress: wallet!.address,
                                  tokenId: file.id,
                                });
                              } catch (e: any) { toast.error(e.message); }
                            }}
                            className="h-12 w-12 rounded-full bg-background border border-border/50 flex items-center justify-center text-red-500 hover:scale-105 transition-transform"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                    </>
                  ) : file.isListed ? (
                    <>
                      <button
                        onClick={async () => {
                          try {
                            await cancelListing(file.id);
                            toast.success("Listing dibatalkan");
                            addActivity({
                              type: "delist",
                              title: "Listing dibatalkan",
                              description: `Asset #${file.id} "${file.name}" ditarik dari marketplace`,
                              walletAddress: wallet!.address,
                              tokenId: file.id,
                            });
                          } catch (e: any) { toast.error(e.message); }
                        }}
                        className="flex-1 h-12 rounded-[1.5rem] bg-red-500/10 text-red-500 font-bold text-xs hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                      >
                        Cancel Listing
                      </button>
                      <button
                        onClick={() => openModal("edit", file.id, { price: file.price, desc: file.description, escrow: true })}
                        className="h-12 w-12 rounded-full bg-background border border-border/50 flex items-center justify-center text-foreground hover:scale-105 transition-transform"
                      >
                        <Tag size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleDecrypt(file.id, file.cid, "PREVIEW")}
                        className="flex-1 h-12 rounded-[1.5rem] bg-background text-foreground font-bold text-xs shadow-sm hover:bg-foreground hover:text-background transition-all border border-border/50"
                      >
                        Buka File
                      </button>
                      {!file.isCopy && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal("share", file.id, { name: file.name })}
                            className="h-12 w-12 rounded-full bg-background border border-border/50 flex items-center justify-center text-foreground hover:scale-105 transition-transform shadow-sm"
                            title="Bagikan via Link"
                          >
                            <Link2 size={16} />
                          </button>
                          <button
                            onClick={() => openModal("transfer", file.id, { mode: "MOVE", cid: file.cid, name: file.name })}
                            className="h-12 w-12 rounded-full bg-background border border-border/50 flex items-center justify-center text-foreground hover:scale-105 transition-transform shadow-sm"
                            title="Transfer"
                          >
                            <Send size={16} />
                          </button>
                          <button
                            onClick={() => openModal("sell", file.id)}
                            className="h-12 w-12 rounded-full bg-background border border-border/50 flex items-center justify-center text-foreground hover:scale-105 transition-transform shadow-sm"
                            title="Jual"
                          >
                            <Tag size={16} />
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => openModal("burn", file.id, { cid: file.cid })}
                        className="h-12 w-12 rounded-full bg-background border border-border/50 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-500/30 transition-all shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ======= MODALS ======= */}
      <AnimatePresence>

        {/* PREVIEW */}
        <FilePreviewModal
          isOpen={modals.preview}
          onClose={() => closeModal("preview")}
          file={formData.previewObj}
          url={formData.previewUrl || null}
          fileName={formData.previewName}
          fileType={formData.previewType}
        />

        {/* BATCH UPLOAD */}
        {modals.batchUpload && (
          <Modal key="batchUpload" isOpen onClose={() => closeModal("batchUpload")} title="Upload Banyak Asset">
            <BatchUpload onClose={() => closeModal("batchUpload")} />
          </Modal>
        )}

        {/* SHARE */}
        {modals.share && activeId && (
          <Modal key="share" isOpen onClose={() => closeModal("share")} title="Bagikan Asset">
            <ShareWithExpiry
              tokenId={activeId}
              fileName={formData.name}
              onClose={() => closeModal("share")}
            />
          </Modal>
        )}

        {/* SELL — with preview upload */}
        {modals.sell && (
          <Modal key="sell" isOpen onClose={() => closeModal("sell")} title="List Asset untuk Dijual">
            <div className="space-y-5 pt-2">
              <Input
                label={`Harga (${NETWORK_CONFIG.tokenSymbol})`}
                type="number"
                min="0"
                step="0.001"
                value={formData.price}
                onChange={(e: any) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.1"
              />
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground ml-3">Deskripsi</label>
                <textarea
                  value={formData.desc}
                  onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                  className="w-full bg-muted/30 p-4 rounded-3xl outline-none text-sm h-24 resize-none border border-transparent focus:border-border transition-all text-foreground"
                  placeholder="Jelaskan asset ini..."
                />
              </div>

              {/* Preview upload */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground ml-3">
                  Preview Image (opsional, tidak terenkripsi)
                </label>
                <label className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl cursor-pointer hover:bg-muted/50 border border-dashed border-border transition-all">
                  <ImagePlus size={18} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {formData.previewFile ? formData.previewFile.name : "Pilih gambar thumbnail..."}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setFormData({ ...formData, previewFile: e.target.files?.[0] || null })}
                  />
                </label>
              </div>

              {/* Escrow wajib aktif */}
              <div className="flex items-center gap-4 p-5 bg-muted/30 rounded-3xl border border-transparent">
                <div className="w-6 h-6 rounded-full border flex items-center justify-center bg-foreground border-foreground">
                  <Check size={12} className="text-background" />
                </div>
                <div>
                  <span className="text-sm font-bold text-foreground">Escrow Aktif (Wajib)</span>
                  <p className="text-xs text-muted-foreground">Buyer & seller harus konfirmasi untuk proses serah terima dan re-enkripsi file</p>
                </div>
              </div>

              <Button
                onClick={handleListForSale}
                isLoading={loading}
                disabled={!formData.price || loading}
                className="w-full h-14 rounded-[1.2rem] text-base"
              >
                Konfirmasi Listing
              </Button>
            </div>
          </Modal>
        )}

        {/* EDIT */}
        {modals.edit && (
          <Modal key="edit" isOpen onClose={() => closeModal("edit")} title="Update Listing">
            <div className="space-y-5 pt-2">
              <Input
                label={`Harga Baru (${NETWORK_CONFIG.tokenSymbol})`}
                type="number"
                value={formData.price}
                onChange={(e: any) => setFormData({ ...formData, price: e.target.value })}
              />
              <Button
                onClick={async () => {
                  try {
                    await updateListing(activeId!, formData.price, formData.desc, true);
                    toast.success("Listing diupdate!");
                    closeModal("edit");
                  } catch (e: any) { toast.error(e.message); }
                }}
                className="w-full h-14 rounded-[1.2rem]"
              >
                Update
              </Button>
            </div>
          </Modal>
        )}

        {/* TRANSFER */}
        {modals.transfer && (
          <Modal key="transfer" isOpen onClose={() => closeModal("transfer")} title="Transfer Asset">
            <div className="space-y-5 pt-2">
              <div className="flex bg-muted/30 p-1.5 rounded-[1.5rem]">
                {(["MOVE", "COPY"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setFormData({ ...formData, mode: m })}
                    className={`flex-1 h-10 text-xs font-bold rounded-[1.2rem] transition-all ${formData.mode === m ? "bg-background shadow-md text-foreground" : "text-muted-foreground"}`}
                  >
                    {m === "MOVE" ? "Pindah (NFT)" : "Kirim Salinan"}
                  </button>
                ))}
              </div>
              {formData.mode === "COPY" && (
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                  <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                    ⚠️ Salinan memakai CID yang sama. Penerima bisa decrypt file ini.
                  </p>
                </div>
              )}
              <Input
                label="Alamat Penerima (0x...)"
                value={formData.address}
                onChange={(e: any) => setFormData({ ...formData, address: e.target.value })}
                placeholder="0x..."
              />
              <Button
                onClick={async () => {
                  try {
                    const success =
                      formData.mode === "MOVE"
                        ? await transferAsset(activeId!, formData.address)
                        : await sendCopyAsset(activeId!, formData.address, formData.name, formData.cid);
                    if (success) {
                      addActivity({
                        type: "transfer_out",
                        title: formData.mode === "MOVE" ? "Asset ditransfer" : "Salinan dikirim",
                        description: `Asset #${activeId} dikirim ke ${formData.address.slice(0, 6)}...${formData.address.slice(-4)}`,
                        walletAddress: wallet!.address,
                        tokenId: activeId!,
                        address: formData.address,
                      });
                      toast.success("Transfer berhasil!");
                      closeModal("transfer");
                    }
                  } catch (e: any) { toast.error(e.message); }
                }}
                className="w-full h-14 rounded-[1.2rem]"
              >
                Konfirmasi Transfer
              </Button>
            </div>
          </Modal>
        )}

        {/* BURN */}
        {modals.burn && (
          <Modal key="burn" isOpen onClose={() => closeModal("burn")} title="Hancurkan Asset">
            <div className="text-center space-y-6 pt-4">
              <div className="w-24 h-24 bg-red-500/5 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-500/10">
                <Trash2 size={48} />
              </div>
              <p className="text-muted-foreground px-4 leading-relaxed">
                Aksi ini <strong>permanen</strong>. Asset akan dihapus dari blockchain.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => closeModal("burn")} variant="secondary" className="flex-1 h-14 rounded-[1.2rem]">
                  Batal
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      await burnAsset(activeId!, formData.cid);
                      toast.success("Asset dihancurkan");
                      addActivity({
                        type: "burn",
                        title: "Asset dihancurkan",
                        description: `Asset #${activeId} dihapus permanen dari blockchain`,
                        walletAddress: wallet!.address,
                        tokenId: activeId!,
                      });
                      closeModal("burn");
                    } catch (e: any) { toast.error(e.message); }
                  }}
                  variant="danger"
                  className="flex-1 h-14 rounded-[1.2rem]"
                >
                  Hancurkan
                </Button>
              </div>
            </div>
          </Modal>
        )}

      </AnimatePresence>
    </div>
  );
}