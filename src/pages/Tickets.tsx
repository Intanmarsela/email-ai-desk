import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { Status, Priority, TicketFilters } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { NewEmailDialog } from "@/components/NewEmailDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Tickets = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TicketFilters>({});
  const [search, setSearch] = useState("");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", filters],
    queryFn: () => api.tickets.list(filters),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.users.list(),
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
      return (
        t.customer_name.toLowerCase().includes(searchLower) ||
        t.problem.toLowerCase().includes(searchLower) ||
        t.customer_email.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
            <p className="text-sm text-muted-foreground">Manage and route customer support tickets</p>
          </div>
          <NewEmailDialog />
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
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
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
              filteredTickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">{ticket.customer_name}</div>
                      <div className="text-sm text-muted-foreground">{ticket.customer_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md">
                      <div className="font-medium truncate">{ticket.problem}</div>
                      <div className="text-sm text-muted-foreground truncate">{ticket.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium capitalize">{getSolverName(ticket)}</div>
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={ticket.priority} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
