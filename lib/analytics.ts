export function trackEvent(action: string, params?: Record<string, string | number>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", action, params);
  }
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
