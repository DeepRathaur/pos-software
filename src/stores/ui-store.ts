import { create } from "zustand";

type UiState = {
  /** Reserved for future drawer / sheet menu */
  menuOpen: boolean;
  modal: string | null;
  setMenuOpen: (v: boolean) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  menuOpen: false,
  modal: null,
  setMenuOpen: (v) => set({ menuOpen: v }),
  openModal: (id) => set({ modal: id }),
  closeModal: () => set({ modal: null }),
}));
