import {
  isAnyModuleEnabled,
  isKitchenOrdersEnabled,
  isModuleEnabled,
} from "@/shared/domain/business-modules";

export type NavItem = {
  href: string;
  label: string;
};

type Matcher = (enabled: string[]) => boolean;

const NAV_DEF: { href: string; label: string; match: Matcher }[] = [
  { href: "/dashboard", label: "Home", match: () => true },
  { href: "/pos", label: "POS", match: (e) => isModuleEnabled(e, "billing") },
  {
    href: "/products",
    label: "Items",
    match: (e) =>
      isAnyModuleEnabled(e, ["products", "menu", "services", "recipes"]),
  },
  { href: "/inventory", label: "Stock", match: (e) => isModuleEnabled(e, "inventory") },
  { href: "/purchases", label: "Buy-in", match: (e) => isModuleEnabled(e, "purchases") },
  { href: "/recipes", label: "Recipes", match: (e) => isModuleEnabled(e, "recipes") },
  { href: "/staff", label: "Team", match: (e) => isModuleEnabled(e, "staff") },
  {
    href: "/appointments",
    label: "Book",
    match: (e) => isModuleEnabled(e, "appointments"),
  },
  { href: "/tables", label: "Tables", match: (e) => isModuleEnabled(e, "tables") },
  {
    href: "/kitchen",
    label: "Kitchen",
    match: (e) => isKitchenOrdersEnabled(e),
  },
  { href: "/customers", label: "People", match: (e) => isModuleEnabled(e, "customers") },
  { href: "/reports", label: "Stats", match: (e) => isModuleEnabled(e, "reports") },
  { href: "/settings", label: "Setup", match: () => true },
];

/**
 * Bottom nav items visible for the current business module set.
 * Order is stable; overflow scrolls on small screens.
 */
export function getVisibleNavItems(enabledModules: string[] | undefined): NavItem[] {
  const e = enabledModules ?? [];
  return NAV_DEF.filter((d) => d.match(e)).map(({ href, label }) => ({ href, label }));
}

/** Route guard helper: pathname must be allowed for these modules */
export function isRouteAllowedForModules(
  pathname: string,
  enabledModules: string[] | undefined
): boolean {
  const items = getVisibleNavItems(enabledModules);
  const base = pathname.split("?")[0] ?? pathname;
  if (base === "/") return true;
  return items.some(
    (it) => base === it.href || (it.href !== "/dashboard" && base.startsWith(it.href + "/"))
  );
}
