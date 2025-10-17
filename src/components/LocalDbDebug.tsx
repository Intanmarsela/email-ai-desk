import React, { useEffect, useState } from "react";
import { getTickets, getUnsyncedTickets, addTicket } from "@/lib/localDb";
import { Button } from "@/components/ui/button";

export const LocalDbDebug = () => {
  const [count, setCount] = useState<number>(0);
  const [unsynced, setUnsynced] = useState<number>(0);

  const refresh = async () => {
    try {
      const all = await getTickets();
      const u = await getUnsyncedTickets();
      setCount(all.length);
      setUnsynced(u.length);
      setLocalTickets(all);
    } catch (e) {
      console.error('LocalDbDebug refresh failed', e);
    }
  };
  const [showJson, setShowJson] = useState(false);
  const [localTickets, setLocalTickets] = useState<any[]>([]);
  useEffect(() => { refresh(); }, []);

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="text-sm text-muted-foreground">Local tickets: {count} — Unsynced: {unsynced}</div>
        <Button size="sm" variant="outline" onClick={async () => {
          try {
            // generate 5 sample tickets
            for (let i = 1; i <= 5; i++) {
              await addTicket({ customer_name: `Generated ${i}`, customer_email: `gen${i}@example.com`, subject: `Generated ${i}`, body: `Generated ticket ${i}`, _local: true } as any);
            }
            try { const { recomputeUserStats } = await import('@/lib/localDb'); await recomputeUserStats(); } catch(e) { console.warn('recomputeUserStats failed', e); }
            await refresh();
          } catch (e) {
            console.error('generate tickets failed', e);
          }
        }}>Generate tickets</Button>
      </div>
      <div className="mt-2">
        <div className="text-xs text-muted-foreground mb-1">Local DB preview</div>
        {localTickets.length === 0 ? (
          <div className="text-xs text-muted-foreground">(no local tickets)</div>
        ) : (
          <div className="space-y-1 text-sm">
            {localTickets.slice(0,5).map((t:any) => (
              <div key={t.id} className="p-2 rounded border bg-muted/5">
                <div className="font-medium">{t.customer_name} <span className="text-xs text-muted-foreground">{t.customer_email}</span></div>
                <div className="text-xs text-muted-foreground">{(t as any).subject ?? (t as any).problem}</div>
              </div>
            ))}
            {localTickets.length > 5 ? <div className="text-xs text-muted-foreground">and {localTickets.length - 5} more...</div> : null}
            <div className="mt-2">
              <Button size="sm" variant="ghost" onClick={() => setShowJson(!showJson)}>{showJson ? 'Hide JSON' : 'Show JSON'}</Button>
              {showJson ? <pre className="max-h-48 overflow-auto text-xs mt-2 bg-black/5 p-2 rounded">{JSON.stringify(localTickets, null, 2)}</pre> : null}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
