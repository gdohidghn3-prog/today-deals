/**
 * 오늘의 BEST 자동 선정 — 각 크롤러에서 호출
 */

export function scoreTelecom(deal) {
  const pctMatch = deal.discount.match(/(\d+)%/);
  const pct = pctMatch ? parseInt(pctMatch[1]) : 0;
  const popular = ["스타벅스", "배스킨라빈스", "CGV", "버거킹", "맥도날드", "파리바게뜨", "메가커피"];
  const bonus = popular.some(b => deal.brand.includes(b)) ? 20 : 0;
  const freeBonus = deal.discount === "무료" ? 30 : 0;
  return pct + bonus + freeBonus;
}

export function scoreConvenience(deal) {
  const type = deal.discount === "1+1" ? 50 : deal.discount === "2+1" ? 30 : 10;
  const price = parseInt(String(deal.price || "0").replace(/[^0-9]/g, "")) || 0;
  return type + price / 100;
}

export function pickBest(deals, scoreFn, count = 3) {
  return deals
    .map(d => ({ id: d.id, score: scoreFn(d) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(d => d.id);
}
