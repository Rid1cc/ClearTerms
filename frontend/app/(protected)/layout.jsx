"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "../lib/auth";

export default function ProtectedLayout({ children }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useLayoutEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    setAllowed(true);
  }, [router]);

  useEffect(() => {
    const loseSession = () => {
      if (!getAccessToken()) {
        setAllowed(false);
        router.replace("/login");
      }
    };

    const onStorage = (e) => {
      if (e.key === "access_token" && e.oldValue != null && e.newValue == null) {
        loseSession();
      }
    };

    const onPageShow = (e) => {
      if (e.persisted && !getAccessToken()) {
        setAllowed(false);
        router.replace("/login");
      }
    };

    window.addEventListener("clearterms:logout", loseSession);
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("clearterms:logout", loseSession);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [router]);

  if (!allowed) {
    return (
      <div
        className="page"
        style={{ minHeight: "100vh", justifyContent: "center", alignItems: "center" }}
        aria-busy="true"
        aria-label="Loading"
      />
    );
  }

  return <>{children}</>;
}
