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
  TrendingUp,
  Lightbulb,
  Zap,
  ArrowUpRight,
  ArrowRight,
  ArrowUp
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
  const { toast } = useToast();

  // Wait for auth session before fetching
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

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      high: { className: 'bg-destructive/10 text-destructive border-destructive/20', label: 'High' },
      medium: { className: 'bg-warning/10 text-warning border-warning/20', label: 'Medium' },
      low: { className: 'bg-success/10 text-success border-success/20', label: 'Low' },
    };
    const config = variants[priority] || variants.medium;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  const getUrgencyIndicator = (priority: string) => {
    switch (priority) {
      case 'high': return <ArrowUp className="h-4 w-4 text-destructive" />;
      case 'medium': return <ArrowUpRight className="h-4 w-4 text-warning" />;
      default: return <ArrowRight className="h-4 w-4 text-success" />;
    }
  };

  const getWarningIcon = (type: string) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case 'overdue': return <AlertTriangle className={iconClass} />;
      case 'conflict': return <Clock className={iconClass} />;
      case 'overload': return <Zap className={iconClass} />;
      default: return <AlertTriangle className={iconClass} />;
    }
  };

  const getInsightIcon = (index: number) => {
    const icons = [Lightbulb, TrendingUp, Zap, Sparkles];
    const Icon = icons[index % icons.length];
    return <Icon className="h-4 w-4 text-foreground/60" />;
  };

  const getInsightBorderColor = (_index: number) => {
    return 'bg-foreground/20';
  };

  const activeTasks = recommendations?.recommendedTasks.filter(
    task => !scheduledTasks.has(task.taskId)
  ) || [];

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-border/50 shadow-[var(--shadow-lg)] overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-muted">
              <Sparkles className="h-5 w-5 text-foreground/60" />
            </div>
            AI Scheduling Recommendations
          </CardTitle>
          <CardDescription className="font-light">Analyzing your work patterns and tasks...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-foreground/60" />
            <p className="text-sm text-muted-foreground font-light">Generating personalized insights...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations) return null;

  return (
    <Card className="rounded-2xl border border-border/50 shadow-[var(--shadow-lg)] overflow-hidden animate-fade-in-up">
      <CardHeader className="border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-muted">
              <Sparkles className="h-5 w-5 text-foreground/60 animate-pulse-subtle" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">Daily Top 5 Recommendations</CardTitle>
              <CardDescription className="font-light mt-0.5">
                Smart task matching based on your energy patterns
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={getRecommendations}
            variant="ghost"
            size="sm"
            className="gap-2 rounded-xl transition-all duration-200 hover:scale-105 hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {/* Warnings */}
        {recommendations.warnings && recommendations.warnings.length > 0 && (
          <div className="space-y-2">
            {recommendations.warnings.map((warning, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10 transition-all duration-300 hover:bg-destructive/10 animate-fade-in-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="p-1.5 rounded-lg bg-destructive/10 text-destructive mt-0.5">
                  {getWarningIcon(warning.type)}
                </div>
                <p className="text-sm text-foreground/90 flex-1 font-light">{warning.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Insights */}
        {recommendations.insights && recommendations.insights.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Key Insights
            </h4>
            <div className="space-y-2">
              {recommendations.insights.map((insight, idx) => (
                <div 
                  key={idx} 
                  className="relative flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50 transition-all duration-300 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 overflow-hidden animate-fade-in-up"
                  style={{ animationDelay: `${idx * 75}ms` }}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${getInsightBorderColor(idx)}`} />
                  <div className="pl-2 flex items-start gap-3">
                    {getInsightIcon(idx)}
                    <span className="text-sm text-foreground/80 font-light">{insight}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Task Recommendations */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">
            {activeTasks.length > 0 
              ? `${activeTasks.length} Recommended Task${activeTasks.length !== 1 ? 's' : ''} for Today`
              : 'All tasks scheduled'}
          </h4>
          {activeTasks.map((task, idx) => {
            const progress = task.status === 'completed' ? 100 : (task.progress || 0);
            const showProgressFill = progress > 0;

            const renderTaskContent = (inverted: boolean) => (
              <>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 pl-2">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-transform duration-200 group-hover:scale-110 ${
                          inverted ? 'bg-primary-foreground text-primary' : 'bg-foreground text-background'
                        }`}>
                          {idx + 1}
                        </span>
                        <CardTitle className={`text-base font-semibold tracking-tight ${
                          inverted ? 'text-primary-foreground' : ''
                        }`}>{task.title}</CardTitle>
                      </div>
                      <CardDescription className={`flex items-center gap-2 font-light ${
                        inverted ? 'text-primary-foreground/80' : ''
                      }`}>
                        <Clock className="h-3.5 w-3.5" />
                        {task.suggestedTime}
                        <span className="flex items-center gap-1 ml-2">
                          {inverted ? <ArrowUp className="h-4 w-4 text-primary-foreground/80" /> : getUrgencyIndicator(task.priority)}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={inverted 
                        ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30' 
                        : getPriorityBadge(task.priority).props.className
                      }
                    >
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pl-5">
                  <div className={`p-3 rounded-lg transition-colors duration-200 ${
                    inverted ? 'bg-primary-foreground/10' : 'bg-muted/30 group-hover:bg-muted/50'
                  }`}>
                    <p className={`text-sm font-light leading-relaxed ${
                      inverted ? 'text-primary-foreground/90' : 'text-foreground/70'
                    }`}>{task.reasoning}</p>
                  </div>
                  {showProgressFill && (
                    <div className={`text-xs font-medium ${inverted ? 'text-primary-foreground' : 'text-foreground'}`}>
                      {progress}% complete
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={(e) => { e.stopPropagation(); scheduleTask(task); }}
                      size="sm"
                      className={`gap-2 rounded-xl border-0 shadow-[var(--shadow-md)] transition-all duration-200 hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5 ${
                        inverted 
                          ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90' 
                          : 'bg-foreground text-background hover:opacity-90'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Schedule This
                    </Button>
                    <Button
                      onClick={(e) => { e.stopPropagation(); dismissTask(task.taskId); }}
                      size="sm"
                      variant="ghost"
                      className={`gap-2 rounded-xl transition-all duration-200 ${
                        inverted ? 'text-primary-foreground hover:bg-primary-foreground/10' : 'hover:bg-muted'
                      }`}
                    >
                      <XCircle className="h-4 w-4" />
                      Skip
                    </Button>
                  </div>
                </CardContent>
              </>
            );

            return (
              <Card 
                key={task.taskId} 
                className="relative overflow-hidden rounded-xl border-0 shadow-[var(--shadow-md)] transition-all duration-300 hover:shadow-[var(--shadow-lg)] hover:-translate-y-1 hover:scale-[1.02] group animate-fade-in-up"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Base layer - normal colors */}
                <div className="relative">
                  {renderTaskContent(false)}
                </div>

                {/* Progress fill layer - inverted colors */}
                {showProgressFill && (
                  <div
                    className="absolute inset-0 bg-primary transition-all duration-500 ease-out"
                    style={{
                      clipPath: `inset(0 ${100 - progress}% 0 0)`,
                    }}
                  >
                    {renderTaskContent(true)}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {activeTasks.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <CheckCircle2 className="h-8 w-8 text-foreground/60" />
            </div>
            <p className="text-muted-foreground font-light">All recommendations have been scheduled</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}