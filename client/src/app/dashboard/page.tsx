"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useActivityStore, ACTIVITY_META } from "../../lib/activity-store";
import { useContactsStore } from "../../lib/contact-store";
import { NETWORK_CONFIG } from "../../lib/constants";
import { motion } from "framer-motion";
import {
  TrendingUp, Package, ShoppingBag,
  Clock, MessageSquare, Users, Upload, ArrowUpRight,
  Activity, Shield, Star, ChevronRight,
} from "lucide-react";

// ─── Shared serif style injected once ───────────────────────────────────────
const SERIF = "'EB Garamond', 'Cormorant Garamond', Georgia, serif";
const MONO = "'JetBrains Mono', 'Courier New', monospace";

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.055 } } },
  item: {
    initial: { y: 16, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.7, ease } },
  },
};

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({
  label, value, sub, roman, onClick,
}: {
  label: string; value: string | number; sub?: string;
  roman: string; onClick?: () => void;
}) => (
  <motion.div
    variants={stagger.item}
    onClick={onClick}
    style={{
      background: "var(--cv-card)",
      border: "1px solid var(--cv-border-light)",
      padding: "24px 22px",
      position: "relative",
      overflow: "hidden",
      cursor: onClick ? "pointer" : "default",
      transition: "border-color 0.35s, background 0.35s",
      fontFamily: SERIF,
    }}
    whileHover={onClick ? { y: -2 } : {}}
    className="cv-stat-card group"
  >
    {/* Roman numeral watermark */}
    <span style={{
      position: "absolute",
      top: "10px",
      right: "14px",
      fontSize: "9px",
      letterSpacing: "0.18em",
      color: "var(--cv-border)",
      fontFamily: SERIF,
      fontStyle: "italic",
      userSelect: "none",
    }}>
      {roman}
    </span>

    {/* Value */}
    <div style={{
      fontSize: "clamp(28px, 4vw, 38px)",
      fontWeight: 400,
      letterSpacing: "-0.02em",
      lineHeight: 1,
      color: "var(--cv-fg)",
      marginBottom: "8px",
      fontFamily: SERIF,
    }}>
      {value}
    </div>

    {/* Label */}
    <div style={{
      fontSize: "9px",
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: "var(--cv-muted)",
      fontFamily: SERIF,
    }}>
      {label}
    </div>

    {sub && (
      <div style={{
        fontSize: "10px",
        color: "var(--cv-muted)",
        marginTop: "5px",
        fontStyle: "italic",
        fontFamily: SERIF,
      }}>
        {sub}
      </div>
    )}

    {onClick && (
      <div style={{
        position: "absolute",
        bottom: "14px",
        right: "14px",
        opacity: 0,
        transition: "opacity 0.25s",
      }}
        className="cv-arrow"
      >
        <ChevronRight size={12} strokeWidth={1.5} color="var(--cv-muted)" />
      </div>
    )}
  </motion.div>
);

// ─── Quick Action Row ────────────────────────────────────────────────────────
const ActionRow = ({
  label, description, numeral, onClick,
}: {
  label: string; description: string; numeral: string; onClick: () => void;
}) => (
  <motion.button
    variants={stagger.item}
    onClick={onClick}
    style={{
      width: "100%",
      background: "transparent",
      border: "none",
      borderBottom: "1px solid var(--cv-border-light)",
      padding: "18px 0",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      textAlign: "left",
      cursor: "pointer",
      fontFamily: SERIF,
      transition: "all 0.3s",
      position: "relative",
      overflow: "hidden",
    }}
    className="cv-action-row group"
    whileHover={{ x: 4 }}
  >
    <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
      <span style={{
        fontSize: "9px",
        letterSpacing: "0.14em",
        color: "var(--cv-border)",
        fontStyle: "italic",
        flexShrink: 0,
      }}>
        {numeral}
      </span>
      <div>
        <p style={{
          fontSize: "16px",
          fontWeight: 400,
          letterSpacing: "-0.01em",
          color: "var(--cv-fg)",
          marginBottom: "2px",
          fontFamily: SERIF,
          lineHeight: 1.2,
        }}>
          {label}
        </p>
        <p style={{
          fontSize: "10px",
          letterSpacing: "0.04em",
          color: "var(--cv-muted)",
          fontStyle: "italic",
          fontFamily: SERIF,
        }}>
          {description}
        </p>
      </div>
    </div>
    <ArrowUpRight size={13} strokeWidth={1.5} color="var(--cv-border)" style={{ flexShrink: 0, transition: "all 0.3s" }} />
  </motion.button>
);

