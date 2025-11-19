import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock, CheckCircle2, XCircle, Loader2, Calendar, RefreshCw } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationsData | null>(null);
  const [scheduledTasks, setScheduledTasks] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    getRecommendations();
  }, []);

  const getRecommendations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('task-recommendations', {
        body: {},
      });

      if (error) throw error;

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
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      high: { variant: 'destructive', label: 'High' },
      medium: { variant: 'default', label: 'Medium' },
      low: { variant: 'secondary', label: 'Low' },
    };
    const config = variants[priority] || variants.medium;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getWarningIcon = (type: string) => {
    switch (type) {
      case 'overdue': return '⚠️';
      case 'conflict': return '⚡';
      case 'overload': return '🔥';
      default: return 'ℹ️';
    }
  };

  const activeTasks = recommendations?.recommendedTasks.filter(
    task => !scheduledTasks.has(task.taskId)
  ) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Scheduling Recommendations
          </CardTitle>
          <CardDescription>Analyzing your work patterns and tasks...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!recommendations) return null;

  return (
    <Card className="shadow-[var(--shadow-lg)] transition-shadow duration-300 hover:shadow-[var(--shadow-xl)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              Daily Top 5 Recommendations
            </CardTitle>
            <CardDescription>
              Smart task matching based on your energy patterns and priorities
            </CardDescription>
          </div>
          <Button
            onClick={getRecommendations}
            variant="ghost"
            size="sm"
            className="gap-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warnings */}
        {recommendations.warnings && recommendations.warnings.length > 0 && (
          <div className="space-y-2">
            {recommendations.warnings.map((warning, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 transition-all duration-200 hover:shadow-md hover:bg-destructive/15 hover:-translate-y-0.5"
              >
                <span className="text-lg">{getWarningIcon(warning.type)}</span>
                <p className="text-sm text-foreground flex-1">{warning.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Insights */}
        {recommendations.insights && recommendations.insights.length > 0 && (
          <Card className="shadow-[var(--shadow-md)] transition-all duration-300 hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5">
            <CardHeader>
              <CardTitle className="text-base">Key Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recommendations.insights.map((insight, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2 transition-transform duration-200 hover:translate-x-1">
                    <Sparkles className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Task Recommendations */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">
            {activeTasks.length > 0 
              ? `${activeTasks.length} Recommended Task${activeTasks.length !== 1 ? 's' : ''} for Today`
              : 'All tasks scheduled'}
          </h3>
          {activeTasks.map((task, idx) => (
            <Card key={task.taskId} className="border-l-4 border-l-primary shadow-[var(--shadow-md)] transition-all duration-300 hover:shadow-[var(--shadow-lift)] hover:-translate-y-1 group">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3">
                        {idx + 1}
                      </span>
                      <CardTitle className="text-base">{task.title}</CardTitle>
                    </div>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <Clock className="h-3 w-3" />
                      {task.suggestedTime}
                    </CardDescription>
                  </div>
                  {getPriorityBadge(task.priority)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-md transition-colors duration-200 group-hover:bg-muted/70">
                  <p className="text-sm text-foreground">{task.reasoning}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => scheduleTask(task)}
                    size="sm"
                    className="gap-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Schedule This
                  </Button>
                  <Button
                    onClick={() => dismissTask(task.taskId)}
                    size="sm"
                    variant="outline"
                    className="gap-2 transition-all duration-200 hover:scale-105"
                  >
                    <XCircle className="h-4 w-4" />
                    Skip
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {activeTasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>All recommendations have been scheduled</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}