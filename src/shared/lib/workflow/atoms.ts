import { atom } from "jotai";

export const createWorkflowModalAtoms = () => ({
  showPostponeModalAtom: atom(false),
  showCompleteModalAtom: atom(false),
  showHistoryModalAtom: atom(false),
  showStudentModalAtom: atom(false),
  showAssignModalAtom: atom(false),
  showManagementStatusModalAtom: atom(false),
  showEditDateModalAtom: atom(false),
  showManagementStatusSettingsModalAtom: atom(false),
  selectedStudentIdAtom: atom<string | null>(null),
});

export const createWorkflowFormAtoms = () => ({
  postponeDateAtom: atom(""),
  postponeNoteAtom: atom(""),
  completeNoteAtom: atom(""),
  editDateAtom: atom(""),
});

export const createWorkflowFilterAtoms = () => ({
  selectedCourseAtom: atom<string>("all"),
  selectedManagementStatusAtom: atom<string>("all"),
  openMenuIdAtom: atom<string | null>(null),
  searchQueryAtom: atom(""),
  showCompletedAtom: atom(false),
  selectedDateAtom: atom<string>("all"),
  minIncompleteCountAtom: atom(0),
  minPostponeCountAtom: atom(0),
  minAbsentCountAtom: atom(0),
  minPostponeAbsentCountAtom: atom(0),
});
