const KEY = "kc_pending_lots";

export function pendingLots() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function queueLot(lot) {
  const all = pendingLots();
  all.push({...lot, local_id:crypto.randomUUID(), queued_at:new Date().toISOString()});
  localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}

export function removePending(localId) {
  const next = pendingLots().filter(x => x.local_id !== localId);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export async function syncPending(insertFn) {
  if (!navigator.onLine) return { synced:0 };
  let synced = 0;
  for (const lot of pendingLots()) {
    try {
      await insertFn(lot);
      removePending(lot.local_id);
      synced++;
    } catch(e) { console.warn("Sync failed", e); }
  }
  return { synced };
}
