import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RecommendedTask {
  taskId: string;
  title: string;
  suggestedTime: string;
  suggestedDate: string;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  priority: 'high' | 'medium' | 'low';
  progress?: number;
  status?: string;
}

interface Warning {
  type: 'overdue' | 'conflict' | 'overload' | 'other';
  message: string;
}

interface RecommendationsData {
  recommendedTasks: RecommendedTask[];
  insights: string[];
  warnings: Warning[];
}

interface AIRecommendationsProps {
  onTaskUpdate: () => void;
}

export default function AIRecommendations({ onTaskUpdate }: AIRecommendationsProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationsData | null>(null);
  const [scheduledTasks, setScheduledTasks] = useState<Set<string>>(new Set());
  const [hasSession, setHasSession] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setHasSession(!!user);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (hasSession) {
      getRecommendations();
    }
  }, [hasSession]);

  const getRecommendations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('task-recommendations', {
        body: {},
      });

      if (error) {
        const status = (error as any)?.context?.status;
        if (status === 401) {
          toast({
            title: 'Session expired',
            description: 'Please sign in again to get recommendations.',
            variant: 'destructive',
          });
          await supabase.auth.signOut();
          navigate('/auth');
          return;
        }
        throw error;
      }

      setRecommendations(data);
    } catch (error: any) {
      console.error('Error getting recommendations:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to get AI recommendations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleTask = async (task: RecommendedTask) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          due_date: task.suggestedDate,
        })
        .eq('id', task.taskId);

      if (error) throw error;

      setScheduledTasks(prev => new Set(prev).add(task.taskId));
      toast({
        title: 'Task Scheduled',
        description: `"${task.title}" scheduled for ${task.suggestedTime}`,
      });
      onTaskUpdate();
    } catch (error: any) {
      console.error('Error scheduling task:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule task',
        variant: 'destructive',
      });
    }
  };

  const dismissTask = (taskId: string) => {
    setScheduledTasks(prev => new Set(prev).add(taskId));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      default: return 'bg-success text-success-foreground';
    }
  };

  const getWarningIcon = (type: string) => {
    const iconClass = "h-3 w-3";
    switch (type) {
      case 'overdue': return <AlertTriangle className={iconClass} />;
      case 'conflict': return <Clock className={iconClass} />;
      case 'overload': return <Zap className={iconClass} />;
      default: return <AlertTriangle className={iconClass} />;
    }
  };

  const activeTasks = recommendations?.recommendedTasks.filter(
    task => !scheduledTasks.has(task.taskId)
  ) || [];

  // Desktop: 2 visible, Tablet/Mobile: 2 visible
  const visibleTasks = showAll ? activeTasks : activeTasks.slice(0, 2);
  const remainingCount = activeTasks.length - 2;

  if (isLoading) {
    return (
      <Card className="rounded-xl border border-border/50 shadow-sm">
        <div className="flex items-center justify-center py-6 md:py-8">
          <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-xs md:text-sm text-muted-foreground">Loading recommendations...</span>
        </div>
      </Card>
    );
  }

  if (!recommendations) return null;

  return (
    <div className="space-y-2 md:space-y-3 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 text-foreground/60" />
          <span className="text-xs md:text-sm font-medium">AI Recommendations</span>
          {activeTasks.length > 0 && (
            <Badge variant="secondary" className="text-[10px] md:text-xs">{activeTasks.length}</Badge>
          )}
        </div>
        <Button onClick={getRecommendations} variant="ghost" size="sm" className="h-6 md:h-7 text-[10px] md:text-xs gap-1">
          <RefreshCw className="h-3 w-3" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Warnings - compact */}
      {recommendations.warnings && recommendations.warnings.length > 0 && (
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          {recommendations.warnings.slice(0, 2).map((warning, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1 md:gap-1.5 px-2 py-1 rounded-md bg-destructive/10 text-destructive text-[10px] md:text-xs"
            >
              {getWarningIcon(warning.type)}
              <span className="truncate max-w-[150px] md:max-w-[200px]">{warning.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Insights - compact single line */}
      {recommendations.insights && recommendations.insights.length > 0 && (
        <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground">
          <Lightbulb className="h-3 w-3 shrink-0" />
          <span className="truncate">{recommendations.insights[0]}</span>
        </div>
      )}

      {/* Task cards - compact vertical layout */}
      {activeTasks.length > 0 && (
        <div className="flex flex-col gap-3 max-w-full">
          {visibleTasks.map((task) => {
            const progress = task.status === 'completed' ? 100 : (task.progress || 0);

            return (
              <Card 
                key={task.taskId} 
                onClick={() => navigate(`/task/${task.taskId}`)}
                className="relative overflow-hidden rounded-lg border-border/40 shadow-none hover:border-primary/30 cursor-pointer transition-colors"
              >
                <div className="p-3 space-y-1.5">
                  {/* Row 1: Title + Priority */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate flex-1">{task.title}</span>
                    <Badge className={`shrink-0 text-[10px] px-1.5 py-0 h-4 ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </Badge>
                  </div>
                  
                  {/* Row 2: Time + Progress */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{task.suggestedTime}</span>
                    {progress > 0 && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span>{progress}%</span>
                      </>
                    )}
                  </div>
                  
                  {/* Row 3: Reasoning */}
                  <p className="text-xs text-muted-foreground/70 truncate leading-tight">
                    {task.reasoning}
                  </p>
                  
                  {/* Row 4: Actions */}
                  <div className="flex items-center justify-end gap-1 pt-1">
                    <Button
                      onClick={(e) => { e.stopPropagation(); scheduleTask(task); }}
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <Clock className="h-3 w-3" />
                      Schedule
                    </Button>
                    <Button
                      onClick={(e) => { e.stopPropagation(); scheduleTask(task); }}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-success"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={(e) => { e.stopPropagation(); dismissTask(task.taskId); }}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Expand/collapse button */}
      {remainingCount > 0 && (
        <Button
          onClick={() => setShowAll(!showAll)}
          variant="ghost"
          size="sm"
          className="w-full h-6 md:h-7 text-[10px] md:text-xs text-muted-foreground"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              View all {activeTasks.length}
            </>
          )}
        </Button>
      )}

      {activeTasks.length === 0 && (
        <div className="text-center py-3 md:py-4 text-xs md:text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 mx-auto mb-1 opacity-50" />
          All recommendations scheduled
        </div>
      )}
    </div>
  );
}