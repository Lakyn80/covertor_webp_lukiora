import type { MetadataRoute } from "next";
import { FALLBACK_TEXTS } from "@/language/translations";

const title = FALLBACK_TEXTS.seoTitle || FALLBACK_TEXTS.heroTitle;
const description = FALLBACK_TEXTS.seoDescription || FALLBACK_TEXTS.subtitle;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: title,
    short_name: "Webpify",
    description,
    start_url: "/",
    display: "standalone",
    background_color: "#0b1024",
    theme_color: "#0b1024",
    icons: [
      {
        src: "/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
      {
        src: "/favicon.ico",
        sizes: "16x16 32x32 48x48 64x64 128x128 256x256",
        type: "image/x-icon",
      },
    ],
  };
}
