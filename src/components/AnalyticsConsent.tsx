"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GoogleAnalytics } from "@next/third-parties/google";
import { ShieldCheck } from "lucide-react";

const CONSENT_KEY = "wcm_analytics_consent_v1";
export const COOKIE_CHOICES_EVENT = "wcmCookieChoices";
type Choice = "yes" | "no" | null;

/** Optional analytics are not loaded before affirmative visitor consent. */
export default function AnalyticsConsent({ gaId }: { gaId?: string }) {
  const [choice, setChoice] = useState<Choice>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      try {
        const value = localStorage.getItem(CONSENT_KEY);
        setChoice(value === "yes" ? "yes" : value === "no" ? "no" : null);
      } catch {
        setChoice(null);
      }
      setReady(true);
    };
    refresh();
    window.addEventListener(COOKIE_CHOICES_EVENT, refresh);
    return () => window.removeEventListener(COOKIE_CHOICES_EVENT, refresh);
  }, []);

  function choose(value: "yes" | "no") {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      /* this visit only */
    }
    setChoice(value);
  }

  if (!gaId) return null;
  return (
    <>
      {ready && choice === "yes" && <GoogleAnalytics gaId={gaId} />}
      {ready && choice === null && (
        <aside
          role="dialog"
          aria-label="Analytics cookie choices"
          aria-modal="false"
          className="wcm-cookie-banner fixed z-[75] bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-[410px] rounded-2xl border border-[#c8dece] bg-white shadow-[0_18px_55px_rgba(20,50,30,.18)] p-5"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck className="text-[#065975] shrink-0 mt-0.5" size={22} />
            <div className="min-w-0 grow">
              <h2 className="font-extrabold text-[#065975] text-sm">
                A little choice about analytics
              </h2>
              <p className="text-sm text-[#576f79] leading-6 mt-1">
                Essential storage helps keep your cart working. With your
                permission, we use Google Analytics to understand how our shop
                is used.
              </p>
              <Link
                className="inline-block text-xs text-[#065975] font-bold underline underline-offset-2 mt-2"
                href="/privacy"
              >
                Read our privacy policy
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              type="button"
              className="site-button-primary !min-h-10 grow !px-3"
              onClick={() => choose("yes")}
            >
              Allow analytics
            </button>
            <button
              type="button"
              className="site-button-outline !min-h-10 grow !px-3"
              onClick={() => choose("no")}
            >
              Essential only
            </button>
          </div>
        </aside>
      )}
    </>
  );
}

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      className="text-xs text-slate-600 hover:text-[#065975] underline underline-offset-2"
      onClick={() => {
        try {
          localStorage.removeItem(CONSENT_KEY);
        } catch {
          /* storage disabled */
        }
        // A reload guarantees any previously initialised analytics script is unloaded
        // before a visitor makes a new choice.
        window.location.reload();
      }}
    >
      Cookie choices
    </button>
  );
}