// ─── Activity Entry ──────────────────────────────────────────────────────────
const ActivityEntry = ({ title, description, timestamp, index }: {
  title: string; description: string; timestamp: number; index: number;
}) => (
  <motion.div
    variants={stagger.item}
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "16px",
      padding: "14px 0",
      borderBottom: "1px solid var(--cv-border-light)",
      fontFamily: SERIF,
    }}
  >
    {/* Index */}
    <span style={{
      fontSize: "9px",
      letterSpacing: "0.12em",
      color: "var(--cv-border)",
      fontStyle: "italic",
      flexShrink: 0,
      paddingTop: "2px",
      minWidth: "20px",
    }}>
      {String(index + 1).padStart(2, "0")}
    </span>

    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{
        fontSize: "14px",
        fontWeight: 400,
        color: "var(--cv-fg)",
        letterSpacing: "-0.01em",
        marginBottom: "2px",
        fontFamily: SERIF,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {title}
      </p>
      <p style={{
        fontSize: "10px",
        color: "var(--cv-muted)",
        fontStyle: "italic",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {description}
      </p>
    </div>

    <span style={{
      fontSize: "9px",
      letterSpacing: "0.08em",
      color: "var(--cv-muted)",
      flexShrink: 0,
      paddingTop: "2px",
      fontStyle: "italic",
    }}>
      {formatTime(timestamp)}
    </span>
  </motion.div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { contract, wallet, vaultItems, marketItems, salesItems, balance, startAutoRefresh } = useStore();
  const { getActivities } = useActivityStore();
  const { contacts } = useContactsStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!contract || !wallet) { router.push("/"); return; }
    startAutoRefresh();
  }, [mounted, contract, wallet, router, startAutoRefresh]);

  const activities = useMemo(
    () => (wallet ? getActivities(wallet.address).slice(0, 8) : []),
    [wallet?.address, getActivities]
  );

  const stats = useMemo(() => {
    if (!wallet) return null;
    const myItems = vaultItems.filter((i) => !i.isListed && !i.isEscrowActive);
    const listed = vaultItems.filter((i) => i.isListed);
    const escrowPending = salesItems.length;
    const portfolioValue = listed.reduce((sum, i) => sum + parseFloat(i.price || "0"), 0);
    const totalItems = vaultItems.length;
    return { myItems: myItems.length, listed: listed.length, escrowPending, portfolioValue, totalItems };
  }, [vaultItems, salesItems, wallet]);

  if (!mounted || !wallet || !stats) return null;

  const shortAddr = `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`;

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--cv-bg)" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap');

        :root {
          --cv-bg: #FAFAF8;
          --cv-fg: #0A0A0A;
          --cv-muted: #6B6B6B;
          --cv-border: #D8D4CC;
          --cv-border-light: #EDEAE4;
          --cv-card: #FFFFFF;
          --cv-surface: #F4F2EE;
          --cv-ink-light: #3A3A3A;
        }
        .dark {
          --cv-bg: #0A0A08;
          --cv-fg: #F0EDE6;
          --cv-muted: #8A857C;
          --cv-border: #2A2820;
          --cv-border-light: #1E1C18;
          --cv-card: #111109;
          --cv-surface: #161410;
          --cv-ink-light: #C5BFB5;
        }

        /* Grain */
        .cv-dashboard::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)' opacity='1'/%3E%3C/svg%3E");
          background-size: 256px 256px;
        }

        /* Stat card hover */
        .cv-stat-card:hover {
          border-color: var(--cv-border) !important;
          background: var(--cv-surface) !important;
        }
        .cv-stat-card:hover .cv-arrow {
          opacity: 1 !important;
        }

        /* Action row hover */
        .cv-action-row:hover p:first-child {
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        /* Balance value */
        .cv-balance {
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";
        }
      `}</style>

      <div className="cv-dashboard" style={{ position: "relative" }}>
        <div className="max-w-[1280px] mx-auto px-4 md:px-12 pb-24 relative z-10">

          {/* ── Masthead / Header ──────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease }}
            className="pt-24 md:pt-[120px] pb-10 mb-8 md:mb-12"
            style={{
              borderBottom: "1px solid var(--cv-border-light)",
            }}
          >
            {/* Top meta line */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "20px",
            }}>
              <p style={{
                fontSize: "9px",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "var(--cv-muted)",
                fontFamily: SERIF,
                fontStyle: "italic",
              }}>
                CipherVault · {NETWORK_CONFIG.name} · {NETWORK_CONFIG.tokenSymbol}
              </p>

              {/* Live indicator */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "9px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--cv-muted)",
                fontFamily: SERIF,
              }}>
                <span style={{
                  width: "5px", height: "5px",
                  borderRadius: "50%",
                  background: "#4ade80",
                  boxShadow: "0 0 0 2px rgba(74,222,128,0.2)",
                  display: "inline-block",
                  animation: "pulse 2s infinite",
                }} />
                Live
              </div>
            </div>

            {/* Thin rule + diamond */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--cv-border-light)" }} />
              <div style={{
                width: "5px", height: "5px",
                border: "1px solid var(--cv-border)",
                transform: "rotate(45deg)",
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, height: "1px", background: "var(--cv-border-light)" }} />
            </div>

            {/* Title + wallet */}
            <div style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}>
              <h1 style={{
                fontFamily: SERIF,
                fontSize: "clamp(42px, 6vw, 72px)",
                fontWeight: 400,
                letterSpacing: "-0.03em",
                lineHeight: 0.92,
                color: "var(--cv-fg)",
                margin: 0,
              }}>
                Portfolio<br />
                <em style={{ color: "var(--cv-muted)", fontWeight: 400 }}>Overview.</em>
              </h1>

              {/* Wallet address block */}
              <div style={{
                border: "1px solid var(--cv-border-light)",
                padding: "14px 18px",
                background: "var(--cv-surface)",
              }}
                className="w-full sm:w-auto text-left sm:text-right"
              >
                <p style={{
                  fontSize: "8px",
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "var(--cv-muted)",
                  marginBottom: "6px",
                  fontFamily: SERIF,
                }}>
                  Active Vault
                </p>
                <p style={{
                  fontFamily: MONO,
                  fontSize: "12px",
                  letterSpacing: "0.06em",
                  color: "var(--cv-fg)",
                }}>
                  {shortAddr}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={stagger.container}
            initial="initial"
            animate="animate"
          >

            {/* ── Balance Hero ──────────────────────────────────────── */}
            <motion.div
              variants={stagger.item}
              className="p-6 md:p-[40px_44px]"
              style={{
                border: "1px solid var(--cv-border-light)",
                marginBottom: "2px",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "24px",
                background: "var(--cv-card)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Subtle watermark text */}
              <span style={{
                position: "absolute",
                right: "32px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "clamp(40px, 8vw, 72px)",
                fontFamily: SERIF,
                fontStyle: "italic",
                fontWeight: 300,
                color: "var(--cv-border-light)",
                userSelect: "none",
                letterSpacing: "-0.04em",
                lineHeight: 1,
                pointerEvents: "none",
              }}>
                Balance
              </span>

              <div style={{ position: "relative" }}>
                <p style={{
                  fontSize: "9px",
                  letterSpacing: "0.26em",
                  textTransform: "uppercase",
                  color: "var(--cv-muted)",
                  marginBottom: "12px",
                  fontFamily: SERIF,
                }}>
                  Total Balance
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                  <span className="cv-balance" style={{
                    fontFamily: SERIF,
                    fontSize: "clamp(44px, 7vw, 72px)",
                    fontWeight: 400,
                    letterSpacing: "-0.035em",
                    lineHeight: 1,
                    color: "var(--cv-fg)",
                  }}>
                    {parseFloat(balance).toFixed(4)}
                  </span>
                  <span style={{
                    fontFamily: SERIF,
                    fontSize: "20px",
                    fontWeight: 400,
                    color: "var(--cv-muted)",
                    fontStyle: "italic",
                    marginBottom: "4px",
                  }}>
                    {NETWORK_CONFIG.tokenSymbol}
                  </span>
                </div>
                <p style={{
                  fontSize: "10px",
                  color: "var(--cv-muted)",
                  marginTop: "8px",
                  fontStyle: "italic",
                  fontFamily: SERIF,
                }}>
                  Available for transactions
                </p>
              </div>

              {/* Portfolio value */}
              <div
                className="w-full sm:w-auto pt-6 sm:pt-0 sm:pl-10 border-t sm:border-t-0 sm:border-l border-[var(--cv-border-light)] text-left sm:text-right"
                style={{
                  position: "relative",
                }}>
                <p style={{
                  fontSize: "9px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--cv-muted)",
                  marginBottom: "8px",
                  fontFamily: SERIF,
                }}>
                  Portfolio Listed
                </p>
                <p className="cv-balance" style={{
                  fontFamily: SERIF,
                  fontSize: "32px",
                  fontWeight: 400,
                  letterSpacing: "-0.025em",
                  color: "var(--cv-fg)",
                }}>
                  {stats.portfolioValue.toFixed(2)}
                  <span style={{ fontSize: "14px", color: "var(--cv-muted)", marginLeft: "6px", fontStyle: "italic" }}>
                    {NETWORK_CONFIG.tokenSymbol}
                  </span>
                </p>
              </div>
            </motion.div>

            {/* ── Stats Grid ───────────────────────────────────────── */}
            <div
              className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
              style={{
                gap: "2px",
                marginBottom: "48px",
                marginTop: "2px",
              }}>
              <StatCard label="Total Assets" value={stats.totalItems} roman="I"
                onClick={() => router.push("/vault")} />
              <StatCard label="In Vault" value={stats.myItems} roman="II"
                onClick={() => router.push("/vault")} />
              <StatCard label="Listed" value={stats.listed} roman="III"
                sub={`${stats.portfolioValue.toFixed(2)} ${NETWORK_CONFIG.tokenSymbol}`}
                onClick={() => router.push("/market")} />
              <StatCard label="Escrow Active" value={stats.escrowPending} roman="IV"
                onClick={() => router.push("/vault")} />
              <StatCard label="Contacts" value={contacts.length} roman="V" />
              <StatCard label="Activities" value={activities.length} roman="VI" />
            </div>

            {/* ── Two-Column ───────────────────────────────────────── */}
            <div
              className="grid grid-cols-1 lg:grid-cols-2"
              style={{
                gap: "48px",
                alignItems: "start",
              }}>

              {/* Activity Feed */}
              <div>
                {/* Section header */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  marginBottom: "20px",
                }}>
                  <div style={{ width: "24px", height: "1px", background: "var(--cv-fg)" }} />
                  <p style={{
                    fontSize: "9px",
                    letterSpacing: "0.26em",
                    textTransform: "uppercase",
                    color: "var(--cv-muted)",
                    fontFamily: SERIF,
                  }}>
                    Recent Activity
                  </p>
                </div>

                {activities.length === 0 ? (
                  <div style={{
                    padding: "48px 24px",
                    border: "1px solid var(--cv-border-light)",
                    textAlign: "center",
                  }}>
                    <p style={{
                      fontSize: "13px",
                      fontStyle: "italic",
                      color: "var(--cv-muted)",
                      fontFamily: SERIF,
                    }}>
                      No activity recorded yet.
                    </p>
                  </div>
                ) : (
                  <div style={{ borderTop: "1px solid var(--cv-border-light)" }}>
                    {activities.map((a, i) => (
                      <ActivityEntry
                        key={a.id}
                        title={a.title}
                        description={a.description}
                        timestamp={a.timestamp}
                        index={i}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions + Market Snapshot */}
              <div>
                {/* Section header */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  marginBottom: "20px",
                }}>
                  <div style={{ width: "24px", height: "1px", background: "var(--cv-fg)" }} />
                  <p style={{
                    fontSize: "9px",
                    letterSpacing: "0.26em",
                    textTransform: "uppercase",
                    color: "var(--cv-muted)",
                    fontFamily: SERIF,
                  }}>
                    Operations
                  </p>
                </div>

                <div style={{ borderTop: "1px solid var(--cv-border-light)" }}>
                  <ActionRow
                    label="Upload & Encrypt File"
                    description="Store encrypted asset to vault"
                    numeral="01"
                    onClick={() => router.push("/vault")}
                  />
                  <ActionRow
                    label="List Asset for Sale"
                    description="Place asset on marketplace"
                    numeral="02"
                    onClick={() => router.push("/market")}
                  />
                  <ActionRow
                    label="Send Encrypted Message"
                    description="Encrypted chat to any wallet"
                    numeral="03"
                    onClick={() => router.push("/messages")}
                  />
                  <ActionRow
                    label="View Full Portfolio"
                    description={`${stats.listed} listed · ${stats.portfolioValue.toFixed(2)} ${NETWORK_CONFIG.tokenSymbol}`}
                    numeral="04"
                    onClick={() => router.push("/vault")}
                  />
                </div>

                {/* Market snapshot — editorial infobox */}
                <div style={{
                  marginTop: "32px",
                  padding: "24px 26px",
                  background: "var(--cv-surface)",
                  border: "1px solid var(--cv-border-light)",
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "16px",
                  }}>
                    <span style={{
                      width: "5px", height: "5px",
                      borderRadius: "50%",
                      background: "#4ade80",
                      flexShrink: 0,
                      boxShadow: "0 0 0 2px rgba(74,222,128,0.2)",
                    }} />
                    <p style={{
                      fontSize: "8px",
                      letterSpacing: "0.26em",
                      textTransform: "uppercase",
                      color: "var(--cv-muted)",
                      fontFamily: SERIF,
                    }}>
                      Market · Live
                    </p>
                  </div>

                  <div style={{ height: "1px", background: "var(--cv-border-light)", marginBottom: "16px" }} />

                  {[
                    { label: "Total Listings", value: `${marketItems.length} assets` },
                    { label: "Refresh Interval", value: "Every 4s" },
                    { label: "Network", value: NETWORK_CONFIG.name },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: "10px",
                    }}>
                      <span style={{
                        fontSize: "10px",
                        color: "var(--cv-muted)",
                        fontFamily: SERIF,
                        fontStyle: "italic",
                      }}>
                        {label}
                      </span>
                      <span style={{
                        fontSize: "12px",
                        fontFamily: SERIF,
                        fontWeight: 500,
                        color: "var(--cv-fg)",
                        letterSpacing: "0.01em",
                      }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Footer colophon ──────────────────────────────────── */}
            <motion.div
              variants={stagger.item}
              style={{
                marginTop: "64px",
                paddingTop: "20px",
                borderTop: "1px solid var(--cv-border-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <p style={{
                fontSize: "9px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--cv-muted)",
                fontFamily: SERIF,
              }}>
                CipherVault · Non-custodial · End-to-end encrypted
              </p>
              <p style={{
                fontSize: "9px",
                letterSpacing: "0.14em",
                color: "var(--cv-muted)",
                fontFamily: SERIF,
                fontStyle: "italic",
              }}>
                {new Date().getFullYear()}
              </p>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}