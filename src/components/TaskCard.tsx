import { Card, CardContent } from "@/components/ui/card";
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

  return (
    <Card
      className={`cursor-pointer transition-all duration-300 hover:shadow-[var(--shadow-lift)] hover:-translate-y-1 group relative overflow-hidden ${
        isOverdue ? "border-destructive border-2" : ""
      }`}
      onClick={() => onClick(task.id)}
    >
      {/* Progress fill background */}
      {showProgressFill && (
        <div
          className="absolute inset-0 bg-primary/90 transition-all duration-500 ease-out"
          style={{
            clipPath: `inset(0 ${100 - progress}% 0 0)`,
          }}
        />
      )}

      <CardContent className="p-4 space-y-3 relative z-10">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.status === "completed"}
            onCheckedChange={(checked) => {
              onToggleComplete(task.id, task.status);
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 transition-transform duration-200 group-hover:scale-110 border-current"
            style={{
              // Use mix-blend-mode for checkbox visibility
            }}
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={`font-heading font-semibold text-lg transition-colors duration-200 ${
                  task.status === "completed" ? "line-through opacity-80" : ""
                }`}
                style={{
                  background: showProgressFill
                    ? `linear-gradient(to right, hsl(var(--primary-foreground)) ${progress}%, hsl(var(--foreground)) ${progress}%)`
                    : undefined,
                  WebkitBackgroundClip: showProgressFill ? "text" : undefined,
                  WebkitTextFillColor: showProgressFill ? "transparent" : undefined,
                  backgroundClip: showProgressFill ? "text" : undefined,
                }}
              >
                {task.title}
              </h3>
              <Badge className={`${priorityColors[task.priority]} transition-transform duration-200 group-hover:scale-105 shrink-0`}>
                {task.priority}
              </Badge>
            </div>

            {task.description && (
              <p
                className="text-sm line-clamp-2"
                style={{
                  background: showProgressFill
                    ? `linear-gradient(to right, hsl(var(--primary-foreground) / 0.8) ${progress}%, hsl(var(--muted-foreground)) ${progress}%)`
                    : undefined,
                  WebkitBackgroundClip: showProgressFill ? "text" : undefined,
                  WebkitTextFillColor: showProgressFill ? "transparent" : undefined,
                  backgroundClip: showProgressFill ? "text" : undefined,
                  color: !showProgressFill ? "hsl(var(--muted-foreground))" : undefined,
                }}
              >
                {task.description}
              </p>
            )}

            <div
              className="flex flex-wrap items-center gap-3 text-sm"
              style={{
                background: showProgressFill
                  ? `linear-gradient(to right, hsl(var(--primary-foreground) / 0.8) ${progress}%, hsl(var(--muted-foreground)) ${progress}%)`
                  : undefined,
                WebkitBackgroundClip: showProgressFill ? "text" : undefined,
                WebkitTextFillColor: showProgressFill ? "transparent" : undefined,
                backgroundClip: showProgressFill ? "text" : undefined,
                color: !showProgressFill ? "hsl(var(--muted-foreground))" : undefined,
              }}
            >
              {task.due_date && (
                <div className={`flex items-center gap-1 ${isOverdue ? "font-medium" : ""}`}>
                  <Calendar className="h-4 w-4" style={{ color: isOverdue && !showProgressFill ? "hsl(var(--destructive))" : "currentColor" }} />
                  <span>{format(new Date(task.due_date), "MMM d, h:mm a")}</span>
                  {isOverdue && <span className="ml-1 font-semibold">OVERDUE</span>}
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
                className="capitalize"
                style={{
                  borderColor: showProgressFill ? "hsl(var(--primary-foreground) / 0.5)" : undefined,
                  color: showProgressFill ? "hsl(var(--primary-foreground))" : undefined,
                }}
              >
                {task.category}
              </Badge>
            </div>

            {showProgressFill && task.status !== "completed" && (
              <div
                className="text-xs font-medium"
                style={{
                  background: `linear-gradient(to right, hsl(var(--primary-foreground)) ${progress}%, hsl(var(--foreground)) ${progress}%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {progress}% complete
              </div>
            )}

            <Badge
              variant="secondary"
              className="text-xs"
              style={{
                background: showProgressFill ? "hsl(var(--primary-foreground) / 0.2)" : undefined,
                color: showProgressFill ? "hsl(var(--primary-foreground))" : undefined,
              }}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              {statusLabels[task.status]}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskCard;
