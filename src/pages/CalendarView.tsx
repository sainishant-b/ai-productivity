import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TaskCalendar } from "@/components/TaskCalendar";
import TaskDialog from "@/components/TaskDialog";
import { Button } from "@/components/ui/button";
import { Calendar, List, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function CalendarView() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [loading, setLoading] = useState(true);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/task/${taskId}`);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsTaskDialogOpen(true);
  };

  const handleSaveTask = async (taskData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newTask = {
        ...taskData,
        user_id: user.id,
        due_date: selectedDate?.toISOString(),
      };

      const { error } = await supabase.from("tasks").insert([newTask]);

      if (error) throw error;

      toast.success("Task created successfully");
      fetchTasks();
      setIsTaskDialogOpen(false);
      setSelectedDate(null);
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="font-serif text-2xl">Calendar</h1>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={viewMode === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("month")}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Month
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("week")}
              >
                <List className="h-4 w-4 mr-2" />
                Week
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Calendar */}
      <main className="container mx-auto px-4 py-8">
        <TaskCalendar
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onDateClick={handleDateClick}
          viewMode={viewMode}
        />
      </main>

      {/* Task Dialog */}
      <TaskDialog
        open={isTaskDialogOpen}
        onClose={() => {
          setIsTaskDialogOpen(false);
          setSelectedDate(null);
        }}
        onSave={handleSaveTask}
      />
    </div>
  );
}
