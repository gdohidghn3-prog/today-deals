/**
 * Type declarations for helpers.mjs
 */

export type CoordSource = "katec" | "katec_low" | "none";

export function isLowPrecisionKatec(x: number, y: number): boolean;

export function classifyCoordSource(
  x: number,
  y: number,
  wgs: { lat: number; lng: number } | null
): CoordSource;
