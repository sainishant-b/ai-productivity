# Edge Functions Migration Guide

This file contains the **exact code** for both edge functions, rewritten to work on any standalone Supabase project (no Lovable Cloud dependency).

---

## Prerequisites

### Secrets to configure

Run these commands after linking your Supabase project:

```bash
supabase secrets set VAPID_PUBLIC_KEY="your-vapid-public-key"
supabase secrets set VAPID_PRIVATE_KEY="your-vapid-private-key"
supabase secrets set OPENAI_API_KEY="your-openai-api-key"
```

> **VAPID keys**: Generate with `npx web-push generate-vapid-keys`
> **OpenAI key**: Get from https://platform.openai.com/api-keys

---

## config.toml

Make sure your `supabase/config.toml` includes:

```toml
[functions.task-recommendations]
verify_jwt = false

[functions.send-push-notification]
verify_jwt = false
```

---

## Function 1: `send-push-notification`

> This function works as-is — no changes needed from the Lovable version.

**File: `supabase/functions/send-push-notification/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, title, body, data, tag } = await req.json();

    console.log(`Sending push notification to user ${userId}: ${title}`);

    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user');
      return new Response(
        JSON.stringify({ message: 'No subscriptions found', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.stringify({
      title,
      body,
      tag: tag || `notification-${Date.now()}`,
      data: data || {},
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });

    let successCount = 0;
    let failCount = 0;
    const expiredSubscriptions: string[] = [];

    for (const subscription of subscriptions) {
      try {
        const response = await fetch(subscription.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
            'TTL': '86400',
          },
          body: payload,
        });

        if (response.status === 201 || response.status === 200) {
          successCount++;
        } else if (response.status === 404 || response.status === 410) {
          expiredSubscriptions.push(subscription.id);
        } else {
          failCount++;
          const responseText = await response.text();
          console.error(`Failed to send to ${subscription.id}: ${response.status} ${responseText}`);
        }
      } catch (err) {
        failCount++;
        console.error(`Error sending to ${subscription.id}:`, err instanceof Error ? err.message : err);
      }
    }

    if (expiredSubscriptions.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', expiredSubscriptions);
    }

    return new Response(
      JSON.stringify({ sent: successCount, failed: failCount, expired: expiredSubscriptions.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## Function 2: `task-recommendations`

> **This is the rewritten version.** It uses the **OpenAI API directly** instead of the Lovable AI Gateway.
> If you prefer Google Gemini, see the alternative section below.

**File: `supabase/functions/task-recommendations/index.ts`**

```typescript
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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const authHeader =
      req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';

    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const jwt = authHeader.replace(/Bearer\s+/i, '').trim();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's incomplete tasks
    const { data: tasks, error: tasksError } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'completed')
      .order('created_at', { ascending: false });

    if (tasksError) throw tasksError;

    // Fetch user's profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // Fetch recent check-ins
    const { data: checkIns } = await supabaseClient
      .from('check_ins')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

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

    const now = new Date();

    const systemPrompt = `You are an AI productivity assistant specializing in task scheduling optimization.

Your goal is to recommend the DAILY TOP 5 tasks with optimal time slots based on:
- Task priority, due dates, and estimated duration
- User's energy patterns (identify peak productivity times from check-in history)
- Historical mood and completion patterns
- Current date/time context

SMART MATCHING RULES:
- Match high-priority/complex tasks with peak energy times
- Schedule quick wins during low energy periods
- Respect work hours preferences (${profile?.work_hours_start} to ${profile?.work_hours_end})
- Balance workload across the day

Always provide:
1. Top 5 task recommendations for TODAY with specific time slots
2. Brief, actionable reasoning for each recommendation (1-2 sentences max)
3. Warnings about: overdue tasks, schedule conflicts, workload concerns
4. Overall insights about the user's schedule and patterns (2-3 key points)`;

    const userPrompt = `Analyze and recommend scheduling for TODAY (${now.toLocaleDateString()}):

USER DATA:
${JSON.stringify(context, null, 2)}

Current time: ${now.toLocaleTimeString()}

Focus on the top 5 most important tasks for today.`;

    // Call OpenAI API directly
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_task_schedule',
              description: 'Provide daily top 5 task recommendations with smart time matching',
              parameters: {
                type: 'object',
                properties: {
                  recommendedTasks: {
                    type: 'array',
                    description: 'Top 5 tasks recommended for today (max 5)',
                    items: {
                      type: 'object',
                      properties: {
                        taskId: { type: 'string', description: 'UUID of the task' },
                        title: { type: 'string', description: 'Task title' },
                        suggestedTime: { type: 'string', description: 'Time slot (e.g., "9:00 AM - 11:00 AM")' },
                        suggestedDate: { type: 'string', description: 'Date in YYYY-MM-DD format' },
                        reasoning: { type: 'string', description: 'Brief explanation (1-2 sentences)' },
                        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                        progress: { type: 'number', description: 'Task progress 0-100' },
                        status: { type: 'string', description: 'Task status' }
                      },
                      required: ['taskId', 'title', 'suggestedTime', 'suggestedDate', 'reasoning', 'confidence', 'priority']
                    }
                  },
                  insights: {
                    type: 'array',
                    description: 'Key insights (2-3 items)',
                    items: { type: 'string' }
                  },
                  warnings: {
                    type: 'array',
                    description: 'Important warnings',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string', enum: ['overdue', 'conflict', 'overload', 'other'] },
                        message: { type: 'string' }
                      },
                      required: ['type', 'message']
                    }
                  }
                },
                required: ['recommendedTasks', 'insights', 'warnings']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_task_schedule' } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenAI API error:', aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`OpenAI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== 'suggest_task_schedule') {
      throw new Error('AI did not provide recommendations');
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Merge task progress/status from fetched tasks
    const taskMap = new Map(tasks?.map(t => [t.id, t]) || []);
    if (result.recommendedTasks) {
      result.recommendedTasks = result.recommendedTasks.map((rec: any) => {
        const task = taskMap.get(rec.taskId);
        return {
          ...rec,
          progress: task?.progress ?? 0,
          status: task?.status ?? 'not_started',
        };
      });
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## Alternative: Using Google Gemini Instead of OpenAI

If you prefer Gemini, make these changes in the `task-recommendations` function:

1. **Secret**: Use `GEMINI_API_KEY` instead of `OPENAI_API_KEY`

```bash
supabase secrets set GEMINI_API_KEY="your-gemini-api-key"
```

2. **Replace the fetch URL and headers**:

```typescript
// Change this:
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    // ...rest stays the same
  }),
});

// To this:
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
  headers: {
    'Authorization': `Bearer ${GEMINI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gemini-2.0-flash',
    // ...rest stays the same
  }),
});
```

Everything else (tool calling, request/response format) is identical — Gemini's OpenAI-compatible endpoint uses the same schema.

---

## Deployment

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_ID
supabase functions deploy send-push-notification --no-verify-jwt
supabase functions deploy task-recommendations --no-verify-jwt
```

Done! Both functions will work independently of Lovable Cloud.
