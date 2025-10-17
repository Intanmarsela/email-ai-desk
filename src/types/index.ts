export type Department = "customer_service" | "finance" | "operational" | "chatbot";
export type Status = "listed" | "on_going" | "solve";
export type Priority = "low" | "medium" | "high";
export type Category = "billing" | "refund" | "login" | "shipping" | "cancellation" | "technical" | "other";
export type ActorType = "system" | "agent1" | "agent2" | "human";
export type EventType = "created" | "auto_replied" | "assigned" | "priority_changed" | "status_changed" | "note_added" | "resolved";

export interface User {
  id: string;
  name: string;
  email: string;
  department: Department;
  skills: string[];
  active: boolean;
  workload: number;
  solved_count: number;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  external_ref: string;
  customer_name: string;
  customer_email: string;
  problem: string;
  description: string;
  status: Status;
  priority: Priority;
  category: Category;
  assigned_user_id: string | null;
  assigned_department: Department;
  agent1_auto_answered: boolean;
  agent1_answer: string | null;
  agent2_confidence: number;
  sla_due_at: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface TicketEvent {
  id: string;
  ticket_id: string;
  actor_type: ActorType;
  event_type: EventType;
  payload: Record<string, any>;
  created_at: string;
}

export interface FAQDoc {
  id: string;
  title: string;
  content: string;
  url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketFilters {
  status?: Status;
  priority?: Priority;
  assignee?: string;
  department?: Department;
  q?: string;
}

export interface AdjustTicketRequest {
  status?: Status;
  priority?: Priority;
  assigned_user_id?: string | null;
  assigned_department?: Department;
}

export interface IngestEmailRequest {
  customer_name: string;
  customer_email: string;
  subject: string;
  body: string;
}
