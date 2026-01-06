import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  ArrowUp,
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

  const visibleTasks = showAll ? activeTasks : activeTasks.slice(0, 2);
  const remainingCount = activeTasks.length - 2;

  if (isLoading) {
    return (
      <Card className="rounded-xl border border-border/50 shadow-sm">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Loading recommendations...</span>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations) return null;

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-foreground/60" />
          <span className="text-sm font-medium">AI Recommendations</span>
          {activeTasks.length > 0 && (
            <Badge variant="secondary" className="text-xs">{activeTasks.length}</Badge>
          )}
        </div>
        <Button onClick={getRecommendations} variant="ghost" size="sm" className="h-7 text-xs gap-1">
          <RefreshCw className="h-3 w-3" />
          Refresh
        </Button>
      </div>

      {/* Warnings - compact */}
      {recommendations.warnings && recommendations.warnings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {recommendations.warnings.map((warning, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-destructive/10 text-destructive text-xs"
            >
              {getWarningIcon(warning.type)}
              <span className="truncate max-w-[200px]">{warning.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Insights - compact single line */}
      {recommendations.insights && recommendations.insights.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lightbulb className="h-3 w-3 shrink-0" />
          <span className="truncate">{recommendations.insights[0]}</span>
        </div>
      )}

      {/* Task cards - 2 column grid */}
      {activeTasks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {visibleTasks.map((task) => {
            const progress = task.status === 'completed' ? 100 : (task.progress || 0);
            const showProgressFill = progress > 0;

            const renderContent = (inverted: boolean) => (
              <div className="flex items-center gap-3 p-3">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${
                  inverted ? 'bg-primary-foreground text-primary' : 'bg-foreground text-background'
                }`}>
                  {activeTasks.indexOf(task) + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm truncate ${inverted ? 'text-primary-foreground' : ''}`}>
                    {task.title}
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${inverted ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    <Clock className="h-3 w-3" />
                    {task.suggestedTime}
                    {showProgressFill && <span>• {progress}%</span>}
                  </div>
                </div>
                <Badge className={`shrink-0 text-xs ${inverted ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30' : getPriorityColor(task.priority)}`}>
                  {task.priority}
                </Badge>
                <div className="flex gap-1 shrink-0">
                  <Button
                    onClick={(e) => { e.stopPropagation(); scheduleTask(task); }}
                    size="sm"
                    className={`h-7 px-2 text-xs ${inverted ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90' : 'bg-foreground text-background'}`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={(e) => { e.stopPropagation(); dismissTask(task.taskId); }}
                    size="sm"
                    variant="ghost"
                    className={`h-7 px-2 ${inverted ? 'text-primary-foreground hover:bg-primary-foreground/10' : ''}`}
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );

            return (
              <Card 
                key={task.taskId} 
                className="relative overflow-hidden rounded-lg border-0 shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <div className="relative">
                  {renderContent(false)}
                </div>
                {showProgressFill && (
                  <div
                    className="absolute inset-0 bg-primary transition-all duration-500 ease-out"
                    style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}
                  >
                    {renderContent(true)}
                  </div>
                )}
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
          className="w-full h-7 text-xs text-muted-foreground"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              View all {activeTasks.length} recommendations
            </>
          )}
        </Button>
      )}

      {activeTasks.length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          <CheckCircle2 className="h-5 w-5 mx-auto mb-1 opacity-50" />
          All recommendations scheduled
        </div>
      )}
    </div>
  );
}
