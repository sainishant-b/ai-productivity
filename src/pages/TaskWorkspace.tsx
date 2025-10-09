import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Clock, PlayCircle, StopCircle } from "lucide-react";
import CheckInModal from "@/components/CheckInModal";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  progress: number;
}

interface CheckIn {
  id: string;
  created_at: string;
  response: string;
  mood: string | null;
  energy_level: number | null;
}

const TaskWorkspace = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);

  useEffect(() => {
    loadTask();
    loadCheckIns();
  }, [taskId]);

  const loadTask = async () => {
    if (!taskId) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (error) {
      toast.error("Failed to load task");
      navigate("/dashboard");
      return;
    }

    setTask(data);
  };

  const loadCheckIns = async () => {
    if (!taskId) return;

    const { data } = await supabase
      .from("check_ins")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (data) {
      setCheckIns(data);
    }
  };

  const startWorkSession = async () => {
    setIsWorking(true);
    setSessionStart(new Date());
    toast.success("Work session started!");
  };

  const endWorkSession = async () => {
    if (!sessionStart || !taskId) return;

    const duration = Math.floor((new Date().getTime() - sessionStart.getTime()) / 1000 / 60);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("work_sessions").insert({
      user_id: user.id,
      task_id: taskId,
      time_spent: duration,
    });

    setIsWorking(false);
    setSessionStart(null);
    toast.success(`Work session completed! ${duration} minutes logged.`);
  };

  const handleCheckInSubmit = async (response: string, mood?: string, energyLevel?: number) => {
    if (!taskId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("check_ins").insert({
      user_id: user.id,
      task_id: taskId,
      question: "How's your progress on this task?",
      response,
      mood,
      energy_level: energyLevel,
    });

    loadCheckIns();
  };

  const updateProgress = async (newProgress: number) => {
    if (!taskId) return;

    const { error } = await supabase
      .from("tasks")
      .update({ progress: newProgress })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update progress");
      return;
    }

    setTask(prev => prev ? { ...prev, progress: newProgress } : null);
    toast.success("Progress updated!");
  };

  const completeTask = async () => {
    if (!taskId) return;

    const { error } = await supabase
      .from("tasks")
      .update({ status: "completed", progress: 100 })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to complete task");
      return;
    }

    toast.success("Task completed! 🎉");
    navigate("/dashboard");
  };

  if (!task) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button onClick={() => navigate("/dashboard")} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={completeTask} variant="outline" size="sm">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark Complete
          </Button>
        </div>

        <div>
          <h1 className="font-heading text-4xl font-bold">{task.title}</h1>
          {task.description && (
            <p className="text-muted-foreground mt-2">{task.description}</p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Task Progress</span>
                <span>{task.progress}%</span>
              </div>
              <Progress value={task.progress} />
            </div>
            <div className="flex flex-wrap gap-2">
              {[0, 25, 50, 75, 100].map((value) => (
                <Button
                  key={value}
                  onClick={() => updateProgress(value)}
                  variant={task.progress === value ? "default" : "outline"}
                  size="sm"
                >
                  {value}%
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Work Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isWorking ? (
              <Button onClick={startWorkSession} className="w-full" size="lg">
                <PlayCircle className="h-5 w-5 mr-2" />
                Start Work Session
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Session in progress</p>
                  <p className="text-2xl font-heading font-bold mt-2">
                    {sessionStart && Math.floor((new Date().getTime() - sessionStart.getTime()) / 1000 / 60)} min
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={endWorkSession} className="flex-1" variant="outline">
                    <StopCircle className="h-5 w-5 mr-2" />
                    End Session
                  </Button>
                  <Button onClick={() => setShowCheckIn(true)} className="flex-1">
                    Quick Check-in
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Check-in Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {checkIns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No check-ins yet</p>
                <Button onClick={() => setShowCheckIn(true)} variant="outline" className="mt-4">
                  Add First Check-in
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {checkIns.map((checkIn) => (
                  <div key={checkIn.id} className="border-l-2 border-border pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          {new Date(checkIn.created_at).toLocaleString()}
                        </p>
                        <p className="mt-1">{checkIn.response}</p>
                        {checkIn.mood && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Mood: {checkIn.mood}
                          </p>
                        )}
                        {checkIn.energy_level && (
                          <p className="text-sm text-muted-foreground">
                            Energy: {checkIn.energy_level}/10
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CheckInModal
        open={showCheckIn}
        onClose={() => setShowCheckIn(false)}
        question="How's your progress on this task?"
        onSubmit={handleCheckInSubmit}
      />
    </div>
  );
};

export default TaskWorkspace;
