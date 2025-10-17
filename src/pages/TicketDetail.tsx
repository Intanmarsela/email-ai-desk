import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, RefreshCw, Clock, Mail, Bot, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Status, Priority, Department } from "@/types";
import { useState } from "react";

export const TicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [adjustments, setAdjustments] = useState<{
    status?: Status;
    priority?: Priority;
    assigned_user_id?: string | null;
    assigned_department?: Department;
  }>({});

  const { data: ticket } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => api.tickets.get(id!),
    enabled: !!id,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["ticket-events", id],
    queryFn: () => api.tickets.events(id!),
    enabled: !!id,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.users.list(),
  });

  const adjustMutation = useMutation({
    mutationFn: () => api.tickets.adjust(id!, adjustments),
    onSuccess: () => {
      toast({ title: "Ticket updated", description: "Changes saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-events", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setAdjustments({});
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update ticket", variant: "destructive" });
    },
  });

  const retriageMutation = useMutation({
    mutationFn: () => api.tickets.retriage(id!),
    onSuccess: () => {
      toast({ title: "Re-triaged", description: "Ticket has been re-analyzed by Agent-2" });
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-events", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  if (!ticket) return null;

  const slaHours = ticket.priority === "high" ? 24 : ticket.priority === "medium" ? 72 : 120;
  const slaRemaining = new Date(ticket.sla_due_at).getTime() - Date.now();
  const slaExpired = slaRemaining < 0;

  const getEventIcon = (type: string) => {
    switch (type) {
      case "created": return <Mail className="h-4 w-4" />;
      case "auto_replied": return <Bot className="h-4 w-4" />;
      case "assigned": return <User className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      <div className="border-b bg-card p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{ticket.problem}</h1>
            <p className="text-sm text-muted-foreground">Ticket #{ticket.id.slice(0, 8)}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">From</Label>
                  <div className="mt-1">
                    <div className="font-medium">{ticket.customer_name}</div>
                    <div className="text-sm text-muted-foreground">{ticket.customer_email}</div>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="text-muted-foreground">Subject</Label>
                  <div className="mt-1 font-medium">{ticket.problem}</div>
                </div>
                <Separator />
                <div>
                  <Label className="text-muted-foreground">Message</Label>
                  <div className="mt-1 text-sm leading-relaxed">{ticket.description}</div>
                </div>
                {ticket.tags.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex gap-2 flex-wrap">
                      {ticket.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {ticket.agent1_auto_answered && ticket.agent1_answer && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Bot className="h-5 w-5" />
                    AI Auto-Response
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{ticket.agent1_answer}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Event Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        {getEventIcon(event.event_type)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium capitalize">{event.event_type.replace("_", " ")}</div>
                        <div className="text-sm text-muted-foreground">
                          by {event.actor_type} • {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SLA Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-lg font-bold ${slaExpired ? "text-destructive" : "text-foreground"}`}>
                  {slaExpired ? "Overdue" : formatDistanceToNow(new Date(ticket.sla_due_at))}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Target: {slaHours}h from creation
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Adjustments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={adjustments.status || ticket.status}
                    onValueChange={(v) => setAdjustments({ ...adjustments, status: v as Status })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="listed">Listed</SelectItem>
                      <SelectItem value="on_going">On-going</SelectItem>
                      <SelectItem value="solve">Solved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={adjustments.priority || ticket.priority}
                    onValueChange={(v) => setAdjustments({ ...adjustments, priority: v as Priority })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assign to User</Label>
                  <Select
                    value={adjustments.assigned_user_id ?? ticket.assigned_user_id ?? "unassigned"}
                    onValueChange={(v) =>
                      setAdjustments({ ...adjustments, assigned_user_id: v === "unassigned" ? null : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.department})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={adjustments.assigned_department || ticket.assigned_department}
                    onValueChange={(v) => setAdjustments({ ...adjustments, assigned_department: v as Department })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer_service">Customer Service</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="operational">Operational</SelectItem>
                      <SelectItem value="chatbot">Chatbot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => adjustMutation.mutate()}
                    disabled={adjustMutation.isPending || Object.keys(adjustments).length === 0}
                  >
                    Save Changes
                  </Button>
                </div>

                <Separator />

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => retriageMutation.mutate()}
                  disabled={retriageMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4" />
                  Re-triage with Agent-2
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <div className="mt-1 font-medium capitalize">{ticket.category}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Confidence</Label>
                  <div className="mt-1 font-medium">{(ticket.agent2_confidence * 100).toFixed(0)}%</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
