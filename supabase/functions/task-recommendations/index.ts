import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from auth
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('No user found');
    }

    console.log('Fetching tasks and data for user:', user.id);

    // Fetch user's tasks
    const { data: tasks, error: tasksError } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      throw tasksError;
    }

    // Fetch user's profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw profileError;
    }

    // Fetch recent check-ins for energy/mood patterns
    const { data: checkIns, error: checkInsError } = await supabaseClient
      .from('check_ins')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (checkInsError) {
      console.error('Error fetching check-ins:', checkInsError);
    }

    console.log('Data fetched:', {
      tasksCount: tasks?.length,
      hasProfile: !!profile,
      checkInsCount: checkIns?.length,
    });

    // Build context for AI
    const context = {
      tasks: tasks?.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status,
        category: t.category,
        due_date: t.due_date,
        estimated_duration: t.estimated_duration,
        progress: t.progress,
      })),
      workHours: {
        start: profile?.work_hours_start,
        end: profile?.work_hours_end,
        timezone: profile?.timezone,
      },
      recentCheckIns: checkIns?.map(c => ({
        mood: c.mood,
        energy_level: c.energy_level,
        created_at: c.created_at,
      })),
      streak: profile?.current_streak,
    };

    const systemPrompt = `You are an intelligent task scheduling assistant. Analyze the user's tasks, work patterns, and energy levels to provide optimal scheduling recommendations.

Consider:
- Task priority, estimated duration, and deadlines
- User's work hours (${profile?.work_hours_start} to ${profile?.work_hours_end})
- Recent energy levels and mood patterns from check-ins
- Task categories and their typical cognitive demands
- Time of day best suited for different types of work

Provide recommendations using the suggest_tasks tool. For each task, suggest an optimal time slot and explain your reasoning based on the user's patterns.`;

    const userPrompt = `Here's my current situation:

Tasks: ${JSON.stringify(context.tasks, null, 2)}

Work Schedule: ${context.workHours.start} - ${context.workHours.end} (${context.workHours.timezone})

Recent Energy/Mood Patterns: ${JSON.stringify(context.recentCheckIns, null, 2)}

Current Streak: ${context.streak} days

Please analyze my tasks and suggest optimal scheduling for incomplete tasks. Focus on tasks that need scheduling or rescheduling.`;

    console.log('Calling Lovable AI...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_task_schedule',
              description: 'Provide scheduling recommendations for tasks',
              parameters: {
                type: 'object',
                properties: {
                  recommendations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        task_id: { type: 'string', description: 'ID of the task' },
                        task_title: { type: 'string', description: 'Title of the task' },
                        suggested_date: { type: 'string', description: 'Suggested date in ISO format' },
                        suggested_time_slot: { type: 'string', description: 'e.g., "9:00 AM - 10:30 AM"' },
                        reasoning: { type: 'string', description: 'Explanation for this recommendation' },
                        confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Confidence in recommendation' },
                      },
                      required: ['task_id', 'task_title', 'suggested_date', 'suggested_time_slot', 'reasoning', 'confidence'],
                      additionalProperties: false,
                    },
                  },
                  general_insights: {
                    type: 'string',
                    description: 'Overall insights about the schedule and work patterns',
                  },
                },
                required: ['recommendations', 'general_insights'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_task_schedule' } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received:', JSON.stringify(aiData, null, 2));

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const recommendations = JSON.parse(toolCall.function.arguments);
    console.log('Recommendations generated:', recommendations);

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in task-recommendations function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});