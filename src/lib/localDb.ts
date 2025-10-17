import Dexie from "dexie";
import type { User, Ticket } from "@/types";

export const db = new Dexie("email_ai_desk");

db.version(1).stores({
  users: "id, name, email, department, created_at, updated_at",
  // include subject and body so debugging / queries can inspect them quickly
  tickets: "id, external_ref, customer_email, customer_name, created_at, synced, subject, body",
});

export type LocalUser = User;

export async function getUsers(): Promise<LocalUser[]> {
  const res = await db.table<LocalUser>("users").toArray();
  try { console.debug('[localDb] getUsers ->', res.length); } catch(e) {}
  return res;
}

export async function addUser(payload: Partial<User>): Promise<LocalUser> {
  const id = payload.id ?? (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function" ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random()}`);
  const now = new Date().toISOString();
  const user: LocalUser = {
    id,
    name: payload.name ?? "Unknown",
    email: payload.email ?? "",
    department: (payload.department ?? "customer_service") as any,
    skills: payload.skills ?? [],
    active: payload.active ?? true,
    workload: payload.workload ?? 0,
    solved_count: payload.solved_count ?? 0,
    created_at: payload.created_at ?? now,
    updated_at: now,
  };
  await db.table("users").put(user);
  try { console.debug('[localDb] addUser ->', user); } catch(e) {}
  return user;
}

export async function clearUsers(): Promise<void> {
  await db.table("users").clear();
}

export type LocalTicket = Ticket;

export async function getTickets(): Promise<LocalTicket[]> {
  const res = await db.table<LocalTicket>("tickets").toArray();
  try { console.debug('[localDb] getTickets ->', res.length); } catch(e) {}
  return res;
}

export async function getTicket(id: string): Promise<LocalTicket | undefined> {
  const res = await db.table<LocalTicket>("tickets").get(id);
  try { console.debug('[localDb] getTicket ->', id, !!res); } catch(e) {}
  return res;
}

export async function addTicket(payload: Partial<LocalTicket>): Promise<LocalTicket> {
  const id = payload.id ?? (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function" ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random()}`);
  const now = new Date().toISOString();
  const isSynced = (payload as any).synced ?? false;
  const ticket: LocalTicket = {
    id,
    external_ref: payload.external_ref ?? null,
    customer_name: payload.customer_name ?? payload.customer_email ?? "",
    customer_email: payload.customer_email ?? "",
    // preserve both problem/description and subject/body for compatibility
    problem: (payload as any).problem ?? (payload as any).subject ?? "",
    description: (payload as any).description ?? (payload as any).body ?? "",
    subject: (payload as any).subject ?? "",
    body: (payload as any).body ?? "",
    // keep a copy of the raw payload for debugging/sync
    raw_payload: (payload as any).raw_payload ?? (payload as any),
    status: (payload.status ?? "listed") as any,
    priority: (payload.priority ?? "low") as any,
    category: (payload.category ?? "other") as any,
    assigned_user_id: (payload as any).assigned_user_id ?? null,
    assigned_department: (payload as any).assigned_department ?? "customer_service",
    agent1_auto_answered: (payload as any).agent1_auto_answered ?? false,
    agent1_answer: (payload as any).agent1_answer ?? null,
    agent2_confidence: (payload as any).agent2_confidence ?? 0,
    sla_due_at: (payload as any).sla_due_at ?? now,
    tags: payload.tags ?? [],
    created_at: payload.created_at ?? now,
    updated_at: now,
    // local tickets are unsynced by default
    ...( { synced: isSynced } as any ),
    // mark local origin so UI and debugging can detect local-only items
    ...( { _local: (payload as any)._local ?? !isSynced } as any ),
  } as LocalTicket;
  await db.table("tickets").put(ticket);
  try { console.debug('[localDb] addTicket ->', ticket); } catch(e) {}
  return ticket;
}

export async function getUnsyncedTickets(): Promise<LocalTicket[]> {
  // return tickets where synced === false
  const all = await getTickets();
  return all.filter((t) => (t as any).synced === false || (t as any)._local === true);
}

export async function removeTicket(id: string): Promise<void> {
  await db.table("tickets").delete(id);
}

export async function updateTicket(id: string, patch: Partial<LocalTicket>): Promise<LocalTicket | null> {
  const now = new Date().toISOString();
  try {
    const table = db.table<LocalTicket>("tickets");
    const existing = await table.get(id);
    if (!existing) return null;
    // when updating locally we mark the ticket unsynced and preserve a local origin marker
    const updated = { ...existing, ...patch, updated_at: now, synced: false, _local: true } as LocalTicket;
    await table.put(updated);
    try { console.debug('[localDb] updateTicket ->', updated); } catch (e) {}
    return updated;
  } catch (e) {
    console.error('updateTicket failed', e);
    return null;
  }
}

export async function updateUser(id: string, deltaWorkload: number): Promise<void> {
  if (!id) return;
  try {
    const table = db.table<LocalUser>("users");
    const u = await table.get(id as any);
    if (!u) {
      console.warn('[localDb] updateUser: user not found', id);
      return;
    }
    const updated = { ...u, workload: (u.workload ?? 0) + deltaWorkload, updated_at: new Date().toISOString() } as LocalUser;
    await table.put(updated);
    try { console.debug('[localDb] updateUser ->', updated.id, updated.workload); } catch (e) {}
  } catch (e) {
    console.error('updateUser failed', e);
  }
}

export async function recomputeSolvedCounts(): Promise<void> {
  try {
    const tickets = await getTickets();
    // count solved tickets per assigned_user_id
    const counts = new Map<string, number>();
    for (const t of tickets) {
      const asg = (t as any).assigned_user_id;
      const status = (t as any).status;
      if (asg && status === "solve") {
        counts.set(asg, (counts.get(asg) ?? 0) + 1);
      }
    }
    // update users
    const users = await getUsers();
    for (const u of users) {
      const desired = counts.get(u.id) ?? 0;
      if ((u.solved_count ?? 0) !== desired) {
        const updated = { ...u, solved_count: desired, updated_at: new Date().toISOString() } as LocalUser;
        await db.table('users').put(updated);
        try { console.debug('[localDb] recomputeSolvedCounts updated', updated.id, updated.solved_count); } catch(e) {}
      }
    }
  } catch (e) {
    console.error('recomputeSolvedCounts failed', e);
  }
}

/**
 * Recompute both workload and solved_count for all users based on local tickets.
 * - workload = number of tickets assigned to the user that are NOT solved
 * - solved_count = number of tickets assigned to the user that are solved
 */
export async function recomputeUserStats(): Promise<void> {
  try {
    const tickets = await getTickets();
    const workload = new Map<string, number>();
    const solved = new Map<string, number>();
    for (const t of tickets) {
      const asg = (t as any).assigned_user_id;
      const status = (t as any).status;
      if (!asg) continue;
      if (status === "solve") {
        solved.set(asg, (solved.get(asg) ?? 0) + 1);
      } else {
        workload.set(asg, (workload.get(asg) ?? 0) + 1);
      }
    }
    const users = await getUsers();
    for (const u of users) {
      const desiredSolved = solved.get(u.id) ?? 0;
      const desiredWorkload = workload.get(u.id) ?? 0;
      if ((u.solved_count ?? 0) !== desiredSolved || (u.workload ?? 0) !== desiredWorkload) {
        const updated = { ...u, solved_count: desiredSolved, workload: desiredWorkload, updated_at: new Date().toISOString() } as LocalUser;
        await db.table('users').put(updated);
        try { console.debug('[localDb] recomputeUserStats updated', updated.id, updated.workload, updated.solved_count); } catch(e) {}
      }
    }
  } catch (e) {
    console.error('recomputeUserStats failed', e);
  }
}

export async function deleteTicketsByCustomerName(name: string): Promise<number> {
  try {
    const table = db.table<LocalTicket>('tickets');
    // Dexie supports where().equals().delete()
    const deleted = await table.where('customer_name').equals(name).delete();
    try { console.debug('[localDb] deleteTicketsByCustomerName ->', name, deleted); } catch (e) {}
    return deleted as number;
  } catch (e) {
    console.error('deleteTicketsByCustomerName failed', e);
    return 0;
  }
}
