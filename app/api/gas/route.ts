import { NextRequest, NextResponse } from "next/server";

// 서버 전용 프록시. 오피넷 API 키는 절대 클라이언트에 노출되지 않음.
// 6시간 ISR 캐시 (유가 데이터는 하루 1회 정도 변동)

export const revalidate = 21600;

const OPINET_BASE = "https://www.opinet.co.kr/api";
const API_KEY = process.env.OPINET_API_KEY;

// 유종 코드 화이트리스트
const ALLOWED_PRODCD = new Set(["B027", "B034", "D047", "C004", "K015"]);
// 시도 코드 화이트리스트
const ALLOWED_SIDO = new Set([
  "01", "02", "03", "04", "05", "06", "07", "08", "09",
  "10", "11", "14", "15", "16", "17", "18", "19",
]);
// 액션 화이트리스트
const ALLOWED_ACTIONS = new Set(["avg", "sido", "top10", "around"]);

type OpinetResponse = { RESULT?: { OIL?: unknown[] } };

async function fetchOpinet(path: string, params: Record<string, string>) {
  const q = new URLSearchParams({ ...params, code: API_KEY!, out: "json" });
  const url = `${OPINET_BASE}/${path}?${q.toString()}`;
  const res = await fetch(url, {
    next: { revalidate: 21600 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`opinet ${path} ${res.status}`);
  // 오피넷 응답은 JSON이지만 공백/개행이 많음 - 그대로 파싱
  const text = await res.text();
  const data = JSON.parse(text) as OpinetResponse;
  return data?.RESULT?.OIL ?? [];
}

// WGS84 (lat/lng) → KATEC 변환 (카카오 좌표변환 API 활용)
async function wgs84ToKatec(
  lng: number,
  lat: number
): Promise<{ x: number; y: number } | null> {
  const kakaoKey = process.env.KAKAO_REST_API_KEY;
  if (!kakaoKey) return null;
  const url = `https://dapi.kakao.com/v2/local/geo/transcoord.json?x=${lng}&y=${lat}&input_coord=WGS84&output_coord=KTM`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${kakaoKey}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { documents?: { x: number; y: number }[] };
  const doc = data.documents?.[0];
  if (!doc) return null;
  // Kakao의 "KTM" 출력이 오피넷이 사용하는 KATEC 좌표계와 동일 (x=300k~, y=540k~ 수준)
  return { x: doc.x, y: doc.y };
}

export async function GET(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "OPINET_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const action = sp.get("action") ?? "avg";
  const prodcd = sp.get("prodcd") ?? "B027";

  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }
  if (!ALLOWED_PRODCD.has(prodcd)) {
    return NextResponse.json({ error: "invalid prodcd" }, { status: 400 });
  }

  try {
    if (action === "avg") {
      const data = await fetchOpinet("avgAllPrice.do", {});
      return NextResponse.json({ data, updatedAt: new Date().toISOString() });
    }

    if (action === "sido") {
      const data = await fetchOpinet("avgSidoPrice.do", { prodcd });
      return NextResponse.json({ data, updatedAt: new Date().toISOString() });
    }

    if (action === "top10") {
      const area = sp.get("area") ?? "01";
      if (!ALLOWED_SIDO.has(area)) {
        return NextResponse.json({ error: "invalid area" }, { status: 400 });
      }
      const data = await fetchOpinet("lowTop10.do", { prodcd, area });
      return NextResponse.json({ data, updatedAt: new Date().toISOString() });
    }

    if (action === "around") {
      const lng = parseFloat(sp.get("x") ?? "");
      const lat = parseFloat(sp.get("y") ?? "");
      const radius = Math.min(
        Math.max(parseInt(sp.get("radius") ?? "5000", 10) || 5000, 500),
        10000
      );
      if (!isFinite(lng) || !isFinite(lat)) {
        return NextResponse.json(
          { error: "invalid coordinates" },
          { status: 400 }
        );
      }
      const katec = await wgs84ToKatec(lng, lat);
      if (!katec) {
        return NextResponse.json(
          { error: "coordinate conversion failed" },
          { status: 502 }
        );
      }
      const data = await fetchOpinet("aroundAll.do", {
        x: String(katec.x),
        y: String(katec.y),
        radius: String(radius),
        prodcd,
        sort: "1", // 가격순
      });
      return NextResponse.json({
        data,
        origin: { lng, lat, katec, radius },
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "unhandled action" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error("[gas api]", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
