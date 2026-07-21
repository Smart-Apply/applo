"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "smartapply.cookieBanner.dismissed.v1";

/**
 * Minimal cookie banner.
 *
 * Applo currently sets only strictly-necessary cookies (auth, CSRF).
 * Per § 25 Abs. 2 Nr. 2 TTDSG these do not require consent — but a brief
 * notice is still expected on a public site. Dismissal is stored in
 * localStorage so the banner does not nag returning users.
 *
 * If you ever add analytics or marketing cookies, replace this with a
 * full consent management platform (e.g. Cookiebot, Usercentrics).
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const dismissed = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!dismissed) setVisible(true);
    } catch {
      // localStorage unavailable (private mode) — show banner anyway
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie-Hinweis"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
    >
      <div className="container mx-auto flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <p className="text-sm text-foreground/80 md:max-w-3xl">
          Wir verwenden ausschließlich technisch notwendige Cookies, damit du
          eingeloggt bleibst und Formulare sicher abgesendet werden. Es findet
          kein Tracking statt. Mehr dazu in unserer{" "}
          <Link
            href="/datenschutz"
            className="font-medium text-brand underline-offset-2 hover:underline"
          >
            Datenschutzerklärung
          </Link>
          .
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            onClick={dismiss}
          >
            Verstanden
          </Button>
        </div>
      </div>
    </div>
  );
}
