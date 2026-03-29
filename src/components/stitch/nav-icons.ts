/** Material Symbols names per app route — matches stitch navigation patterns */
export function stitchNavIcon(href: string): string {
  const map: Record<string, string> = {
    "/dashboard": "home",
    "/pos": "receipt_long",
    "/products": "inventory_2",
    "/inventory": "warehouse",
    "/purchases": "shopping_bag",
    "/recipes": "restaurant_menu",
    "/staff": "groups",
    "/appointments": "calendar_today",
    "/tables": "table_restaurant",
    "/kitchen": "soup_kitchen",
    "/customers": "group",
    "/reports": "monitoring",
    "/settings": "settings",
  };
  return map[href] ?? "circle";
}
