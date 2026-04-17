import { readFileSync, appendFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HISTORY_DIR = join(__dirname, "..", "..", "history");
const HISTORY_FILE = join(HISTORY_DIR, "deals.jsonl");

/**
 * 이전 JSON과 현재 JSON 비교 → appeared/disappeared 기록
 * @param {string} dataFile - data/*.json 파일 경로
 * @param {object[]} currentDeals - 현재 크롤 결과
 * @param {string} source - "telecom" | "convenience" 등
 */
export function trackHistory(dataFile, currentDeals, source) {
  if (!existsSync(HISTORY_DIR)) mkdirSync(HISTORY_DIR, { recursive: true });

  // 이전 데이터 로드
  let prevDeals = [];
  try {
    const prev = JSON.parse(readFileSync(dataFile, "utf-8"));
    prevDeals = prev.deals || prev.items || [];
  } catch {
    console.log(`[History] 이전 데이터 없음 (${dataFile}) — 스킵`);
    return;
  }

  const prevIds = new Set(prevDeals.map(d => d.id));
  const curIds = new Set(currentDeals.map(d => d.id));
  const today = new Date().toISOString().slice(0, 10);
  const lines = [];

  // 신규 등장
  for (const deal of currentDeals) {
    if (!prevIds.has(deal.id)) {
      lines.push(JSON.stringify({
        id: deal.id,
        event: "appeared",
        date: today,
        source: deal.source || source,
        title: deal.title || deal.name || "",
        discount: deal.discount || "",
      }));
    }
  }

  // 사라진 상품
  for (const deal of prevDeals) {
    if (!curIds.has(deal.id)) {
      lines.push(JSON.stringify({
        id: deal.id,
        event: "disappeared",
        date: today,
        source: deal.source || source,
        title: deal.title || deal.name || "",
        discount: deal.discount || "",
      }));
    }
  }

  if (lines.length > 0) {
    appendFileSync(HISTORY_FILE, lines.join("\n") + "\n", "utf-8");
    console.log(`[History] ${lines.length}건 기록 (appeared: ${lines.filter(l => l.includes('"appeared"')).length}, disappeared: ${lines.filter(l => l.includes('"disappeared"')).length})`);
  } else {
    console.log("[History] 변동 없음");
  }
}
