import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, TrendingUp } from "lucide-react";
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

interface TaskCardProps {
  task: Task;
  onToggleComplete: (taskId: string, currentStatus: string) => void;
  onClick: (taskId: string) => void;
}

const TaskCard = ({ task, onToggleComplete, onClick }: TaskCardProps) => {
  const priorityColors = {
    high: "bg-destructive text-destructive-foreground",
    medium: "bg-warning text-warning-foreground",
    low: "bg-success text-success-foreground",
  };

  const statusLabels = {
    not_started: "Not Started",
    in_progress: "In Progress",
    completed: "Completed",
  };

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== "completed";
  const progress = task.status === "completed" ? 100 : task.progress;
  const showProgressFill = progress > 0;

  // Shared content renderer for both layers
  const renderContent = (inverted: boolean) => (
    <div className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.status === "completed"}
          onCheckedChange={() => onToggleComplete(task.id, task.status)}
          onClick={(e) => e.stopPropagation()}
          className={`mt-1 transition-transform duration-200 group-hover:scale-110 ${
            inverted 
              ? "border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary" 
              : "border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          }`}
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`font-heading font-semibold text-lg transition-colors duration-200 ${
                task.status === "completed" ? "line-through opacity-80" : ""
              } ${inverted ? "text-primary-foreground" : "text-foreground group-hover:text-primary"}`}
            >
              {task.title}
            </h3>
            <Badge 
              className={`transition-transform duration-200 group-hover:scale-105 shrink-0 ${
                inverted 
                  ? "bg-primary-foreground/20 text-primary-foreground border border-primary-foreground/30" 
                  : priorityColors[task.priority]
              }`}
            >
              {task.priority}
            </Badge>
          </div>

          {task.description && (
            <p className={`text-sm line-clamp-2 ${inverted ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
              {task.description}
            </p>
          )}

          <div className={`flex flex-wrap items-center gap-3 text-sm ${inverted ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
            {task.due_date && (
              <div className={`flex items-center gap-1 ${isOverdue ? "font-medium" : ""}`}>
                <Calendar className={`h-4 w-4 ${isOverdue && !inverted ? "text-destructive" : ""}`} />
                <span>{format(new Date(task.due_date), "MMM d, h:mm a")}</span>
                {isOverdue && (
                  <span className={`ml-1 font-semibold ${inverted ? "text-primary-foreground" : "text-destructive"}`}>
                    OVERDUE
                  </span>
                )}
              </div>
            )}
            {task.estimated_duration && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {task.estimated_duration}min
              </div>
            )}
            <Badge
              variant="outline"
              className={`capitalize ${
                inverted 
                  ? "border-primary-foreground/50 text-primary-foreground bg-primary-foreground/10" 
                  : "border-border text-foreground"
              }`}
            >
              {task.category}
            </Badge>
          </div>

          {showProgressFill && task.status !== "completed" && (
            <div className={`text-xs font-medium ${inverted ? "text-primary-foreground" : "text-foreground"}`}>
              {progress}% complete
            </div>
          )}

          <Badge
            variant="secondary"
            className={`text-xs ${
              inverted 
                ? "bg-primary-foreground/20 text-primary-foreground border border-primary-foreground/30" 
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            {statusLabels[task.status]}
          </Badge>
        </div>
      </div>
    </div>
  );

  return (
    <Card
      className={`cursor-pointer transition-all duration-300 hover:shadow-[var(--shadow-lift)] hover:-translate-y-1 hover:scale-[1.01] group relative overflow-hidden rounded-2xl border-0 ${
        isOverdue ? "ring-2 ring-destructive ring-offset-2" : ""
      }`}
      onClick={() => onClick(task.id)}
    >
      {/* Base layer - normal colors (visible in unfilled area) */}
      <div className="relative">
        {renderContent(false)}
      </div>

      {/* Progress fill layer - inverted colors clipped to progress */}
      {showProgressFill && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-primary to-primary/90 transition-all duration-500 ease-out"
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

export default TaskCard;