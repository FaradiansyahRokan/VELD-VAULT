import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActivityType =
  | "upload"
  | "list"
  | "delist"
  | "buy"
  | "sell"
  | "transfer_in"
  | "transfer_out"
  | "escrow_start"
  | "escrow_confirm"
  | "escrow_cancel"
  | "message_sent"
  | "message_received"
  | "sign"
  | "burn"
  | "faucet";

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: number;
  txHash?: string;
  tokenId?: number;
  amount?: string;
  address?: string;
  walletAddress: string; // owner of this activity
}

interface ActivityState {
  activities: Activity[];
  addActivity: (activity: Omit<Activity, "id" | "timestamp">) => void;
  clearActivities: (walletAddress: string) => void;
  getActivities: (walletAddress: string) => Activity[];
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      activities: [],

      addActivity: (activity) => {
        const newActivity: Activity = {
          ...activity,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
        };
        set((state) => ({
          activities: [newActivity, ...state.activities].slice(0, 200), // keep last 200
        }));
      },

      clearActivities: (walletAddress) => {
        set((state) => ({
          activities: state.activities.filter(
            (a) => a.walletAddress !== walletAddress
          ),
        }));
      },

      getActivities: (walletAddress) => {
        return get()
          .activities.filter((a) => a.walletAddress === walletAddress)
          .sort((a, b) => b.timestamp - a.timestamp);
      },
    }),
    {
      name: "ciphervault-activity",
      partialize: (state) => ({ activities: state.activities }),
    }
  )
);

// ── Helpers ───────────────────────────────────────────────────
export const ACTIVITY_META: Record<
  ActivityType,
  { emoji: string; color: string }
> = {
  upload:          { emoji: "⬆️", color: "text-blue-400" },
  list:            { emoji: "🏷️", color: "text-amber-400" },
  delist:          { emoji: "✖️", color: "text-muted-foreground" },
  buy:             { emoji: "🛒", color: "text-emerald-400" },
  sell:            { emoji: "💰", color: "text-emerald-400" },
  transfer_in:     { emoji: "📥", color: "text-indigo-400" },
  transfer_out:    { emoji: "📤", color: "text-indigo-400" },
  escrow_start:    { emoji: "🔒", color: "text-amber-400" },
  escrow_confirm:  { emoji: "✅", color: "text-emerald-400" },
  escrow_cancel:   { emoji: "↩️", color: "text-red-400" },
  message_sent:    { emoji: "✉️", color: "text-blue-400" },
  message_received:{ emoji: "📨", color: "text-blue-400" },
  sign:            { emoji: "✍️", color: "text-violet-400" },
  burn:            { emoji: "🔥", color: "text-red-400" },
  faucet:          { emoji: "⚡", color: "text-amber-400" },
};