import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Contact {
  id: string;
  name: string;
  address: string;
  note?: string;
  emoji?: string;
  addedAt: number;
}

interface ContactsState {
  contacts: Contact[];
  addContact: (contact: Omit<Contact, "id" | "addedAt">) => void;
  updateContact: (id: string, updates: Partial<Omit<Contact, "id">>) => void;
  removeContact: (id: string) => void;
  getByAddress: (address: string) => Contact | undefined;
  search: (query: string) => Contact[];
}

const EMOJIS = ["🦊", "🐺", "🦁", "🐯", "🦅", "🦋", "🐉", "🌙", "⚡", "🔮", "🎯", "🛡️"];

export const useContactsStore = create<ContactsState>()(
  persist(
    (set, get) => ({
      contacts: [],

      addContact: (contact) => {
        const existing = get().contacts.find(
          (c) => c.address.toLowerCase() === contact.address.toLowerCase()
        );
        if (existing) return; // no duplicates

        const newContact: Contact = {
          ...contact,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          emoji: contact.emoji || EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
          addedAt: Date.now(),
        };
        set((state) => ({ contacts: [newContact, ...state.contacts] }));
      },

      updateContact: (id, updates) => {
        set((state) => ({
          contacts: state.contacts.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      removeContact: (id) => {
        set((state) => ({
          contacts: state.contacts.filter((c) => c.id !== id),
        }));
      },

      getByAddress: (address) => {
        return get().contacts.find(
          (c) => c.address.toLowerCase() === address.toLowerCase()
        );
      },

      search: (query) => {
        const q = query.toLowerCase();
        return get().contacts.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.address.toLowerCase().includes(q) ||
            c.note?.toLowerCase().includes(q)
        );
      },
    }),
    {
      name: "ciphervault-contacts",
      partialize: (state) => ({ contacts: state.contacts }),
    }
  )
);