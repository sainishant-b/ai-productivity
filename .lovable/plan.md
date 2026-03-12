

# Preparing the Codebase for External Supabase

## Key Finding: The Code is Already Supabase-Standard

The frontend code (`src/`) uses the standard `@supabase/supabase-js` SDK throughout. There is **nothing Cloud-specific** to remove — every `supabase.from(...)`, `supabase.auth...`, etc. call works identically with any Supabase project. The `.env` file (which holds the URL and anon key) just needs to point to your own project after you set up the new one.

## The One Cloud-Specific Piece: AI Recommendations

The edge function `supabase/functions/task-recommendations/index.ts` calls the **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`) using `LOVABLE_API_KEY`. This will **not work** outside Lovable Cloud.

### Options for the AI function:

1. **Replace with OpenAI API** — Rewrite the function to call `https://api.openai.com/v1/chat/completions` using your own `OPENAI_API_KEY`
2. **Replace with Google Gemini API** — Rewrite to call Google's API directly with your own key
3. **Remove AI recommendations entirely** — Delete the edge function and the `AIRecommendations` component from the Dashboard

## What I'll Do (after your choice)

1. **Rewrite or remove** `task-recommendations/index.ts` based on your preference
2. **If removing**: Also remove `AIRecommendations` import/usage from `Dashboard.tsx`
3. **Generate `SUPABASE_MIGRATION.md`** — Complete SQL script with all 7 tables, RLS policies, functions, and the missing `on_auth_user_created` trigger, ready to paste into your Supabase SQL Editor
4. **`send-push-notification`** function is standard (no Lovable dependencies) — works as-is with VAPID keys configured in your own Supabase project

## Migration Steps (for you)

1. Create new Lovable project with Cloud **disabled**
2. Push this repo's code via GitHub
3. Connect your Supabase project in Settings → Connectors → Supabase
4. Run the migration SQL in your Supabase SQL Editor
5. Add secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and optionally `OPENAI_API_KEY`) in your Supabase dashboard
6. Deploy edge functions via Supabase CLI

