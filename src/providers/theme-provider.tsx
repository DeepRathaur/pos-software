"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem
      storageKey="pos-theme"
      disableTransitionOnChange
      themes={["light", "dark", "system"]}
    >
      {children}
    </NextThemesProvider>
  );
}
