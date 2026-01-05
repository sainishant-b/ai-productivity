import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Flame, LogOut, Sparkles, Clock, Calendar, BarChart3, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import TaskCard from "@/components/TaskCard";
import TaskDialog from "@/components/TaskDialog";
import CheckInModal from "@/components/CheckInModal";
import AIRecommendations from "@/components/AIRecommendations";
import NotificationPrompt from "@/components/NotificationPrompt";
import CountUpNumber from "@/components/CountUpNumber";
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
  
  const { permission, sendNotification } = useNotifications();

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

  // Task reminders for due/overdue tasks
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

  // Listen for notification clicks to open check-in
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
      
      // Only update if we haven't checked in today
      if (!lastCheckIn || lastCheckIn.getTime() !== today.getTime()) {
        let newStreak = 1;
        
        // If last check-in was yesterday, continue the streak
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

  const topTasks = tasks.filter(t => t.status !== "completed").slice(0, 3);
  const completedCount = tasks.filter(t => t.status === "completed").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3 sm:mb-0">
            <h1 className="font-heading text-lg sm:text-2xl font-bold tracking-tight">AI Productivity</h1>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="transition-all duration-200 hover:scale-110 sm:hidden">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:mt-3 lg:mt-0 lg:absolute lg:right-4 lg:top-1/2 lg:-translate-y-1/2">
            <Button variant="outline" size="sm" onClick={() => setShowCheckIn(true)} className="text-xs sm:text-sm px-3 sm:px-4 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md border-border/50 bg-card/50 backdrop-blur-sm">
              Check-in
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/calendar")} className="text-xs sm:text-sm px-3 sm:px-4 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md border-border/50 bg-card/50 backdrop-blur-sm">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Calendar
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/insights")} className="text-xs sm:text-sm px-3 sm:px-4 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md border-border/50 bg-card/50 backdrop-blur-sm">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Insights
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/settings")} className="text-xs sm:text-sm px-3 sm:px-4 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md border-border/50 bg-card/50 backdrop-blur-sm">
              Settings
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="transition-all duration-200 hover:scale-110 hidden sm:flex">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-5">
          {/* Streak Card */}
          <Card className="relative overflow-hidden gradient-card rounded-2xl border-0 shadow-[var(--shadow-lg)] transition-all duration-300 hover:shadow-[var(--shadow-xl)] hover:-translate-y-1 group animate-fade-in-up stagger-1">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-orange/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="pb-2 relative">
              <CardTitle className="font-heading text-sm font-medium flex items-center gap-2.5 text-muted-foreground">
                <div className="p-2 rounded-xl bg-accent-orange/10 group-hover:bg-accent-orange/20 transition-colors duration-300">
                  <Flame className="h-5 w-5 text-accent-orange animate-icon-pulse" />
                </div>
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent className="relative pt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold font-heading tracking-tight">
                  <CountUpNumber value={profile?.current_streak || 0} />
                </span>
                <span className="text-lg font-light text-muted-foreground">
                  {(profile?.current_streak || 0) === 1 ? 'day' : 'days'}
                </span>
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-orange/50 to-accent-orange opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Card>

          {/* Next Check-in Card */}
          <Card className="relative overflow-hidden gradient-card rounded-2xl border-0 shadow-[var(--shadow-lg)] transition-all duration-300 hover:shadow-[var(--shadow-xl)] hover:-translate-y-1 group animate-fade-in-up stagger-2">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="pb-2 relative">
              <CardTitle className="font-heading text-sm font-medium flex items-center gap-2.5 text-muted-foreground">
                <div className="p-2 rounded-xl bg-accent-blue/10 group-hover:bg-accent-blue/20 transition-colors duration-300">
                  <Clock className="h-5 w-5 text-accent-blue" />
                </div>
                Next Check-in
              </CardTitle>
            </CardHeader>
            <CardContent className="relative pt-2">
              <p className="text-lg font-semibold">{formatNextCheckIn()}</p>
              {!isWorkHours && (
                <p className="text-sm text-muted-foreground mt-1 font-light">Outside work hours</p>
              )}
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-blue/50 to-accent-blue opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Card>

          {/* Completed Card */}
          <Card className="relative overflow-hidden gradient-card rounded-2xl border-0 shadow-[var(--shadow-lg)] transition-all duration-300 hover:shadow-[var(--shadow-xl)] hover:-translate-y-1 group animate-fade-in-up stagger-3">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-green/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="pb-2 relative">
              <CardTitle className="font-heading text-sm font-medium flex items-center gap-2.5 text-muted-foreground">
                <div className="p-2 rounded-xl bg-accent-green/10 group-hover:bg-accent-green/20 transition-colors duration-300">
                  <CheckCircle2 className="h-5 w-5 text-accent-green" />
                </div>
                Tasks Completed
              </CardTitle>
            </CardHeader>
            <CardContent className="relative pt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold font-heading tracking-tight">
                  <CountUpNumber value={completedCount} />
                </span>
                <span className="text-lg font-light text-muted-foreground">total</span>
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-green/50 to-accent-green opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Card>
        </div>

        {/* AI Insight Card */}
        <Card className="relative overflow-hidden rounded-2xl border-0 bg-gradient-to-r from-accent-purple/5 via-accent-blue/5 to-accent-purple/5 shadow-[var(--shadow-md)] animate-fade-in-up stagger-4">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-accent-purple to-accent-blue" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-accent-purple animate-pulse-subtle" />
              AI Insight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/80 font-light">You're maintaining strong momentum across your tasks</p>
          </CardContent>
        </Card>

        {showNotificationPrompt && permission === "default" && (
          <div className="animate-fade-in-up stagger-5">
            <NotificationPrompt onDismiss={() => setShowNotificationPrompt(false)} />
          </div>
        )}

        {user && <AIRecommendations onTaskUpdate={fetchTasks} />}

        <div className="flex items-center justify-between animate-fade-in-up">
          <h2 className="font-heading text-2xl font-bold tracking-tight">Your Tasks</h2>
          <Button 
            onClick={() => { setSelectedTask(null); setShowTaskDialog(true); }}
            className="rounded-xl shadow-[var(--shadow-md)] transition-all duration-200 hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border-dashed border-2 border-border/50 bg-card/50">
            <p className="text-muted-foreground mb-4 font-light">No tasks yet. Create your first task to get started!</p>
            <Button onClick={() => setShowTaskDialog(true)} className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Task
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {tasks.map((task, index) => (
              <div 
                key={task.id} 
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TaskCard
                  task={task}
                  onToggleComplete={handleToggleComplete}
                  onClick={(id) => navigate(`/task/${id}`)}
                />
              </div>
            ))}
          </div>
        )}
      </main>

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