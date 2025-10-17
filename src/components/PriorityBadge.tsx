import { Badge } from "@/components/ui/badge";
import type { Priority } from "@/types";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export const PriorityBadge = ({ priority, className }: PriorityBadgeProps) => {
  const variants = {
    low: "bg-priority-low text-priority-low-foreground border border-border",
    medium: "bg-priority-medium text-priority-medium-foreground",
    high: "bg-priority-high text-priority-high-foreground ring-2 ring-priority-high/20",
  };

  const labels = {
    low: "Low",
    medium: "Medium",
    high: "High",
  };

  return (
    <Badge className={cn(variants[priority], "font-medium gap-1", className)}>
      {priority === "high" && <AlertCircle className="h-3 w-3" />}
      {labels[priority]}
    </Badge>
  );
};
