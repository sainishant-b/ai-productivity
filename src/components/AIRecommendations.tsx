import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock, CheckCircle2, XCircle, Loader2, Calendar, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Recommendation {
  task_id: string;
  task_title: string;
  suggested_date: string;
  suggested_time_slot: string;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

interface RecommendationsData {
  recommendations: Recommendation[];
  general_insights: string;
}

interface AIRecommendationsProps {
  onTaskUpdate: () => void;
}

export default function AIRecommendations({ onTaskUpdate }: AIRecommendationsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationsData | null>(null);
  const [acceptedTasks, setAcceptedTasks] = useState<Set<string>>(new Set());
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

  const acceptRecommendation = async (rec: Recommendation) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          due_date: rec.suggested_date,
        })
        .eq('id', rec.task_id);

      if (error) throw error;

      setAcceptedTasks(prev => new Set(prev).add(rec.task_id));
      toast({
        title: 'Success',
        description: `Task "${rec.task_title}" scheduled for ${new Date(rec.suggested_date).toLocaleDateString()}`,
      });
      onTaskUpdate();
    } catch (error: any) {
      console.error('Error accepting recommendation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const rejectRecommendation = (taskId: string) => {
    setAcceptedTasks(prev => {
      const next = new Set(prev);
      next.add(taskId); // Mark as processed so it doesn't show anymore
      return next;
    });
  };

  const getConfidenceBadge = (confidence: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      high: { variant: 'default', label: 'High Confidence' },
      medium: { variant: 'secondary', label: 'Medium Confidence' },
      low: { variant: 'outline', label: 'Low Confidence' },
    };
    const config = variants[confidence] || variants.medium;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const activeRecommendations = recommendations?.recommendations.filter(
    rec => !acceptedTasks.has(rec.task_id)
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Scheduling Recommendations
            </CardTitle>
            <CardDescription>
              Based on your work patterns, energy levels, and task priorities
            </CardDescription>
          </div>
          <Button
            onClick={getRecommendations}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* General Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {recommendations.general_insights}
            </p>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">
            {activeRecommendations.length > 0 
              ? `${activeRecommendations.length} Task${activeRecommendations.length !== 1 ? 's' : ''} to Schedule`
              : 'All recommendations processed'}
          </h3>
          {activeRecommendations.map((rec) => (
            <Card key={rec.task_id} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-base">{rec.task_title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <Calendar className="h-3 w-3" />
                      {new Date(rec.suggested_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                      <Clock className="h-3 w-3 ml-2" />
                      {rec.suggested_time_slot}
                    </CardDescription>
                  </div>
                  {getConfidenceBadge(rec.confidence)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm text-foreground">{rec.reasoning}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => acceptRecommendation(rec)}
                    size="sm"
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    onClick={() => rejectRecommendation(rec.task_id)}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Skip
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {activeRecommendations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>All recommendations have been processed</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}