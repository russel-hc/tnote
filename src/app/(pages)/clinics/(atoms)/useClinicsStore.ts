import { atom } from "jotai";
import type { Clinic } from "@/shared/types";

export type { AttendanceRecord, Clinic } from "@/shared/types";

export const selectedClinicAtom = atom<Clinic | null>(null);
export const openMenuIdAtom = atom<string | null>(null);
export const showEndedClinicsAtom = atom<boolean>(false);
