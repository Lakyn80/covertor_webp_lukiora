import { translations as en, authTranslations as enAuth, extras as enExtras } from "./en";
import { translations as de, authTranslations as deAuth, extras as deExtras } from "./de";
import { translations as fr, authTranslations as frAuth, extras as frExtras } from "./fr";
import { translations as pt, authTranslations as ptAuth, extras as ptExtras } from "./pt";
import { translations as es, authTranslations as esAuth, extras as esExtras } from "./es";
import { translations as ro, authTranslations as roAuth, extras as roExtras } from "./ro";
import { translations as cs, authTranslations as csAuth, extras as csExtras } from "./cs";
import { translations as sk, authTranslations as skAuth, extras as skExtras } from "./sk";
import { translations as sv, authTranslations as svAuth, extras as svExtras } from "./sv";
import { translations as fi, authTranslations as fiAuth, extras as fiExtras } from "./fi";
import { translations as da, authTranslations as daAuth, extras as daExtras } from "./da";
import { translations as bg, authTranslations as bgAuth, extras as bgExtras } from "./bg";
import { translations as hu, authTranslations as huAuth, extras as huExtras } from "./hu";
import { translations as it, authTranslations as itAuth, extras as itExtras } from "./it";
import { translations as el, authTranslations as elAuth, extras as elExtras } from "./el";
import { translations as ru, authTranslations as ruAuth, extras as ruExtras } from "./ru";
import { translations as pl, authTranslations as plAuth, extras as plExtras } from "./pl";
import { translations as et, authTranslations as etAuth, extras as etExtras } from "./et";
import { translations as lt, authTranslations as ltAuth, extras as ltExtras } from "./lt";
import { translations as lv, authTranslations as lvAuth, extras as lvExtras } from "./lv";

export const FALLBACK_TEXTS = {
  label: "English",
  languageLabel: "Language",

  heroTitle: "Convert Images to WebP – HEIC (iPhone), JPG, PNG",
  subtitle:
    "Batch WebP converter. Convert multiple images from HEIC (iPhone), JPG and PNG to WebP format.",
  shortDescription:
    "Select any number of images (HEIC from iPhone, JPG, PNG). All files are converted exclusively to WebP format.",

  chooseFiles: "Select images",
  dropHint: "or drag & drop files. Unlimited batch conversion to WebP.",

  qualityLabel: "WebP Quality",
  qualityValue: (q) => `Current: ${q}`,

  maxWidthLabel: "Max width (px)",
  maxWidthPlaceholder: "e.g. 1200",

  concurrencyLabel: "Parallel processing",
  concurrencyHint: "Recommended: 3–6",

  actionsTitle: "Actions",
  convertAll: "Convert all to WebP",
  converting: "Converting...",
  downloadAll: "Download all (.zip)",
  resetList: "Clear list",
  clearDone: "Remove completed",

  status: (done, total, failed, inProgress) =>
    `Status: ${done}/${total} done, ${failed} errors, ${inProgress} running`,

  emptyState:
    "No files selected yet. Add HEIC (iPhone), JPG or PNG images to convert them to WebP.",

  download: "Download",
  remove: "Remove",

  pending: "Waiting to start...",
  waiting: "Queued...",
  processing: "Converting...",

  done: (size, name) => `Done - ${size} - ${name}`,
  error: (msg) => `Error: ${msg || "Unknown error"}`,

  seoTitle: "Webpify Batch – WebP Converter",
  seoDescription:
    "Fast batch image to WebP converter with quality control, resizing, and zip download.",
  seoKeywords:
    "webp converter, image optimizer, heic to webp, jpg to webp, png to webp, batch images",

  installApp: "Install app",
  installReady: "Add to Home Screen",
  installInstalling: "Installing...",
  installInstalled: "Installed",
  installUnavailable: "Installation is not available in this browser.",

  needLoginConvert:
    "Log in to convert (3 photos free, then optional membership).",
  unlimitedAccess: "You have unlimited access.",
  freeInfo: (left, total) =>
    `Free left: ${left} / ${total}. Then membership (optional).`,
  freeLimitReached:
    "You used all free conversions. Activate membership for unlimited access.",
  batchLimitHint:
    "You can convert up to 3 photos at a time. Start the conversion, then add more.",
  membershipRequired:
    "Membership is not active. Please activate access.",

  footerPrivacy: "Privacy Policy (GDPR)",
  footerCookies: "Cookies",

  cookieTitle: "Cookies",
  cookieText:
    "We use essential cookies to operate the website and optional cookies only with your consent.",
  cookieAcceptAll: "Accept all",
  cookieEssentialOnly: "Essential only",
  cookieSettings: "Cookie settings",

  backToConverter: "Back to converter",

  privacyTitle: "Privacy Policy (GDPR)",
  privacyIntro:
    "This page explains how personal data is processed in accordance with EU Regulation (GDPR).",

  privacyControllerTitle: "Data controller",
  privacyControllerText:
    "The data controller of this website is Lukiora.",

  privacyContactTitle: "Contact email",
  privacyContactText: "service@lukiora.com",

  privacyDataTitle: "Processed data",
  privacyDataText:
    "We may process account data (email, name), technical usage data, and uploaded files necessary for conversion.",

  privacyPurposeTitle: "Purpose of processing",
  privacyPurposeText:
    "Data is processed solely to provide the image conversion service, manage memberships, ensure security, and provide support.",

  privacyLegalTitle: "Legal basis",
  privacyLegalText:
    "Processing is based on contract performance, legitimate interest, and user consent where applicable.",

  privacyRetentionTitle: "Data retention",
  privacyRetentionText:
    "Personal data is stored only for the period necessary to fulfill the stated purposes or legal obligations.",

  privacyRightsTitle: "Your rights",
  privacyRightsItems: [
    "Right of access to personal data",
    "Right to correction or deletion",
    "Right to restrict processing",
    "Right to data portability",
    "Right to withdraw consent at any time",
    "Right to lodge a complaint with a supervisory authority",
  ],

  privacyAuthorityTitle: "Supervisory authority",
  privacyAuthorityText:
    "You have the right to file a complaint with your local data protection authority within the EU.",

  privacyAutomationTitle: "Automated decision-making",
  privacyAutomationText:
    "No automated decision-making or profiling is performed.",

  cookiesPageTitle: "Cookie Policy",
  cookiesIntro:
    "This page explains how cookies and similar technologies are used.",

  cookiesEssentialTitle: "Essential cookies",
  cookiesEssentialText:
    "Essential cookies are required for basic site functionality.",

  cookiesThirdPartyTitle: "Third-party services",
  cookiesThirdPartyText:
    "Third-party services may be loaded only after consent.",

  cookiesManageTitle: "Managing cookies",
  cookiesManageText:
    "You can manage or delete cookies in your browser settings.",

  cookiesContactTitle: "Contact",
  cookiesContactText: "service@lukiora.com",
};

