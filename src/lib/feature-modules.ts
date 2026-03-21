export type BusinessType =
  | "retail"
  | "cafe"
  | "salon"
  | "restaurant"
  | "custom";

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
  | "kitchen"
  | "customers"
  | "reports"
  | "purchases";

const defaults: Record<BusinessType, ModuleKey[]> = {
  retail: ["products", "inventory", "billing", "customers", "reports", "purchases"],
  cafe: ["products", "recipes", "billing", "customers", "reports", "purchases"],
  salon: ["services", "staff", "appointments", "billing", "customers", "reports"],
  restaurant: ["menu", "tables", "kitchen", "billing", "customers", "reports", "purchases"],
  custom: ["products", "inventory", "billing", "customers", "reports", "purchases"],
};

export function modulesForBusinessType(type: BusinessType): ModuleKey[] {
  return [...defaults[type]];
}

export function isModuleEnabled(
  enabled: string[] | null | undefined,
  module: ModuleKey
): boolean {
  if (!enabled?.length) return false;
  return enabled.includes(module);
}
