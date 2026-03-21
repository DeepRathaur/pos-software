# Offline-first POS architecture

## Goals

- Capture sales when **network is unavailable** using **SQLite in the browser** ([sql.js](https://sql.js.org/)).
- Record every outbound change in a **`sync_queue`** table and **flush when `navigator.onLine`** (and on a timer while authenticated).
- Resolve conflicts with **last write wins** using monotonic **ISO timestamps** (`updatedAt` on the envelope, server `updated_at` after sync).

## Components

| Piece | Role |
|--------|------|
| **sql.js + WASM** (`/sql-wasm.wasm`) | Embedded SQLite engine in the tab |
| **`sync_queue` table** | Durable queue: `table_name`, `operation`, `payload` (JSON), `status` |
| **IndexedDB** | Persists the SQLite file via `db.export()` / `new SQL.Database(bytes)` |
| **`saveOrderOffline()`** | Inserts a row + persists DB |
| **`syncPendingData()`** | Reads `pending` rows, `POST /api/orders`, marks `synced` / `failed` |
| **`useOfflineSync`** | Calls `syncPendingData` on `online` + every 60s when logged in |

## Data flow

```text
[ POS checkout ]
       |
       v
  Online? ----no----> saveOrderOffline() --> sync_queue (pending) --> IndexedDB
       |                                                      ^
      yes                                                     |
       |                                                      |
       v                                                      |
 POST /api/orders <------------------------ syncPendingData() +
```

## `sync_queue` schema

| Column | Purpose |
|--------|---------|
| `id` | Autoincrement primary key (order of replay) |
| `table_name` | Logical entity (e.g. `orders`) |
| `operation` | `insert` \| `update` \| `delete` \| `upsert` (checkout uses `upsert`) |
| `payload` | JSON string: envelope + API body |
| `status` | `pending` → `syncing` → `synced` \| `failed` |
| `created_at` / `updated_at` | Client timestamps for last-write-wins bookkeeping |
| `error_message` / `retry_count` | Diagnostics |

## Last write wins

1. Each offline mutation gets `clientMutationId` + `updatedAt` (ISO) in the payload envelope.
2. After a successful `POST`, we merge **`updatedAt` ← server `order.updated_at`** when the API returns it, so the row reflects the authoritative server time.
3. If you later add multi-writer conflict APIs, compare timestamps and keep the **newer** `updated_at` (same rule).

## Code examples

### Save when offline

```ts
import { saveOrderOffline } from "@/lib/offline";

await saveOrderOffline({
  checkoutBody: {
    businessId,
    lines: [{ itemId, quantity }],
    discountAmount: 0,
    payment: { method: "cash", amount: 120 },
  },
});
```

### Manual sync (e.g. after login)

```ts
import { syncPendingData } from "@/lib/offline";

const { synced, failed, errors } = await syncPendingData({ token });
```

### Retry failures

```ts
import { requeueFailedSyncs, syncPendingData } from "@/lib/offline";

await requeueFailedSyncs();
await syncPendingData({ token });
```

## Operational notes

- **First load** must fetch `/sql-wasm.wasm` from your origin (committed under `public/`). After that, the WASM can be cached by the browser.
- **Large queues**: `syncPendingData` processes up to `limit` (default 50) per call.
- **Security**: payloads contain the same JSON you would send online — protect `localStorage` / IndexedDB like any client cache (device encryption, kiosk lockdown).
- **Server idempotency** (optional hardening): accept `clientMutationId` on `POST /api/orders` and dedupe — not implemented in the sample API.

## File map

- `src/lib/offline/db.ts` — sql.js singleton + migrations
- `src/lib/offline/idb.ts` — IndexedDB persistence
- `src/lib/offline/saveOrderOffline.ts`
- `src/lib/offline/syncPendingData.ts`
- `src/hooks/useOfflineSync.ts`
- `src/components/providers/OfflineSyncListener.tsx`
