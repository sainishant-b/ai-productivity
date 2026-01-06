import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import CompactTaskCard from "./CompactTaskCard";

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

interface CompletedTasksSectionProps {
  tasks: Task[];
  onToggleComplete: (taskId: string, currentStatus: string) => void;
  onClick: (taskId: string) => void;
}

const CompletedTasksSection = ({ tasks, onToggleComplete, onClick }: CompletedTasksSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm font-medium text-muted-foreground">
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Completed Tasks ({tasks.length})
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="opacity-60">
            <CompactTaskCard
              task={task}
              onToggleComplete={onToggleComplete}
              onClick={onClick}
            />
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default CompletedTasksSection;
