import { create } from 'zustand';
import type { StudyBlock } from '../types';
import { getWeekStart } from '../utils/time';

interface PlannerState {
  draftBlocks: StudyBlock[];
  isDirty: boolean;
  currentWeekStart: Date;
}

interface PlannerActions {
  initDraft: (blocks: StudyBlock[]) => void;
  addBlock: (block: StudyBlock) => void;
  updateBlock: (block: StudyBlock) => void;
  removeBlock: (id: string) => void;
  setWeek: (date: Date) => void;
}

export const usePlannerStore = create<PlannerState & PlannerActions>((set) => ({
  draftBlocks: [],
  isDirty: false,
  currentWeekStart: getWeekStart(new Date()),

  initDraft: (blocks) =>
    set({
      draftBlocks: blocks ?? [],
      isDirty: false,
    }),

  addBlock: (block) =>
    set((state) => ({
      draftBlocks: [...state.draftBlocks, block],
      isDirty: true,
    })),

  updateBlock: (block) =>
    set((state) => ({
      draftBlocks: state.draftBlocks.map((b) => (b.id === block.id ? block : b)),
      isDirty: true,
    })),

  removeBlock: (id) =>
    set((state) => ({
      draftBlocks: state.draftBlocks.filter((b) => b.id !== id),
      isDirty: true,
    })),

  setWeek: (date) =>
    set({
      currentWeekStart: getWeekStart(date),
    }),
}));