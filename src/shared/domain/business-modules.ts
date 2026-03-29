/**
 * Feature toggles derived from `business_type`.
 * Stored on `businesses.enabled_modules` at create / type change.
 */

export type BusinessType =
  | "retail"
  | "cafe"
  | "salon"
  | "restaurant"
  | "custom";

/** Canonical module keys — keep in sync with DB `enabled_modules` TEXT[] */
export type ModuleKey =
  | "products"
  | "inventory"
  | "billing"
  | "recipes"
  | "services"
  | "staff"
  | "appointments"
  | "menu"
  | "tables"
  | "kitchen_orders"
  /** CRM / directory */
  | "customers"
  /** Analytics */
  | "reports"
  /** Suppliers & stock-in */
  | "purchases";

/**
 * Default module sets per business type (product spec).
 * `custom` defaults to a broad set; operators can PATCH `enabled_modules` to tune.
 */
export const BUSINESS_MODULE_CONFIG: Record<BusinessType, readonly ModuleKey[]> = {
  retail: ["products", "inventory", "billing", "purchases"],
  cafe: ["products", "inventory", "billing", "recipes", "purchases"],
  salon: ["services", "staff", "appointments"],
  restaurant: ["menu", "tables", "kitchen_orders", "purchases"],
  custom: [
    "products",
    "inventory",
    "billing",
    "customers",
    "reports",
    "purchases",
  ],
};

/**
 * Salon & restaurant still run checkout — billing is implied for POS.
 * Merged into stored `enabled_modules` so `/api/orders` and POS stay available.
 */
const IMPLICIT_WITH_POS: Partial<Record<BusinessType, readonly ModuleKey[]>> = {
  salon: ["billing"],
  restaurant: ["billing"],
};

/**
 * Returns enabled modules for a business type (immutable copy).
 * Use when creating a business or resetting modules after a type change.
 */
export function getEnabledModules(businessType: BusinessType): ModuleKey[] {
  const base = BUSINESS_MODULE_CONFIG[businessType];
  const extra = IMPLICIT_WITH_POS[businessType] ?? [];
  const merged = [...base, ...extra];
  return [...new Set(merged)];
}

/** @deprecated Prefer `getEnabledModules` — kept for existing API imports */
export function modulesForBusinessType(type: BusinessType): ModuleKey[] {
  return getEnabledModules(type);
}

export function isModuleEnabled(
  enabled: string[] | null | undefined,
  module: ModuleKey | string
): boolean {
  if (!enabled?.length) return false;
  return enabled.includes(module);
}

/** Any of the listed modules must be present */
export function isAnyModuleEnabled(
  enabled: string[] | null | undefined,
  modules: readonly (ModuleKey | string)[]
): boolean {
  if (!enabled?.length) return false;
  return modules.some((m) => enabled.includes(m));
}

/** Legacy rows may still have `kitchen` instead of `kitchen_orders` */
export function isKitchenOrdersEnabled(enabled: string[] | null | undefined): boolean {
  return isAnyModuleEnabled(enabled, ["kitchen_orders", "kitchen"]);
}
