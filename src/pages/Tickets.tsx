import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { Status, Priority, TicketFilters, Ticket } from "@/types";
import { getUsers as getLocalUsers, getUnsyncedTickets, removeTicket, getTickets as getLocalTickets } from "@/lib/localDb";
import { useQueryClient } from "@tanstack/react-query";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { NewEmailDialog } from "@/components/NewEmailDialog";
// removed duplicate import
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { LocalDbDebug } from "@/components/LocalDbDebug";

export const Tickets = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TicketFilters>({});
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", filters],
    queryFn: async () => {
      // Try remote and local in parallel; always merge local unsynced tickets so they appear in the UI
      const [remote, local] = await Promise.all([
        api.tickets.list(filters).catch((err) => {
          console.warn("Remote tickets fetch failed, will use local results", err);
          return null as unknown as Ticket[] | null;
        }),
        getLocalTickets().catch((err) => {
          console.warn("Failed to read local tickets", err);
          return [] as Ticket[];
        }),
      ]);

      // helper to apply status filter to a list
      const applyStatusFilter = (list: any[], status?: string | undefined) => {
        if (!status) return list;
        return list.filter((t) => ((t as any).status ?? (t as Ticket).status) === status);
      };

      if (!remote) {
        // no remote, return local (filtered)
        return applyStatusFilter(local, filters.status as any);
      }

      // merge remote tickets with local ones (local wins if id collision)
      const map = new Map<string, any>();
      for (const r of remote) map.set(r.id, r);
      for (const l of local) map.set(l.id, { ...l, _local: true, /* mark local-only */ });
      const merged = Array.from(map.values());
      // apply status filter to merged results as well
      return applyStatusFilter(merged, filters.status as any);
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        return await api.users.list();
      } catch (err) {
        console.warn("Remote users fetch failed, falling back to local DB", err);
        return await getLocalUsers();
      }
    },
  });

  const handleStatusChange = (status: Status | "all") => {
    setFilters({ ...filters, status: status === "all" ? undefined : status });
  };

  const getSolverName = (ticket: any) => {
    if (ticket.assigned_user_id) {
      const user = users.find((u) => u.id === ticket.assigned_user_id);
      return user?.name || ticket.assigned_department;
    }
    if (ticket.status === "listed" && !ticket.assigned_user_id) {
      return "chatbot";
    }
    return ticket.assigned_department;
  };

  const filteredTickets = tickets
    .filter((t) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      const customer_name = ((t as any).customer_name ?? "").toLowerCase();
      const problem = ((t as any).problem ?? "").toLowerCase();
      const customer_email = ((t as any).customer_email ?? "").toLowerCase();
      return (
        customer_name.includes(searchLower) ||
        problem.includes(searchLower) ||
        customer_email.includes(searchLower)
      );
    })
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ status?: string; priority?: string; assigned_user_id?: string | null }>({});

  const startEdit = (t: any) => {
    setEditingId(t.id);
    setEditDraft({ status: t.status ?? "listed", priority: t.priority ?? "low", assigned_user_id: t.assigned_user_id ?? null });
  };

  const cancelEdit = () => { setEditingId(null); setEditDraft({}); };

  const saveEdit = async (id: string) => {
    try {
      // try remote adjust
      await api.tickets.adjust(id, {
        status: editDraft.status as any,
        priority: editDraft.priority as any,
        assigned_user_id: editDraft.assigned_user_id ?? null,
      } as any);
      // remote adjust succeeded — fetch updated ticket and update local DB so stats reflect remote changes
      try {
        const updated = await api.tickets.get(id);
        const { updateTicket } = await import('@/lib/localDb');
        await updateTicket(id, updated as any);
      } catch (e) {
        console.warn('Failed to fetch/update local ticket after remote adjust', e);
      }
    } catch (e) {
      // fallback to local DB update
      const { updateTicket, updateUser } = await import('@/lib/localDb');
      // load existing ticket to know previous assigned_user_id
      const all = await getLocalTickets();
      const existing = all.find((t) => t.id === id) as any;
      const prevAssigned = existing?.assigned_user_id ?? null;
      await updateTicket(id, {
        status: editDraft.status as any,
        priority: editDraft.priority as any,
        assigned_user_id: editDraft.assigned_user_id ?? null,
      } as any);
      // adjust workload: decrement previous assignee, increment new assignee
      if (prevAssigned && prevAssigned !== editDraft.assigned_user_id) {
        await updateUser(prevAssigned, -1);
      }
      if (editDraft.assigned_user_id && editDraft.assigned_user_id !== prevAssigned) {
        await updateUser(editDraft.assigned_user_id, 1);
      }
    }
    await queryClient.invalidateQueries({ queryKey: ["tickets"] });
  try { const { recomputeUserStats } = await import('@/lib/localDb'); await recomputeUserStats(); } catch(e) { console.warn('recomputeUserStats failed', e); }
    await queryClient.invalidateQueries({ queryKey: ["users"] });
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
            <p className="text-sm text-muted-foreground">Manage and route customer support tickets</p>
          </div>
        </div>

        <div className="px-4 pb-4 space-y-4">
          <Tabs defaultValue="all" onValueChange={(v) => handleStatusChange(v as Status | "all")}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="listed">Listed</TabsTrigger>
              <TabsTrigger value="on_going">On-going</TabsTrigger>
              <TabsTrigger value="solve">Solved</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2" onClick={async () => {
              // sync unsynced local tickets
              const unsynced = await getUnsyncedTickets();
              if (unsynced.length === 0) {
                toast({ title: "No unsynced tickets", description: "All tickets are already synced." });
                return;
              }
              let success = 0;
              let failed = 0;
              for (const t of unsynced) {
                try {
                  await api.emails.ingest({
                    customer_name: t.customer_name,
                    customer_email: t.customer_email,
                    subject: (t as any).problem ?? (t as any).subject ?? "",
                    body: (t as any).description ?? (t as any).body ?? "",
                  } as any);
                  // remove local copy on success
                  await removeTicket(t.id);
                  success++;
                } catch (e) {
                  console.warn("Failed to sync ticket", t.id, e);
                  failed++;
                }
              }
              toast({ title: "Sync complete", description: `${success} succeeded, ${failed} failed` });
              // refetch tickets list
              await queryClient.invalidateQueries({ queryKey: ["tickets"] });
              try { const { recomputeUserStats } = await import('@/lib/localDb'); await recomputeUserStats(); } catch(e) { console.warn('recomputeUserStats failed', e); }
              await queryClient.invalidateQueries({ queryKey: ["users"] });
            }}>
              <Filter className="h-4 w-4" />
              Sync
            </Button>
            {/* Generate Ticket button removed */}
            <div className="ml-2">
              <LocalDbDebug />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Problem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Solver</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading tickets...
                </TableCell>
              </TableRow>
            ) : filteredTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No tickets found
                </TableCell>
              </TableRow>
            ) : (
              filteredTickets.map((ticket) => {
                const isEditing = editingId === ticket.id;
                return (
                <TableRow key={ticket.id} className="hover:bg-muted/50">
                  <TableCell onClick={() => !isEditing && navigate(`/tickets/${ticket.id}`)}>
                    <div>
                        <div className="font-medium">{(ticket as any).customer_name ?? (ticket as Ticket).customer_name}</div>
                        <div className="text-sm text-muted-foreground">{(ticket as any).customer_email ?? (ticket as Ticket).customer_email}</div>
                    </div>
                  </TableCell>
                  <TableCell onClick={() => !isEditing && navigate(`/tickets/${ticket.id}`)}>
                    <div className="max-w-md">
                        <div className="font-medium truncate">{(ticket as any).problem ?? (ticket as Ticket).problem}</div>
                        <div className="text-sm text-muted-foreground truncate">{(ticket as any).description ?? (ticket as Ticket).description}</div>
                    </div>
                  </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <select value={editDraft.status} onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value })} className="border rounded px-2 py-1 text-sm">
                          <option value="listed">listed</option>
                          <option value="on_going">on going</option>
                          <option value="solve">solved</option>
                        </select>
                      ) : (
                        <StatusBadge status={(ticket as any).status ?? (ticket as Ticket).status} />
                      )}
                    </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <select value={editDraft.assigned_user_id ?? "chatbot"} onChange={(e) => setEditDraft({ ...editDraft, assigned_user_id: e.target.value === 'chatbot' ? null : e.target.value })} className="border rounded px-2 py-1 text-sm">
                        <option value="chatbot">chatbot</option>
                        {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    ) : (
                      <div className="font-medium capitalize">{getSolverName(ticket)}</div>
                    )}
                  </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <select value={editDraft.priority} onChange={(e) => setEditDraft({ ...editDraft, priority: e.target.value })} className="border rounded px-2 py-1 text-sm">
                          <option value="low">low</option>
                          <option value="medium">medium</option>
                          <option value="high">high</option>
                        </select>
                      ) : (
                        <PriorityBadge priority={(ticket as any).priority ?? (ticket as Ticket).priority} />
                      )}
                    </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date((ticket as any).created_at ?? (ticket as Ticket).created_at), { addSuffix: true })}
                      <div className="mt-2 flex gap-2">
                        {isEditing ? (
                          <>
                            <Button size="sm" onClick={() => saveEdit(ticket.id)}>Save</Button>
                            <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => startEdit(ticket)}>Edit</Button>
                        )}
                      </div>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
