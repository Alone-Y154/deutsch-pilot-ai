import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}
