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

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isOverdue ? "border-destructive border-2" : ""
      }`}
      onClick={() => onClick(task.id)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.status === "completed"}
            onCheckedChange={(checked) => {
              onToggleComplete(task.id, task.status);
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-1"
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={`font-heading font-semibold text-lg ${
                  task.status === "completed" ? "line-through text-muted-foreground" : ""
                }`}
              >
                {task.title}
              </h3>
              <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
            </div>

            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {task.due_date && (
                <div className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : ""}`}>
                  <Calendar className="h-4 w-4" />
                  {format(new Date(task.due_date), "MMM d, h:mm a")}
                  {isOverdue && <span className="ml-1 font-semibold">OVERDUE</span>}
                </div>
              )}
              {task.estimated_duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {task.estimated_duration}min
                </div>
              )}
              <Badge variant="outline" className="capitalize">
                {task.category}
              </Badge>
            </div>

            {task.progress > 0 && task.status !== "completed" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{task.progress}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            )}

            <Badge variant="secondary" className="text-xs">
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
