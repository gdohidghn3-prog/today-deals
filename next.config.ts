import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // 편의점
      { protocol: "https", hostname: "image.7-eleven.co.kr" },
      { protocol: "https", hostname: "www.7-eleven.co.kr" },
      { protocol: "https", hostname: "www.emart24.co.kr" },
      { protocol: "https", hostname: "img.emart24.co.kr" },
      { protocol: "https", hostname: "cu.bgfretail.com" },
      { protocol: "http", hostname: "gs25.gsretail.com" },
      { protocol: "https", hostname: "gs25.gsretail.com" },
      // 올리브영
      { protocol: "https", hostname: "image.oliveyoung.co.kr" },
      // 통신사
      { protocol: "https", hostname: "sktmembership.tworld.co.kr" },
      { protocol: "https", hostname: "membership.kt.com" },
      { protocol: "https", hostname: "www.lguplus.com" },
      // 쿠팡 CDN (파트너스 제휴 링크 이미지)
      { protocol: "https", hostname: "thumbnail1.coupangcdn.com" },
      { protocol: "https", hostname: "thumbnail2.coupangcdn.com" },
      { protocol: "https", hostname: "thumbnail3.coupangcdn.com" },
      { protocol: "https", hostname: "thumbnail4.coupangcdn.com" },
      { protocol: "https", hostname: "thumbnail5.coupangcdn.com" },
      { protocol: "https", hostname: "thumbnail6.coupangcdn.com" },
      { protocol: "https", hostname: "thumbnail7.coupangcdn.com" },
      { protocol: "https", hostname: "thumbnail8.coupangcdn.com" },
      { protocol: "https", hostname: "thumbnail9.coupangcdn.com" },
      { protocol: "https", hostname: "thumbnail10.coupangcdn.com" },
      { protocol: "https", hostname: "image1.coupangcdn.com" },
      { protocol: "https", hostname: "image2.coupangcdn.com" },
      { protocol: "https", hostname: "static.coupangcdn.com" },
      // 문화행사
      { protocol: "https", hostname: "culture.seoul.go.kr" },
      { protocol: "http", hostname: "tong.visitkorea.or.kr" },
      { protocol: "https", hostname: "tong.visitkorea.or.kr" },
    ],
  },
};

export default nextConfig;
