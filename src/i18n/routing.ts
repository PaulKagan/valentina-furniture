/**
 * next-intl routing config — single source of truth for locales.
 *
 * Store: Hebrew (default, no URL prefix), English (/en/), Russian (/ru/)
 * Admin: Hebrew and Russian only — English admin is blocked in middleware.
 *
 * localePrefix 'as-needed' means the default locale (he) renders at /,
 * while /en/ and /ru/ get explicit prefixes.
 */
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["he", "en", "ru"],
  defaultLocale: "he",
  localePrefix: "as-needed",
  // No Accept-Language auto-redirects: they made /admin loop forever for
  // English browsers (i18n redirect → admin locale-block redirect → …),
  // and surprise-redirect Hebrew customers too. Language is chosen via
  // the header switcher; URLs stay stable and shareable.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
