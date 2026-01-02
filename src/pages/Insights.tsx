import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Flame, Trophy, TrendingUp } from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

interface TaskCompletionData {
  date: string;
  count: number;
}

const Insights = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [completionData, setCompletionData] = useState<TaskCompletionData[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    // Fetch profile for streak data
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    setProfile(profileData);

    // Fetch completed tasks count
    const { count } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");
    
    setTotalCompleted(count || 0);

    // Fetch task completion data for heatmap (last 365 days)
    const startDate = subDays(new Date(), 364);
    const { data: tasks } = await supabase
      .from("tasks")
      .select("completed_at")
      .eq("status", "completed")
      .gte("completed_at", startDate.toISOString())
      .not("completed_at", "is", null);

    // Process tasks into daily counts
    const dailyCounts: Record<string, number> = {};
    tasks?.forEach((task) => {
      if (task.completed_at) {
        const date = format(new Date(task.completed_at), "yyyy-MM-dd");
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      }
    });

    // Create array for all days
    const allDays = eachDayOfInterval({ start: startDate, end: new Date() });
    const completionArray = allDays.map((day) => ({
      date: format(day, "yyyy-MM-dd"),
      count: dailyCounts[format(day, "yyyy-MM-dd")] || 0,
    }));

    setCompletionData(completionArray);
    setLoading(false);
  };

  const getHeatmapColor = (count: number) => {
    if (count === 0) return "bg-muted/30";
    if (count === 1) return "bg-success/30";
    if (count === 2) return "bg-success/50";
    if (count === 3) return "bg-success/70";
    return "bg-success";
  };

  // Group completion data by weeks for the heatmap
  const getWeeks = () => {
    const weeks: TaskCompletionData[][] = [];
    let currentWeek: TaskCompletionData[] = [];
    
    completionData.forEach((day, index) => {
      const dayOfWeek = new Date(day.date).getDay();
      
      if (index === 0) {
        // Pad the first week with empty days
        for (let i = 0; i < dayOfWeek; i++) {
          currentWeek.push({ date: "", count: -1 });
        }
      }
      
      currentWeek.push(day);
      
      if (dayOfWeek === 6 || index === completionData.length - 1) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    return weeks;
  };

  const weeks = getWeeks();
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading insights...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-heading text-2xl font-bold">Insights</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-[var(--shadow-md)] transition-all duration-300 hover:shadow-[var(--shadow-lg)] hover:-translate-y-1 group">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success transition-transform duration-200 group-hover:scale-110" />
                Total Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold transition-transform duration-200 group-hover:scale-105">
                {totalCompleted}
              </p>
              <p className="text-sm text-muted-foreground mt-1">tasks finished</p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-md)] transition-all duration-300 hover:shadow-[var(--shadow-lg)] hover:-translate-y-1 group">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-sm font-medium flex items-center gap-2">
                <Flame className="h-4 w-4 text-warning transition-transform duration-200 group-hover:scale-110" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold transition-transform duration-200 group-hover:scale-105">
                {profile?.current_streak || 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">days in a row</p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-md)] transition-all duration-300 hover:shadow-[var(--shadow-lg)] hover:-translate-y-1 group">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary transition-transform duration-200 group-hover:scale-110" />
                Longest Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold transition-transform duration-200 group-hover:scale-105">
                {profile?.longest_streak || 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">personal best</p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-md)] transition-all duration-300 hover:shadow-[var(--shadow-lg)] hover:-translate-y-1 group">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent-foreground transition-transform duration-200 group-hover:scale-110" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold transition-transform duration-200 group-hover:scale-105">
                {completionData.slice(-7).reduce((sum, day) => sum + day.count, 0)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">tasks completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Calendar Heatmap */}
        <Card className="shadow-[var(--shadow-md)]">
          <CardHeader>
            <CardTitle className="font-heading text-lg font-semibold">Activity Heatmap</CardTitle>
            <p className="text-sm text-muted-foreground">Your task completion activity over the past year</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Month labels */}
                <div className="flex mb-2 text-xs text-muted-foreground">
                  <div className="w-8" />
                  {monthLabels.map((month, i) => (
                    <div key={month} className="flex-1 text-center">
                      {month}
                    </div>
                  ))}
                </div>
                
                {/* Heatmap grid */}
                <div className="flex gap-[3px]">
                  {/* Day labels */}
                  <div className="flex flex-col gap-[3px] text-xs text-muted-foreground pr-2">
                    <div className="h-[12px]" />
                    <div className="h-[12px] flex items-center">Mon</div>
                    <div className="h-[12px]" />
                    <div className="h-[12px] flex items-center">Wed</div>
                    <div className="h-[12px]" />
                    <div className="h-[12px] flex items-center">Fri</div>
                    <div className="h-[12px]" />
                  </div>
                  
                  {/* Weeks */}
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-[3px]">
                      {week.map((day, dayIndex) => (
                        <div
                          key={`${weekIndex}-${dayIndex}`}
                          className={`w-[12px] h-[12px] rounded-sm transition-all duration-200 hover:scale-125 hover:ring-2 hover:ring-primary/50 ${
                            day.count === -1 ? "bg-transparent" : getHeatmapColor(day.count)
                          }`}
                          title={day.date ? `${day.date}: ${day.count} task${day.count !== 1 ? "s" : ""}` : ""}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                
                {/* Legend */}
                <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
                  <span>Less</span>
                  <div className="w-[12px] h-[12px] rounded-sm bg-muted/30" />
                  <div className="w-[12px] h-[12px] rounded-sm bg-success/30" />
                  <div className="w-[12px] h-[12px] rounded-sm bg-success/50" />
                  <div className="w-[12px] h-[12px] rounded-sm bg-success/70" />
                  <div className="w-[12px] h-[12px] rounded-sm bg-success" />
                  <span>More</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Insights;
