import { Badge } from "@/components/ui/badge";
import type { Status } from "@/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const variants = {
    listed: "bg-status-listed text-status-listed-foreground",
    on_going: "bg-status-ongoing text-status-ongoing-foreground",
    solve: "bg-status-solved text-status-solved-foreground",
  };

  const labels = {
    listed: "Listed",
    on_going: "On-going",
    solve: "Solved",
  };

  return (
    <Badge className={cn(variants[status], "font-medium", className)}>
      {labels[status]}
    </Badge>
  );
};
