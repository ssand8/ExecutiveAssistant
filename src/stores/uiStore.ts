import { create } from 'zustand';

interface UIState {
  // Active task for quick-action sheet
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTaskId: null,
  setActiveTaskId: (activeTaskId) => set({ activeTaskId }),
}));
