import { atom } from "jotai";
import type { Admin } from "@/shared/types";

export type { Admin };

export const openMenuIdAtom = atom<string | null>(null);
