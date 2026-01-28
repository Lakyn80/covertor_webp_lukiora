import type { MetadataRoute } from "next";

const siteUrl = "https://convertor.lukiora.com";
const formats = ["jpg", "png", "heic", "webp"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/pricing`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  formats.forEach((format) => {
    entries.push({
      url: `${siteUrl}/convert/${format}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  });

  return entries;
}
