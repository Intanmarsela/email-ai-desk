import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const NewEmailDialog = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    subject: "",
    body: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const ingestMutation = useMutation({
    mutationFn: api.emails.ingest,
    onSuccess: () => {
      toast({
        title: "Email ingested",
        description: "New ticket created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setOpen(false);
      setFormData({ customer_name: "", customer_email: "", subject: "", body: "" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ingestMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Mail className="h-4 w-4" />
          New Email
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Simulate New Email</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer_name">Customer Name</Label>
            <Input
              id="customer_name"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer_email">Customer Email</Label>
            <Input
              id="customer_email"
              type="email"
              value={formData.customer_email}
              onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={6}
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={ingestMutation.isPending}>
              {ingestMutation.isPending ? "Creating..." : "Create Ticket"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
