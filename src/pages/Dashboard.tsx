import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, Calendar, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import CompactTaskCard from "@/components/CompactTaskCard";
import CompletedTasksSection from "@/components/CompletedTasksSection";
import TaskDialog from "@/components/TaskDialog";
import CheckInModal from "@/components/CheckInModal";
import AIRecommendations from "@/components/AIRecommendations";
import NotificationPrompt from "@/components/NotificationPrompt";
import StatsSidebar from "@/components/StatsSidebar";
import MobileStatsBar from "@/components/MobileStatsBar";
import { useCheckInScheduler } from "@/hooks/useCheckInScheduler";
import { useNotifications } from "@/hooks/useNotifications";
import { useTaskReminders } from "@/hooks/useTaskReminders";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(true);
  
  const { permission } = useNotifications();

  const checkInQuestions = [
    "What are you working on right now?",
    "How's your progress going?",
    "What's your energy level right now? (1-10)",
    "Feeling stuck on anything?",
    "What did you accomplish in the last hour?",
  ];

  const { formatNextCheckIn, isWorkHours } = useCheckInScheduler(profile, () => {
    if (!showCheckIn) {
      toast.info("Time for a check-in", {
        duration: 5000,
        action: {
          label: "Check-in",
          onClick: () => setShowCheckIn(true),
        },
      });
    }
  });

  useTaskReminders({ tasks, enabled: permission === "granted" });
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const handleOpenCheckIn = () => {
      setShowCheckIn(true);
    };
    
    window.addEventListener("open-checkin", handleOpenCheckIn);
    return () => window.removeEventListener("open-checkin", handleOpenCheckIn);
  }, []);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchProfile();
    }
  }, [user]);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) toast.error("Failed to load tasks");
    else setTasks(data || []);
    setLoading(false);
  };

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    setProfile(data);
  };

  const handleSaveTask = async (taskData: any) => {
    if (selectedTask) {
      const { error } = await supabase
        .from("tasks")
        .update(taskData)
        .eq("id", selectedTask.id);
      
      if (error) toast.error("Failed to update task");
      else toast.success("Task updated!");
    } else {
      const { error } = await supabase
        .from("tasks")
        .insert([{ ...taskData, user_id: user.id }]);
      
      if (error) toast.error("Failed to create task");
      else toast.success("Task created!");
    }
    
    fetchTasks();
    setSelectedTask(null);
  };

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "in_progress" : "completed";
    const { error } = await supabase
      .from("tasks")
      .update({ 
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
        progress: newStatus === "completed" ? 100 : undefined
      })
      .eq("id", taskId);
    
    if (error) toast.error("Failed to update task");
    else if (newStatus === "completed") toast.success("Task completed");
    
    fetchTasks();
  };

  const handleCheckInSubmit = async (response: string, mood?: string, energyLevel?: number) => {
    const randomQuestion = checkInQuestions[Math.floor(Math.random() * checkInQuestions.length)];
    
    const { error } = await supabase.from("check_ins").insert([{
      user_id: user.id,
      question: randomQuestion,
      response,
      mood,
      energy_level: energyLevel,
    }]);

    if (!error && profile) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastCheckIn = profile.last_check_in_date ? new Date(profile.last_check_in_date) : null;
      if (lastCheckIn) lastCheckIn.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (!lastCheckIn || lastCheckIn.getTime() !== today.getTime()) {
        let newStreak = 1;
        
        if (lastCheckIn && lastCheckIn.getTime() === yesterday.getTime()) {
          newStreak = profile.current_streak + 1;
        }
        
        await supabase.from("profiles").update({
          current_streak: newStreak,
          longest_streak: Math.max(profile.longest_streak, newStreak),
          last_check_in_date: new Date().toISOString(),
        }).eq("id", user.id);
        
        fetchProfile();
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const activeTasks = tasks.filter(t => t.status !== "completed");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const completedCount = completedTasks.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-2">
          <h1 className="font-heading text-lg font-bold tracking-tight">AI Productivity</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCheckIn(true)} className="text-xs h-8 px-3 rounded-lg">
              Check-in
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/calendar")} className="text-xs h-8 px-3 rounded-lg hidden sm:flex">
              <Calendar className="h-3.5 w-3.5 mr-1" />
              Calendar
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/insights")} className="text-xs h-8 px-3 rounded-lg hidden sm:flex">
              <BarChart3 className="h-3.5 w-3.5 mr-1" />
              Insights
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/settings")} className="text-xs h-8 px-3 rounded-lg hidden sm:flex">
              Settings
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile stats bar */}
      <MobileStatsBar streak={profile?.current_streak || 0} completedCount={completedCount} />

      {/* Main layout */}
      <div className="flex">
        {/* Sticky sidebar - desktop only */}
        <div className="hidden lg:block p-4">
          <StatsSidebar
            streak={profile?.current_streak || 0}
            completedCount={completedCount}
            nextCheckIn={formatNextCheckIn()}
            isWorkHours={isWorkHours}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 p-4 max-w-4xl">
          {showNotificationPrompt && permission === "default" && (
            <div className="mb-4">
              <NotificationPrompt onDismiss={() => setShowNotificationPrompt(false)} />
            </div>
          )}

          {/* AI Recommendations */}
          {user && (
            <div className="mb-4">
              <AIRecommendations onTaskUpdate={fetchTasks} />
            </div>
          )}

          {/* Task header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-lg font-bold">
              Active Tasks
              {activeTasks.length > 0 && (
                <span className="text-muted-foreground font-normal text-sm ml-2">({activeTasks.length})</span>
              )}
            </h2>
            <Button 
              onClick={() => { setSelectedTask(null); setShowTaskDialog(true); }}
              size="sm"
              className="h-8 px-3 text-xs rounded-lg"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Task
            </Button>
          </div>

          {/* Task list */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center rounded-xl border-dashed border-2 border-border/50 bg-card/50">
              <p className="text-muted-foreground mb-3 text-sm">No tasks yet. Create your first task!</p>
              <Button onClick={() => setShowTaskDialog(true)} size="sm" className="rounded-lg">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create Task
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {activeTasks.map((task) => (
                <CompactTaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                  onClick={(id) => navigate(`/task/${id}`)}
                />
              ))}

              {/* Completed tasks section */}
              <CompletedTasksSection
                tasks={completedTasks}
                onToggleComplete={handleToggleComplete}
                onClick={(id) => navigate(`/task/${id}`)}
              />
            </div>
          )}
        </main>
      </div>

      <TaskDialog
        open={showTaskDialog}
        onClose={() => { setShowTaskDialog(false); setSelectedTask(null); }}
        onSave={handleSaveTask}
        task={selectedTask}
      />

      <CheckInModal
        open={showCheckIn}
        onClose={() => setShowCheckIn(false)}
        question={checkInQuestions[Math.floor(Math.random() * checkInQuestions.length)]}
        onSubmit={handleCheckInSubmit}
      />
    </div>
  );
};

export default Dashboard;