export const DEFAULT_KEYWORDS =
  "webp converter, image optimizer, heic to webp, jpg to webp, png to webp, batch images";

export const TRANSLATIONS = {
  en,
  de,
  fr,
  pt,
  es,
  ro,
  cs,
  sk,
  sv,
  fi,
  da,
  bg,
  hu,
  it,
  el,
  ru,
  pl,
  et,
  lt,
  lv,
};

export const LANGUAGE_ORDER = [
  "en",
  "de",
  "fr",
  "pt",
  "es",
  "ro",
  "cs",
  "sk",
  "sv",
  "fi",
  "da",
  "bg",
  "hu",
  "it",
  "el",
  "ru",
  "pl",
  "et",
  "lt",
  "lv",
];

export const LANGUAGE_EXTRAS = {
  en: enExtras,
  de: deExtras,
  fr: frExtras,
  pt: ptExtras,
  es: esExtras,
  ro: roExtras,
  cs: csExtras,
  sk: skExtras,
  sv: svExtras,
  fi: fiExtras,
  da: daExtras,
  bg: bgExtras,
  hu: huExtras,
  it: itExtras,
  el: elExtras,
  ru: ruExtras,
  pl: plExtras,
  et: etExtras,
  lt: ltExtras,
  lv: lvExtras,
};

export const AUTH_TRANSLATIONS = {
  en: enAuth,
  de: deAuth,
  fr: frAuth,
  pt: ptAuth,
  es: esAuth,
  ro: roAuth,
  cs: csAuth,
  sk: skAuth,
  sv: svAuth,
  fi: fiAuth,
  da: daAuth,
  bg: bgAuth,
  hu: huAuth,
  it: itAuth,
  el: elAuth,
  ru: ruAuth,
  pl: plAuth,
  et: etAuth,
  lt: ltAuth,
  lv: lvAuth,
};

Object.entries(LANGUAGE_EXTRAS).forEach(([code, extra]) => {
  if (TRANSLATIONS[code]) {
    TRANSLATIONS[code] = { ...TRANSLATIONS[code], ...extra };
  }
});
