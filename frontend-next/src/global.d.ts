export {};

declare global {
  interface Window {
    __bmcWidgetInitRequested?: boolean;
    __bmcWidgetScriptLoaded?: boolean;
    __API_BASE__?: string;
  }

  interface Navigator {
    userLanguage?: string;
    standalone?: boolean;
  }

  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
  }
}
