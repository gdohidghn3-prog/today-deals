import { NextRequest, NextResponse } from "next/server";
import type { DealSource } from "@/types/deal";

const KAKAO_KEY = process.env.KAKAO_REST_API_KEY ?? "";

// 카카오 place_name → 브랜드 매칭
const BRAND_PATTERNS: Record<string, RegExp> = {
  cu: /(^|\s)CU(\s|$|점)/i,
  gs25: /GS25/i,
  seven: /(세븐일레븐|7-?eleven|7-?일레븐)/i,
  emart24: /(이마트24|emart\s*24)/i,
};

interface KakaoPlace {
  id: string;
  place_name: string;
  road_address_name?: string;
  address_name?: string;
  phone?: string;
  x: string; // longitude
  y: string; // latitude
  distance: string;
  place_url?: string;
}

interface NearbyStore {
  id: string;
  name: string;
  brand: DealSource;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  distance: number; // m
  placeUrl: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const x = searchParams.get("x") || ""; // longitude
  const y = searchParams.get("y") || ""; // latitude
  const radius = searchParams.get("radius") || "1000"; // 기본 1km
  const brand = searchParams.get("brand") || ""; // 선택적: cu/gs25/seven/emart24

  if (!x || !y) {
    return NextResponse.json(
      { error: "x(경도), y(위도) 필요", stores: [] },
      { status: 400 }
    );
  }

  if (!KAKAO_KEY) {
    return NextResponse.json(
      {
        error: "카카오 API 키 미설정 (KAKAO_REST_API_KEY)",
        stores: [],
      },
      { status: 500 }
    );
  }

  const headers = { Authorization: `KakaoAK ${KAKAO_KEY}` };
  const allPlaces: KakaoPlace[] = [];
  const seen = new Set<string>();
  let kakaoError: string | null = null;

  // CS2 = 편의점 카테고리. 페이지네이션
  for (let page = 1; page <= 3; page++) {
    try {
      const params = new URLSearchParams({
        category_group_code: "CS2",
        x,
        y,
        radius,
        sort: "distance",
        size: "15",
        page: String(page),
      });

      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/category.json?${params}`,
        { headers, cache: "no-store" }
      );

      if (!res.ok) {
        // 카카오 에러 메시지 추출 (디버깅용)
        const errText = await res.text().catch(() => "");
        kakaoError = `Kakao ${res.status}: ${errText.slice(0, 200)}`;
        console.error("[nearby-stores]", kakaoError);
        break;
      }
      const data = await res.json();

      for (const doc of (data.documents as KakaoPlace[]) || []) {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          allPlaces.push(doc);
        }
      }

      if (data.meta?.is_end) break;
    } catch (e) {
      kakaoError = `fetch failed: ${(e as Error).message}`;
      console.error("[nearby-stores]", kakaoError);
      break;
    }
  }

  // 카카오 호출이 한 건도 성공하지 못했으면 명시적 에러 반환
  if (allPlaces.length === 0 && kakaoError) {
    return NextResponse.json(
      { error: kakaoError, stores: [] },
      { status: 502 }
    );
  }

  // 브랜드 매칭 + 변환
  const stores: NearbyStore[] = [];
  for (const p of allPlaces) {
    let matched: DealSource | null = null;
    for (const [b, pattern] of Object.entries(BRAND_PATTERNS)) {
      if (pattern.test(p.place_name)) {
        matched = b as DealSource;
        break;
      }
    }
    if (!matched) continue; // 미니스톱 등 제외
    if (brand && matched !== brand) continue;

    stores.push({
      id: p.id,
      name: p.place_name,
      brand: matched,
      address: p.road_address_name || p.address_name || "",
      phone: p.phone || "",
      lat: Number(p.y),
      lng: Number(p.x),
      distance: Number(p.distance) || 0,
      placeUrl: p.place_url || "",
    });
  }

  // 거리순
  stores.sort((a, b) => a.distance - b.distance);

  return NextResponse.json({
    count: stores.length,
    stores: stores.slice(0, 30),
  });
}
