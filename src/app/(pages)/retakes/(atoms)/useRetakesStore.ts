import { atom } from "jotai";
import { createWorkflowFilterAtoms } from "@/shared/lib/workflow";
import type { Retake } from "@/shared/types";

export type { Exam, Retake, RetakeHistory as History } from "@/shared/types";

export interface AssignStudent {
  id: string;
  phone_number: string;
  name: string;
  school: string;
  tags?: import("@/shared/types").StudentTagAssignment[];
}

const {
  selectedCourseAtom,
  selectedManagementStatusAtom,
  openMenuIdAtom,
  searchQueryAtom,
  showCompletedAtom,
  selectedDateAtom,
  minIncompleteCountAtom,
  minPostponeCountAtom,
  minAbsentCountAtom,
  minPostponeAbsentCountAtom,
} = createWorkflowFilterAtoms();

export {
  selectedCourseAtom,
  selectedManagementStatusAtom,
  openMenuIdAtom,
  searchQueryAtom,
  showCompletedAtom,
  selectedDateAtom,
  minIncompleteCountAtom,
  minPostponeCountAtom,
  minAbsentCountAtom,
  minPostponeAbsentCountAtom,
};

export const filterAtom = atom<"all" | "pending" | "completed" | "absent">("all");
export const selectedExamAtom = atom<string>("all");
export const selectedRetakeAtom = atom<Retake | null>(null);
export const minTotalRetakeCountAtom = atom<number>(0);
