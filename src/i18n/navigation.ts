/**
 * Locale-aware navigation — use these instead of next/link & next/navigation
 * for any in-app link so the current locale prefix (/en, /ru) is preserved.
 */
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, usePathname, useRouter } = createNavigation(routing);
