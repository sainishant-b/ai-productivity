import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock } from "lucide-react";
import { format, isPast } from "date-fns";

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "high" | "medium" | "low";
  status: "not_started" | "in_progress" | "completed";
  due_date?: string;
  estimated_duration?: number;
  category: string;
  progress: number;
}

interface CompactTaskCardProps {
  task: Task;
  onToggleComplete: (taskId: string, currentStatus: string) => void;
  onClick: (taskId: string) => void;
}

const CompactTaskCard = ({ task, onToggleComplete, onClick }: CompactTaskCardProps) => {
  const priorityColors = {
    high: "bg-destructive text-destructive-foreground",
    medium: "bg-warning text-warning-foreground",
    low: "bg-success text-success-foreground",
  };

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== "completed";
  const progress = task.status === "completed" ? 100 : task.progress;
  const showProgressFill = progress > 0;

  const renderContent = (inverted: boolean) => (
    <div className="flex items-center gap-3 px-3 py-2">
      <Checkbox
        checked={task.status === "completed"}
        onCheckedChange={() => onToggleComplete(task.id, task.status)}
        onClick={(e) => e.stopPropagation()}
        className={`shrink-0 transition-transform duration-200 hover:scale-110 ${
          inverted 
            ? "border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary" 
            : "border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        }`}
      />
      
      <span
        className={`flex-1 font-medium text-sm truncate ${
          task.status === "completed" ? "line-through opacity-60" : ""
        } ${inverted ? "text-primary-foreground" : "text-foreground"}`}
      >
        {task.title}
      </span>

      {task.due_date && (
        <div className={`hidden sm:flex items-center gap-1 text-xs shrink-0 ${
          isOverdue && !inverted ? "text-destructive font-medium" : inverted ? "text-primary-foreground/70" : "text-muted-foreground"
        }`}>
          <Calendar className="h-3 w-3" />
          {format(new Date(task.due_date), "MMM d")}
        </div>
      )}

      {task.estimated_duration && (
        <div className={`hidden md:flex items-center gap-1 text-xs shrink-0 ${
          inverted ? "text-primary-foreground/70" : "text-muted-foreground"
        }`}>
          <Clock className="h-3 w-3" />
          {task.estimated_duration}m
        </div>
      )}

      <Badge
        variant="outline"
        className={`hidden sm:inline-flex text-xs capitalize shrink-0 ${
          inverted 
            ? "border-primary-foreground/50 text-primary-foreground bg-primary-foreground/10" 
            : "border-border text-foreground"
        }`}
      >
        {task.category}
      </Badge>

      <Badge 
        className={`text-xs shrink-0 ${
          inverted 
            ? "bg-primary-foreground/20 text-primary-foreground border border-primary-foreground/30" 
            : priorityColors[task.priority]
        }`}
      >
        {task.priority}
      </Badge>
    </div>
  );

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group relative overflow-hidden rounded-lg border-0 ${
        isOverdue ? "ring-1 ring-destructive ring-offset-1" : ""
      }`}
      onClick={() => onClick(task.id)}
    >
      <div className="relative">
        {renderContent(false)}
      </div>

      {showProgressFill && (
        <div
          className="absolute inset-0 bg-primary transition-all duration-500 ease-out"
          style={{
            clipPath: `inset(0 ${100 - progress}% 0 0)`,
          }}
        >
          {renderContent(true)}
        </div>
      )}
    </Card>
  );
};

export default CompactTaskCard;
