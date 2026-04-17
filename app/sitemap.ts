import type { MetadataRoute } from "next";
import convenienceJson from "@/data/convenience.json";
import telecomJson from "@/data/telecom.json";
import type { Deal } from "@/types/deal";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://today-deals-ochre.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/convenience`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/oliveyoung`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/gas`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  const dealPages: MetadataRoute.Sitemap = [
    ...(telecomJson.deals as unknown as Deal[]).map((d) => ({
      url: `${BASE_URL}/deals/${d.id}`,
      lastModified: new Date(telecomJson.updatedAt),
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...(convenienceJson.deals as unknown as Deal[]).map((d) => ({
      url: `${BASE_URL}/deals/${d.id}`,
      lastModified: new Date(convenienceJson.updatedAt),
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];

  return [...staticPages, ...dealPages];
}
