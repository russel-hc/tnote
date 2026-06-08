import { atom } from "jotai";
import type { Exam } from "../(hooks)/useExams";

export const showCreateModalAtom = atom(false);
export const showEditModalAtom = atom(false);
export const showScoreModalAtom = atom(false);

export const selectedExamAtom = atom<Exam | null>(null);
export const scoreExamAtom = atom<Exam | null>(null);
