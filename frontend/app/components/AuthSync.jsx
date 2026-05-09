"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAccessToken, isPublicPath } from "../lib/auth";

/**
 * Keeps navigation in sync with auth: other-tab logout, bfcache restore, or stray visits
 * to app routes without a token.
 */
export default function AuthSync() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const redirectIfNeeded = () => {
      if (isPublicPath(pathname)) return;
      if (!getAccessToken()) router.replace("/login");
    };

    const onStorage = (e) => {
      if (e.key === "access_token" && e.oldValue != null && e.newValue == null) {
        redirectIfNeeded();
      }
    };

    const onPageShow = (e) => {
      if (e.persisted) redirectIfNeeded();
    };

    // Initial guard is handled by (protected)/layout (useLayoutEffect) so protected
    // pages never paint before the auth check.

    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [pathname, router]);

  return null;
}
