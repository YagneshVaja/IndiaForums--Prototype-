import { create } from 'zustand';

interface Story { id: number; [key: string]: unknown; }

interface UIStore {
  activeStories: Story[];
  setActiveStories: (stories: Story[]) => void;
  clearActiveStories: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeStories: [],
  setActiveStories: (stories) => set({ activeStories: stories }),
  clearActiveStories: () => set({ activeStories: [] }),
}));
