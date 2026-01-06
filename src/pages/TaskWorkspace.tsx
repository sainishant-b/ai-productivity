import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  Zap,
  Heart,
  History,
  FileText,
  ChevronDown,
  Timer,
  ChevronUp
} from "lucide-react";
import CheckInModal from "@/components/CheckInModal";
import SubtaskList from "@/components/SubtaskList";
import EndSessionModal from "@/components/EndSessionModal";
import { useWorkSessionTimer } from "@/hooks/useWorkSessionTimer";
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

interface WorkSession {
  id: string;
  time_spent: number | null;
  notes: string | null;
  created_at: string;
}

const TaskWorkspace = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [taskHistory, setTaskHistory] = useState<TaskHistory[]>([]);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showEndSession, setShowEndSession] = useState(false);
  
  // Collapsible states - all closed by default except title
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  
  // Work session bar expanded state
  const [sessionBarExpanded, setSessionBarExpanded] = useState(false);
  
  // Work session timer hook
  const {
    isWorking,
    sessionStart,
    elapsedSeconds,
    startSession,
    endSession,
    formatTime,
    formatTimeReadable,
  } = useWorkSessionTimer(taskId);
  
  // Edit states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedNotes, setEditedNotes] = useState("");
  const [historyVisibleCount, setHistoryVisibleCount] = useState(3);
  const [sessionsVisibleCount, setSessionsVisibleCount] = useState(3);
  
  // Track if any edits are pending
  const hasUnsavedChanges = 
    (isEditingTitle && editedTitle !== task?.title) ||
    (isEditingDescription && editedDescription !== (task?.description || "")) ||
    (isEditingNotes && editedNotes !== (task?.notes || ""));

  useEffect(() => {
    loadTask();
    loadCheckIns();
    loadTaskHistory();
    loadWorkSessions();
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

  const loadWorkSessions = async () => {
    if (!taskId) return;

    const { data } = await supabase
      .from("work_sessions")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (data) {
      setWorkSessions(data);
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

  const handleStartSession = () => {
    startSession();
    setSessionBarExpanded(true);
    toast.success("Work session started!");
  };

  const handleEndSessionClick = () => {
    setShowEndSession(true);
  };

  const handleEndSessionSave = async (notes: string, nextSteps: string) => {
    if (!sessionStart || !taskId) return;

    const durationMinutes = Math.floor(elapsedSeconds / 60);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Save work session with notes
    await supabase.from("work_sessions").insert({
      user_id: user.id,
      task_id: taskId,
      time_spent: durationMinutes,
      notes: notes || null,
    });

    // Log to task history with duration and notes
    const sessionSummary = [
      `Duration: ${formatTimeReadable(elapsedSeconds)}`,
      notes ? `Notes: ${notes}` : null,
      nextSteps ? `Next steps: ${nextSteps}` : null,
    ].filter(Boolean).join(" | ");

    await logTaskChange(
      "work_session",
      null,
      formatTimeReadable(elapsedSeconds),
      sessionSummary
    );

    endSession();
    setShowEndSession(false);
    setSessionBarExpanded(false);
    loadWorkSessions();
    toast.success(`Work session completed! ${formatTimeReadable(elapsedSeconds)} logged.`);
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
    high: "bg-destructive/10 text-destructive border-destructive/20",
    medium: "bg-warning/10 text-warning border-warning/20",
    low: "bg-success/10 text-success border-success/20",
  };

  const filteredHistory = taskHistory.filter((h) =>
    ["description", "work_session", "notes"].includes(h.field_changed)
  );

  if (!task) return null;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Progress bar at top */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
        <div 
          className="h-full bg-foreground transition-all duration-500 ease-out"
          style={{ width: `${task.progress}%` }}
        />
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button onClick={() => navigate("/")} variant="ghost" size="sm" className="rounded-xl -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={completeTask} variant="outline" size="sm" className="rounded-xl">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Complete
          </Button>
        </div>

        {/* Task Title - Always visible */}
        <div className="space-y-4 animate-fade-in-up">
          {!isEditingTitle ? (
            <div className="flex items-start justify-between gap-4 group">
              <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">{task.title}</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl shrink-0"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-2xl font-bold rounded-xl"
                autoFocus
              />
              <div className="flex gap-2">
                <Button onClick={saveTitle} size="sm" className="rounded-xl">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setEditedTitle(task.title);
                    setIsEditingTitle(false);
                  }}
                  variant="ghost"
                  size="sm"
                  className="rounded-xl"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Priority badges */}
          <div className="flex gap-2">
            {["high", "medium", "low"].map((priority) => (
              <Badge
                key={priority}
                variant="outline"
                onClick={() => updatePriority(priority)}
                className={`cursor-pointer transition-all duration-200 hover:scale-105 capitalize rounded-lg ${
                  task.priority === priority 
                    ? priorityColors[priority as keyof typeof priorityColors] 
                    : "opacity-50 hover:opacity-100"
                }`}
              >
                {priority}
              </Badge>
            ))}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3 animate-fade-in-up stagger-2">
          <div className="p-4 rounded-2xl bg-card border border-border/50 text-center">
            <p className="text-xs text-muted-foreground font-light mb-1">Progress</p>
            <p className="text-2xl font-bold">{task.progress}%</p>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border/50 text-center">
            <p className="text-xs text-muted-foreground font-light mb-1">Sessions</p>
            <p className="text-2xl font-bold">{workSessions.length}</p>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border/50 text-center">
            <p className="text-xs text-muted-foreground font-light mb-1">Check-ins</p>
            <p className="text-2xl font-bold">{checkIns.length}</p>
          </div>
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-3">
          {/* Description */}
          <Collapsible open={descriptionOpen} onOpenChange={setDescriptionOpen}>
            <Card className="rounded-2xl border-0 shadow-[var(--shadow-sm)] overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-md)]">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Description
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${descriptionOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent className="animate-collapsible-down">
                <CardContent className="pt-0 pb-4">
                  {!isEditingDescription ? (
                    <div 
                      className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors min-h-[60px]"
                      onClick={() => setIsEditingDescription(true)}
                    >
                      {task.description || "Click to add a description..."}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        rows={4}
                        className="rounded-xl"
                        placeholder="Add a detailed description..."
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button onClick={saveDescription} size="sm" className="rounded-xl">
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button
                          onClick={() => {
                            setEditedDescription(task.description || "");
                            setIsEditingDescription(false);
                          }}
                          variant="ghost"
                          size="sm"
                          className="rounded-xl"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Subtasks */}
          <Collapsible open={subtasksOpen} onOpenChange={setSubtasksOpen}>
            <Card className="rounded-2xl border-0 shadow-[var(--shadow-sm)] overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-md)]">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      Subtasks
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${subtasksOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent className="animate-collapsible-down">
                <CardContent className="pt-0 pb-4">
                  <SubtaskList taskId={task.id} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Progress */}
          <Collapsible open={progressOpen} onOpenChange={setProgressOpen}>
            <Card className="rounded-2xl border-0 shadow-[var(--shadow-sm)] overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-md)]">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      Progress Tracker
                      <Badge variant="secondary" className="ml-2 rounded-lg">{task.progress}%</Badge>
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${progressOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent className="animate-collapsible-down">
                <CardContent className="pt-0 pb-4 space-y-4">
                  <Slider
                    value={[task.progress]}
                    onValueChange={(value) => updateProgress(value[0])}
                    max={100}
                    step={10}
                    className="py-2"
                  />
                  <div className="flex flex-wrap gap-2">
                    {[0, 25, 50, 75, 100].map((value) => (
                      <Button
                        key={value}
                        onClick={() => updateProgress(value)}
                        variant={task.progress === value ? "default" : "outline"}
                        size="sm"
                        className="rounded-xl min-w-[50px]"
                      >
                        {value}%
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Notes */}
          <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
            <Card className="rounded-2xl border-0 shadow-[var(--shadow-sm)] overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-md)]">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Notes
                      {task.notes && <span className="text-xs text-muted-foreground ml-1">({task.notes.length} chars)</span>}
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${notesOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent className="animate-collapsible-down">
                <CardContent className="pt-0 pb-4">
                  {!isEditingNotes ? (
                    <div 
                      className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors min-h-[80px] whitespace-pre-wrap"
                      onClick={() => setIsEditingNotes(true)}
                    >
                      {task.notes || "Click to add notes..."}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Textarea
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        rows={6}
                        className="rounded-xl font-mono text-sm"
                        placeholder="Add notes, ideas, links..."
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button onClick={saveNotes} size="sm" className="rounded-xl">
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button
                          onClick={() => {
                            setEditedNotes(task.notes || "");
                            setIsEditingNotes(false);
                          }}
                          variant="ghost"
                          size="sm"
                          className="rounded-xl"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Work Sessions History */}
          <Collapsible open={sessionsOpen} onOpenChange={setSessionsOpen}>
            <Card className="rounded-2xl border-0 shadow-[var(--shadow-sm)] overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-md)]">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      Work Sessions
                      <Badge variant="secondary" className="ml-2 rounded-lg">{workSessions.length}</Badge>
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${sessionsOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent className="animate-collapsible-down">
                <CardContent className="pt-0 pb-4">
                  {workSessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No sessions yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {workSessions.slice(0, sessionsVisibleCount).map((session) => (
                        <div key={session.id} className="p-3 rounded-xl bg-muted/30 border border-border/30">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className="text-xs rounded-lg">
                              {session.time_spent ? `${session.time_spent} min` : "< 1 min"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(session.created_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                          {session.notes && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{session.notes}</p>
                          )}
                        </div>
                      ))}
                      {sessionsVisibleCount < workSessions.length && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSessionsVisibleCount((prev) => prev + 5)}
                          className="w-full text-muted-foreground rounded-xl"
                        >
                          Show more ({workSessions.length - sessionsVisibleCount} remaining)
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Update History */}
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <Card className="rounded-2xl border-0 shadow-[var(--shadow-sm)] overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-md)]">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      Update History
                      <Badge variant="secondary" className="ml-2 rounded-lg">{filteredHistory.length}</Badge>
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${historyOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent className="animate-collapsible-down">
                <CardContent className="pt-0 pb-4">
                  {filteredHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No updates yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredHistory.slice(0, historyVisibleCount).map((history) => (
                        <div key={history.id} className="p-3 rounded-xl bg-muted/30 border border-border/30">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs capitalize rounded-lg">
                              {history.field_changed === "work_session" ? "Session" : history.field_changed}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(history.created_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                          {history.notes && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{history.notes}</p>
                          )}
                        </div>
                      ))}
                      {historyVisibleCount < filteredHistory.length && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setHistoryVisibleCount((prev) => prev + 5)}
                          className="w-full text-muted-foreground rounded-xl"
                        >
                          Show more ({filteredHistory.length - historyVisibleCount} remaining)
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>

      {/* Floating Work Session Bar */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${sessionBarExpanded || isWorking ? 'translate-y-0' : 'translate-y-0'}`}>
        <div className="max-w-2xl mx-auto px-4 pb-4">
          <Card className={`rounded-2xl border border-border/50 shadow-[var(--shadow-xl)] overflow-hidden transition-all duration-300 ${isWorking ? 'bg-muted/50' : 'bg-card'}`}>
            {/* Slim bar when not expanded */}
            {!sessionBarExpanded && !isWorking ? (
              <div 
                className="p-4 cursor-pointer hover:bg-muted/30 transition-colors flex items-center justify-between"
                onClick={() => setSessionBarExpanded(true)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-muted">
                    <Clock className="h-5 w-5 text-foreground/60" />
                  </div>
                  <span className="font-medium">Work Session</span>
                </div>
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </div>
            ) : (
              <div className="p-4 space-y-4 animate-slide-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-muted">
                      <Clock className="h-5 w-5 text-foreground/60" />
                    </div>
                    <span className="font-medium">Work Session</span>
                  </div>
                  {!isWorking && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSessionBarExpanded(false)}
                      className="rounded-xl"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {!isWorking ? (
                  <Button 
                    onClick={handleStartSession} 
                    className="w-full rounded-xl bg-foreground text-background border-0 shadow-[var(--shadow-md)] transition-all duration-200 hover:shadow-[var(--shadow-lg)] hover:opacity-90"
                    size="lg"
                  >
                    <PlayCircle className="h-5 w-5 mr-2" />
                    Start Work Session
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-4 rounded-xl bg-card/50">
                      <p className="text-xs text-muted-foreground mb-1">Session in progress</p>
                      <p className="text-4xl font-heading font-bold tracking-wider font-mono">
                        {formatTime(elapsedSeconds)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatTimeReadable(elapsedSeconds)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleEndSessionClick} 
                        className="flex-1 rounded-xl" 
                        variant="outline"
                      >
                        <StopCircle className="h-4 w-4 mr-2" />
                        End Session
                      </Button>
                      <Button 
                        onClick={() => setShowCheckIn(true)} 
                        className="flex-1 rounded-xl"
                      >
                        Quick Check-in
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Floating Save Button */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-24 right-4 z-50 animate-fade-in-up">
          <Button 
            onClick={() => {
              if (isEditingTitle) saveTitle();
              if (isEditingDescription) saveDescription();
              if (isEditingNotes) saveNotes();
            }}
            className="rounded-full shadow-[var(--shadow-xl)] px-6"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      )}

      <CheckInModal
        open={showCheckIn}
        onClose={() => setShowCheckIn(false)}
        question="How's your progress on this task?"
        onSubmit={handleCheckInSubmit}
      />

      <EndSessionModal
        open={showEndSession}
        onClose={() => setShowEndSession(false)}
        durationSeconds={elapsedSeconds}
        onSave={handleEndSessionSave}
      />
    </div>
  );
};

export default TaskWorkspace;