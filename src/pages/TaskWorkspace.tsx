import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  PlayCircle, 
  StopCircle, 
  Edit2, 
  Save, 
  X,
  TrendingUp,
  Calendar,
  Zap,
  Heart,
  History,
  FileText,
  ChevronDown
} from "lucide-react";
import CheckInModal from "@/components/CheckInModal";
import SubtaskList from "@/components/SubtaskList";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  progress: number;
  notes: string | null;
  category: string;
  due_date: string | null;
  estimated_duration: number | null;
  created_at: string;
  completed_at: string | null;
}

interface CheckIn {
  id: string;
  created_at: string;
  response: string;
  mood: string | null;
  energy_level: number | null;
}

interface TaskHistory {
  id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  notes: string | null;
  created_at: string;
}

const TaskWorkspace = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [taskHistory, setTaskHistory] = useState<TaskHistory[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  
  // Edit states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedNotes, setEditedNotes] = useState("");
  const [historyVisibleCount, setHistoryVisibleCount] = useState(3);

  useEffect(() => {
    loadTask();
    loadCheckIns();
    loadTaskHistory();
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
      navigate("/");
      return;
    }

    setTask(data);
    setEditedTitle(data.title);
    setEditedDescription(data.description || "");
    setEditedNotes(data.notes || "");
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

  const loadTaskHistory = async () => {
    if (!taskId) return;

    const { data } = await supabase
      .from("task_history")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (data) {
      setTaskHistory(data);
    }
  };

  const logTaskChange = async (field: string, oldValue: any, newValue: any, notes?: string) => {
    if (!taskId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("task_history").insert({
      task_id: taskId,
      user_id: user.id,
      field_changed: field,
      old_value: oldValue?.toString() || null,
      new_value: newValue?.toString() || null,
      notes: notes || null,
    });

    loadTaskHistory();
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
    if (!taskId || !task) return;

    const oldProgress = task.progress;
    const { error } = await supabase
      .from("tasks")
      .update({ progress: newProgress })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update progress");
      return;
    }

    await logTaskChange("progress", oldProgress, newProgress, `Progress updated from ${oldProgress}% to ${newProgress}%`);
    setTask(prev => prev ? { ...prev, progress: newProgress } : null);
    toast.success("Progress updated!");
  };

  const saveTitle = async () => {
    if (!taskId || !task || editedTitle.trim() === "") return;

    const { error } = await supabase
      .from("tasks")
      .update({ title: editedTitle })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update title");
      return;
    }

    await logTaskChange("title", task.title, editedTitle);
    setTask(prev => prev ? { ...prev, title: editedTitle } : null);
    setIsEditingTitle(false);
    toast.success("Title updated!");
  };

  const saveDescription = async () => {
    if (!taskId || !task) return;

    const { error } = await supabase
      .from("tasks")
      .update({ description: editedDescription })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update description");
      return;
    }

    await logTaskChange("description", task.description, editedDescription);
    setTask(prev => prev ? { ...prev, description: editedDescription } : null);
    setIsEditingDescription(false);
    toast.success("Description updated!");
  };

  const saveNotes = async () => {
    if (!taskId || !task) return;

    const { error } = await supabase
      .from("tasks")
      .update({ notes: editedNotes })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update notes");
      return;
    }

    await logTaskChange("notes", task.notes, editedNotes, "Notes updated");
    setTask(prev => prev ? { ...prev, notes: editedNotes } : null);
    setIsEditingNotes(false);
    toast.success("Notes saved!");
  };

  const updatePriority = async (newPriority: string) => {
    if (!taskId || !task) return;

    const { error } = await supabase
      .from("tasks")
      .update({ priority: newPriority })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update priority");
      return;
    }

    await logTaskChange("priority", task.priority, newPriority);
    setTask(prev => prev ? { ...prev, priority: newPriority } : null);
    toast.success("Priority updated!");
  };

  const completeTask = async () => {
    if (!taskId || !task) return;

    const { error } = await supabase
      .from("tasks")
      .update({ 
        status: "completed", 
        progress: 100,
        completed_at: new Date().toISOString()
      })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to complete task");
      return;
    }

    await logTaskChange("status", task.status, "completed", "Task marked as completed");
    toast.success("Task completed! 🎉");
    navigate("/");
  };

  const getMoodEmoji = (mood: string | null) => {
    switch (mood) {
      case "great": return "😄";
      case "good": return "🙂";
      case "okay": return "😐";
      case "struggling": return "😟";
      default: return "💭";
    }
  };

  const getMoodStats = () => {
    if (checkIns.length === 0) return null;
    
    const moods = checkIns.filter(c => c.mood).map(c => c.mood);
    const energyLevels = checkIns.filter(c => c.energy_level).map(c => c.energy_level!);
    
    const avgEnergy = energyLevels.length > 0 
      ? (energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length).toFixed(1)
      : null;
    
    return { totalCheckIns: checkIns.length, avgEnergy, moods };
  };

  const priorityColors = {
    high: "bg-destructive text-destructive-foreground",
    medium: "bg-warning text-warning-foreground",
    low: "bg-success text-success-foreground",
  };

  if (!task) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button onClick={() => navigate("/")} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={completeTask} variant="outline" size="sm">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark Complete
          </Button>
        </div>

        {/* Task Title - Editable */}
        <Card>
          <CardContent className="pt-6">
            {!isEditingTitle ? (
              <div className="flex items-start justify-between gap-4">
                <h1 className="font-heading text-4xl font-bold flex-1">{task.title}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditingTitle(true)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-2xl font-bold"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button onClick={saveTitle} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setEditedTitle(task.title);
                      setIsEditingTitle(false);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Metadata & Indicators */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Priority</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                {["high", "medium", "low"].map((priority) => (
                  <Button
                    key={priority}
                    onClick={() => updatePriority(priority)}
                    variant={task.priority === priority ? "default" : "outline"}
                    size="sm"
                    className={task.priority === priority ? priorityColors[priority as keyof typeof priorityColors] : ""}
                  >
                    {priority}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Mood Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getMoodStats() ? (
                <div className="space-y-1">
                  <p className="text-2xl font-bold">
                    {getMoodEmoji(checkIns[0]?.mood || null)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getMoodStats()!.totalCheckIns} check-ins
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No mood data yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Avg Energy
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getMoodStats()?.avgEnergy ? (
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{getMoodStats()!.avgEnergy}/10</p>
                  <p className="text-xs text-muted-foreground">Average level</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No energy data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Description - Editable */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading">Description</CardTitle>
              {!isEditingDescription && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditingDescription(true)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!isEditingDescription ? (
              <p className="text-muted-foreground whitespace-pre-wrap">
                {task.description || "No description yet. Click edit to add one."}
              </p>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={4}
                  placeholder="Add a detailed description..."
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button onClick={saveDescription} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setEditedDescription(task.description || "");
                      setIsEditingDescription(false);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subtasks Section */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Subtasks</CardTitle>
          </CardHeader>
          <CardContent>
            <SubtaskList taskId={task.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progress Tracker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Task Progress</span>
                <span className="font-bold text-lg">{task.progress}%</span>
              </div>
              <Slider
                value={[task.progress]}
                onValueChange={(value) => updateProgress(value[0])}
                max={100}
                step={10}
                className="py-2"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((value) => (
                <Button
                  key={value}
                  onClick={() => updateProgress(value)}
                  variant={task.progress === value ? "default" : "outline"}
                  size="sm"
                  className="min-w-[48px]"
                >
                  {value}%
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notes Section - Rich Text */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes
              </CardTitle>
              {!isEditingNotes && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditingNotes(true)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!isEditingNotes ? (
              <div className="min-h-[100px]">
                {task.notes ? (
                  <p className="whitespace-pre-wrap">{task.notes}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    No notes yet. Click edit to add your thoughts, ideas, or important details.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  rows={8}
                  placeholder="Add notes, ideas, links, or any important information about this task..."
                  autoFocus
                  className="font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button onClick={saveNotes} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save Notes
                  </Button>
                  <Button
                    onClick={() => {
                      setEditedNotes(task.notes || "");
                      setIsEditingNotes(false);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
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

        {/* Check-in Timeline with Mood/Energy History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Mood & Energy History
              </CardTitle>
              <Button onClick={() => setShowCheckIn(true)} size="sm">
                Add Check-in
              </Button>
            </div>
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
              <div className="space-y-3">
                {checkIns.map((checkIn) => (
                  <div key={checkIn.id} className="border-l-4 border-primary/30 pl-4 py-3 bg-accent/30 rounded-r">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getMoodEmoji(checkIn.mood)}</span>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(checkIn.created_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                        <p className="text-sm">{checkIn.response}</p>
                        <div className="flex gap-4 text-xs">
                          {checkIn.mood && (
                            <Badge variant="outline" className="capitalize">
                              {checkIn.mood}
                            </Badge>
                          )}
                          {checkIn.energy_level && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {checkIn.energy_level}/10
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Update History */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <History className="h-5 w-5" />
              Update History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
const filteredHistory = taskHistory.filter((h) =>
                ["description", "work_session", "notes"].includes(h.field_changed)
              );
              const visibleHistory = filteredHistory.slice(0, historyVisibleCount);
              const hasMore = historyVisibleCount < filteredHistory.length;

              if (filteredHistory.length === 0) {
                return (
                  <p className="text-center py-8 text-muted-foreground">
                    No updates yet. Work sessions and description changes will appear here.
                  </p>
                );
              }

              return (
                <div className="space-y-3">
                  {visibleHistory.map((history) => (
                    <div key={history.id} className="border-l-2 border-muted pl-4 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs capitalize">
                              {history.field_changed === "work_session" ? "Work Session" : history.field_changed}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(history.created_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                          {history.notes && (
                            <p className="text-sm text-muted-foreground">{history.notes}</p>
                          )}
{history.field_changed === "notes" ? (
                            history.new_value && (
                              <p className="text-sm mt-1">
                                <span className="text-muted-foreground">
                                  {history.old_value ? "Updated: " : "Added: "}
                                </span>
                                <span className="font-medium">
                                  "{history.old_value && history.new_value.startsWith(history.old_value)
                                    ? history.new_value.slice(history.old_value.length).trim()
                                    : history.new_value}"
                                </span>
                              </p>
                            )
                          ) : (
                            history.old_value && history.new_value && (
                              <div className="text-xs mt-1 space-y-1">
                                <p className="text-muted-foreground">
                                  <span className="line-through">{history.old_value}</span>
                                  {" → "}
                                  <span className="font-medium">{history.new_value}</span>
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {hasMore && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setHistoryVisibleCount((prev) => prev + 5)}
                      className="w-full text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show more ({filteredHistory.length - historyVisibleCount} remaining)
                    </Button>
                  )}
                </div>
              );
            })()}
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
