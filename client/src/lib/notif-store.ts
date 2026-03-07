import { create } from "zustand";

export type NotifType = "success" | "error" | "warning" | "info" | "trade" | "message";

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  action?: { label: string; href: string };
}

interface NotifState {
  notifications: Notification[];
  unreadCount: number;
  push: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useNotifStore = create<NotifState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  push: (n) => {
    const notif: Notification = {
      ...n,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      read: false,
    };
    set((s) => ({
      notifications: [notif, ...s.notifications].slice(0, 50),
      unreadCount: s.unreadCount + 1,
    }));
  },

  markRead: (id) => {
    set((s) => {
      const notifs = s.notifications.map((n) => n.id === id && !n.read ? { ...n, read: true } : n);
      return { notifications: notifs, unreadCount: Math.max(0, s.unreadCount - 1) };
    });
  },

  markAllRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  dismiss: (id) => {
    set((s) => {
      const notif = s.notifications.find((n) => n.id === id);
      return {
        notifications: s.notifications.filter((n) => n.id !== id),
        unreadCount: notif && !notif.read ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
      };
    });
  },

  clear: () => set({ notifications: [], unreadCount: 0 }),
}));

// ── Convenience helpers ───────────────────────────────────────
export const notify = {
  success: (title: string, body: string, action?: Notification["action"]) =>
    useNotifStore.getState().push({ type: "success", title, body, action }),
  error: (title: string, body: string) =>
    useNotifStore.getState().push({ type: "error", title, body }),
  warning: (title: string, body: string) =>
    useNotifStore.getState().push({ type: "warning", title, body }),
  info: (title: string, body: string, action?: Notification["action"]) =>
    useNotifStore.getState().push({ type: "info", title, body, action }),
  trade: (title: string, body: string, action?: Notification["action"]) =>
    useNotifStore.getState().push({ type: "trade", title, body, action }),
  message: (title: string, body: string, action?: Notification["action"]) =>
    useNotifStore.getState().push({ type: "message", title, body, action }),
};