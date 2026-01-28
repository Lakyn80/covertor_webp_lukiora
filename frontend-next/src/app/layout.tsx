import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DEFAULT_KEYWORDS, FALLBACK_TEXTS } from "@/translations";

const metadataBase = new URL("https://convertor.lukiora.com");
const siteUrl = metadataBase.toString().replace(/\/$/, "");
const defaultLang = process.env.NEXT_PUBLIC_DEFAULT_LANG || "en";
const title = FALLBACK_TEXTS.seoTitle || FALLBACK_TEXTS.heroTitle;
const description = FALLBACK_TEXTS.seoDescription || FALLBACK_TEXTS.subtitle;
const rawKeywords = FALLBACK_TEXTS.seoKeywords;
const keywords = Array.isArray(rawKeywords)
  ? rawKeywords.join(", ")
  : (typeof rawKeywords === "string" && rawKeywords.trim() ? rawKeywords : DEFAULT_KEYWORDS);
const siteName = FALLBACK_TEXTS.seoTitle || FALLBACK_TEXTS.heroTitle || "Webpify Batch";
const ogImage = new URL("/opengraph-image", siteUrl);
const twitterImage = new URL("/twitter-image", siteUrl);
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "";
const twitterHandle = process.env.NEXT_PUBLIC_TWITTER_HANDLE || "";

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: title,
    template: `%s | ${siteName}`,
  },
  description,
  keywords,
  applicationName: siteName,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title,
    description,
    url: "/",
    type: "website",
    siteName,
    locale: defaultLang,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [twitterImage],
    site: twitterHandle || undefined,
    creator: twitterHandle || undefined,
  },
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
  verification: googleVerification ? { google: googleVerification } : undefined,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1024",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={defaultLang}>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
