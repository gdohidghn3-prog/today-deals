/**
 * Type declarations for oliveyoung-shared.mjs
 * 단일 소스 모듈을 TypeScript에서 안전하게 import하기 위한 선언.
 */

export interface OliveYoungItem {
  id: string;
  rank: number;
  brand: string;
  name: string;
  salePrice: number | null;
  origPrice: number | null;
  discountRate: number | null;
  imageUrl: string;
  link: string;
  flags: string[];
}

export interface BrowserHeadersOpts {
  mobile?: boolean;
}

export const HOME_URL: string;
export const PAGE_SIZE: number;
export const DISP_CAT: string;
export const MIN_THRESHOLD: number;
export const MAX_PAGES_BATCH: number;
export const MAX_PAGES_RUNTIME: number;

export function getBestUrl(pageIdx: number): string;
export function buildBrowserHeaders(
  opts?: BrowserHeadersOpts
): Record<string, string>;
export function extractCookies(res: Response): string;
export function parseListHtml(
  html: string,
  startRank?: number
): OliveYoungItem[];
export function dedupeItems(items: OliveYoungItem[]): OliveYoungItem[];
export function curlFetch(
  url: string,
  headers?: Record<string, string>
): Promise<{ status: number; body: string }>;
