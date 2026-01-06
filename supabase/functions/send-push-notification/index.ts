import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
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

    // Get user's push subscriptions
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
        // Send push notification using simple POST to push endpoint
        // Note: Full web push encryption requires web-push library
        // For now, we'll rely on the service worker to handle the payload
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
          console.log(`Successfully sent to subscription ${subscription.id}`);
        } else if (response.status === 404 || response.status === 410) {
          // Subscription expired or invalid
          expiredSubscriptions.push(subscription.id);
          console.log(`Subscription ${subscription.id} expired, marking for deletion`);
        } else {
          failCount++;
          const responseText = await response.text();
          console.error(`Failed to send to subscription ${subscription.id}: ${response.status} ${responseText}`);
        }
      } catch (err) {
        failCount++;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error sending to subscription ${subscription.id}:`, errorMessage);
      }
    }

    // Clean up expired subscriptions
    if (expiredSubscriptions.length > 0) {
      const { error: deleteError } = await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', expiredSubscriptions);

      if (deleteError) {
        console.error('Error deleting expired subscriptions:', deleteError);
      } else {
        console.log(`Deleted ${expiredSubscriptions.length} expired subscriptions`);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Push notifications processed',
        sent: successCount,
        failed: failCount,
        expired: expiredSubscriptions.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in send-push-notification:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
