// src/stores/ui.store.ts
import { defineStore } from "pinia";

interface UiState {
  loadingCount: number;
}

export const useUiStore = defineStore("ui", {
  state: (): UiState => ({
    loadingCount: 0,
  }),
  getters: {
    isLoading: (state): boolean => state.loadingCount > 0,
  },
  actions: {
    startLoading() {
      this.loadingCount++;
    },
    stopLoading() {
      if (this.loadingCount > 0) {
        this.loadingCount--;
      }
    },
  },
});
