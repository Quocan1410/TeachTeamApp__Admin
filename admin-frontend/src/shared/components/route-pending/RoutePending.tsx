"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    __routePending?: boolean;
    __hideRoutePending?: () => void;
  }
}

export default function RoutePending() {
  const pathname = usePathname();
  const skipFirstPath = useRef(true);

  useEffect(() => {
    document.documentElement.dataset.appReady = "1";
    if (!window.__routePending) {
      window.__hideRoutePending?.();
    }
  }, []);

  useEffect(() => {
    if (skipFirstPath.current) {
      skipFirstPath.current = false;
      return;
    }
    window.__hideRoutePending?.();
  }, [pathname]);

  return null;
}
