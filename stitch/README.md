# Stitch design exports → app mapping

HTML prototypes in this folder informed the **red & black** mobile UI (`#e21d48` primary, deep `#12080a` backgrounds) implemented under `src/components/stitch/` and app routes below.

| Stitch folder | Purpose | App route |
|---------------|---------|-----------|
| `dashboard_red_black_edition` | KPI grid, sales SVG, recent list, FAB | `/dashboard` |
| `pos_billing_red_black_edition` | Search, pill categories, product grid, cart, payment | `/pos` |
| `products_red_black_edition` | Header, underline tabs, product grid | `/products` |
| `inventory_red_black_edition` | Search, tabs, alerts, list rows | `/inventory` |
| `customers_red_black_edition` | Stats, pills, customer cards | `/customers` |
| `reports_red_black_edition` | Time tabs, metrics, charts | `/reports` |
| `table_booking_red_black_edition` | Table cards, filters | `/tables` |
| `customer_appointments_red_black_edition` | Calendar + list | `/appointments` |
| `sidebar_navigation_red_black_edition` | Nav labels (mapped to bottom nav) | `BottomNav` |
| `staff_performance_report_red_black_edition` | Staff list / perf (list view) | `/staff` |
| `settings_modern_refresh` / `settings` | Profile, grouped rows | `/settings` |
| Auth / checkout / receipt HTML | Future flows | not wired in this pass |

Material Symbols are loaded in `src/app/layout.tsx`. Theme tokens live in `src/app/globals.css` (`@theme`).
