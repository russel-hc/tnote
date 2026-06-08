import { atom } from "jotai";
import { createWorkflowFormAtoms } from "@/shared/lib/workflow";

const { postponeDateAtom, postponeNoteAtom, completeNoteAtom, editDateAtom } = createWorkflowFormAtoms();

export { postponeDateAtom, postponeNoteAtom, completeNoteAtom, editDateAtom };

export const absentNoteAtom = atom("");
