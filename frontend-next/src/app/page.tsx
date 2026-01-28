import Webpify from "@/components/Webpify";
import { FALLBACK_TEXTS } from "@/language/translations";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
const defaultLang = process.env.NEXT_PUBLIC_DEFAULT_LANG || "en";

export default function Home() {
  const title = FALLBACK_TEXTS.seoTitle || FALLBACK_TEXTS.heroTitle;
  const description = FALLBACK_TEXTS.seoDescription || FALLBACK_TEXTS.subtitle;

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: title,
      description,
      url: siteUrl,
      inLanguage: defaultLang,
      image: `${siteUrl}/opengraph-image`,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: title,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      description,
      url: siteUrl,
      inLanguage: defaultLang,
      image: `${siteUrl}/opengraph-image`,
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Webpify />
    </>
  );
}
