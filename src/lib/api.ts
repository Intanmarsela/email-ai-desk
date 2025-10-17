import type { Ticket, User, TicketFilters, AdjustTicketRequest, IngestEmailRequest, TicketEvent } from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const api = {
  tickets: {
    list: async (filters?: TicketFilters): Promise<Ticket[]> => {
      const params = new URLSearchParams();
      if (filters?.status) params.append("status", filters.status);
      if (filters?.priority) params.append("priority", filters.priority);
      if (filters?.assignee) params.append("assignee", filters.assignee);
      if (filters?.q) params.append("q", filters.q);

      const response = await fetch(`${API_BASE_URL}/tickets?${params}`);
      if (!response.ok) throw new Error("Failed to fetch tickets");
      return response.json();
    },

    get: async (id: string): Promise<Ticket> => {
      const response = await fetch(`${API_BASE_URL}/tickets/${id}`);
      if (!response.ok) throw new Error("Failed to fetch ticket");
      return response.json();
    },

    adjust: async (id: string, data: AdjustTicketRequest): Promise<Ticket> => {
      const response = await fetch(`${API_BASE_URL}/tickets/${id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to adjust ticket");
      return response.json();
    },

    retriage: async (id: string): Promise<Ticket> => {
      const response = await fetch(`${API_BASE_URL}/tickets/${id}/retriage`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to retriage ticket");
      return response.json();
    },

    events: async (id: string): Promise<TicketEvent[]> => {
      const response = await fetch(`${API_BASE_URL}/tickets/${id}/events`);
      if (!response.ok) throw new Error("Failed to fetch ticket events");
      return response.json();
    },
  },

  users: {
    list: async (): Promise<User[]> => {
      const response = await fetch(`${API_BASE_URL}/users`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },

    create: async (data: Partial<User>): Promise<User> => {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create user");
      return response.json();
    },
  },

  ai: {
    faqAnswer: async (ticketId: string): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/ai/faq_answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: ticketId }),
      });
      if (!response.ok) throw new Error("Failed to get FAQ answer");
      return response.json();
    },

    triage: async (ticketId: string): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/ai/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: ticketId }),
      });
      if (!response.ok) throw new Error("Failed to triage ticket");
      return response.json();
    },
  },

  emails: {
    ingest: async (data: IngestEmailRequest): Promise<Ticket> => {
      const response = await fetch(`${API_BASE_URL}/emails/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to ingest email");
      return response.json();
    },
  },
};
