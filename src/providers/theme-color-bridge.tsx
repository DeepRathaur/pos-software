"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export function ThemeColorBridge() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const el = document.documentElement;
    const bg = getComputedStyle(el).getPropertyValue("--stitch-theme-color").trim();
    const content = bg.length > 0 ? bg : resolvedTheme === "light" ? "#f8fafc" : "#12080a";
    let meta = document.querySelector("meta[name=\"theme-color\"]");
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", content);
  }, [resolvedTheme]);

  return null;
}
