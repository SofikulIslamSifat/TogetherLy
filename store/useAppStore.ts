import { create } from 'zustand';

type Appearance = 'light' | 'dark' | 'system';
type AppState = {
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
};

// Kept intentionally small; server data belongs in TanStack Query, not Zustand.
export const useAppStore = create<AppState>((set) => ({
  appearance: 'light',
  setAppearance: (appearance) => set({ appearance }),
}));
