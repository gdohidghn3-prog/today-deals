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
    ],
  },
};

export default nextConfig;
