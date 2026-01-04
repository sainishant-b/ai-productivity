import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ListTodo } from "lucide-react";

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
}

interface SubtaskListProps {
  taskId: string;
}

const SubtaskList = ({ taskId }: SubtaskListProps) => {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadSubtasks();
  }, [taskId]);

  const loadSubtasks = async () => {
    const { data, error } = await supabase
      .from("subtasks")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load subtasks:", error);
      return;
    }

    setSubtasks(data || []);
  };

  const addSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to add subtasks");
      return;
    }

    const { error } = await supabase.from("subtasks").insert({
      task_id: taskId,
      user_id: user.id,
      title: newSubtaskTitle.trim(),
    });

    if (error) {
      toast.error("Failed to add subtask");
      return;
    }

    setNewSubtaskTitle("");
    setIsAdding(false);
    loadSubtasks();
  };

  const toggleSubtask = async (subtask: Subtask) => {
    const { error } = await supabase
      .from("subtasks")
      .update({ 
        completed: !subtask.completed,
        completed_at: !subtask.completed ? new Date().toISOString() : null
      })
      .eq("id", subtask.id);

    if (error) {
      toast.error("Failed to update subtask");
      return;
    }

    loadSubtasks();
  };

  const deleteSubtask = async (subtaskId: string) => {
    const { error } = await supabase
      .from("subtasks")
      .delete()
      .eq("id", subtaskId);

    if (error) {
      toast.error("Failed to delete subtask");
      return;
    }

    loadSubtasks();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addSubtask();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewSubtaskTitle("");
    }
  };

  const completedCount = subtasks.filter(s => s.completed).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Subtasks {subtasks.length > 0 && `(${completedCount}/${subtasks.length})`}
          </span>
        </div>
        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="flex items-center gap-3 group p-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              checked={subtask.completed}
              onCheckedChange={() => toggleSubtask(subtask)}
              className="h-5 w-5"
            />
            <span
              className={`flex-1 text-sm ${
                subtask.completed ? "line-through text-muted-foreground" : ""
              }`}
            >
              {subtask.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              onClick={() => deleteSubtask(subtask.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {isAdding && (
          <div className="flex items-center gap-2 p-2">
            <Checkbox disabled className="h-5 w-5" />
            <Input
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter subtask title..."
              className="flex-1 h-8"
              autoFocus
            />
            <Button size="sm" onClick={addSubtask} className="h-8">
              Add
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewSubtaskTitle("");
              }}
              className="h-8"
            >
              Cancel
            </Button>
          </div>
        )}

        {subtasks.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground py-2">
            No subtasks yet. Click "Add" to create one.
          </p>
        )}
      </div>
    </div>
  );
};

export default SubtaskList;
