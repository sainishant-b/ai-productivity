import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface NotificationOptions {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  data?: Record<string, unknown>;
  actions?: { action: string; title: string }[];
  requireInteraction?: boolean;
  silent?: boolean;
}

interface UseNotificationsReturn {
  permission: NotificationPermission | "unsupported";
  isSupported: boolean;
  isPushSubscribed: boolean;
  requestPermission: () => Promise<boolean>;
  sendNotification: (options: NotificationOptions) => void;
  scheduleNotification: (options: NotificationOptions, delayMs: number) => number;
  cancelScheduledNotification: (timeoutId: number) => void;
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<boolean>;
}

// VAPID public key for push notifications
const VAPID_PUBLIC_KEY = 'BPQBLz0nfTp7gcUF4rMnPa2DzwslH18EIKhmnwLxHkdF4ezhDzm2YBEmWXMfnMNn07T15_fzcFiHxEPljenSIe0';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check if notifications are supported
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      
      // Register service worker
      navigator.serviceWorker.register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration);
          setSwRegistration(registration);
          
          // Check if already subscribed
          registration.pushManager.getSubscription().then((subscription) => {
            setIsPushSubscribed(!!subscription);
          });
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "NOTIFICATION_CLICK") {
          // Handle notification click actions
          const { action, data } = event.data;
          
          if (data.type === "check-in" && action === "checkin") {
            // Dispatch custom event for check-in
            window.dispatchEvent(new CustomEvent("open-checkin"));
          } else if (data.type === "task-reminder" && action === "view") {
            // Navigate to task - handled by URL in sw.js
          }
        }
      });
    } else {
      setPermission("unsupported");
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error("Notifications are not supported in this browser");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        toast.success("Notifications enabled!");
        return true;
      } else if (result === "denied") {
        toast.error("Notifications were denied. You can enable them in browser settings.");
        return false;
      } else {
        toast.info("Notification permission was dismissed");
        return false;
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast.error("Failed to request notification permission");
      return false;
    }
  }, [isSupported]);

  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!swRegistration || !VAPID_PUBLIC_KEY) {
      console.error("Service worker or VAPID key not available");
      toast.error("Push notifications not configured");
      return false;
    }

    try {
      // Get the user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to enable push notifications");
        return false;
      }

      // Subscribe to push
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subscriptionJSON = subscription.toJSON();
      
      // Save subscription to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJSON.endpoint!,
          p256dh_key: subscriptionJSON.keys?.p256dh || '',
          auth_key: subscriptionJSON.keys?.auth || '',
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) {
        console.error("Error saving push subscription:", error);
        toast.error("Failed to save push subscription");
        return false;
      }

      setIsPushSubscribed(true);
      toast.success("Push notifications enabled!");
      return true;
    } catch (error) {
      console.error("Error subscribing to push:", error);
      toast.error("Failed to enable push notifications");
      return false;
    }
  }, [swRegistration]);

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!swRegistration) {
      return false;
    }

    try {
      const subscription = await swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint);
        }
      }

      setIsPushSubscribed(false);
      toast.success("Push notifications disabled");
      return true;
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      toast.error("Failed to disable push notifications");
      return false;
    }
  }, [swRegistration]);

  const sendNotification = useCallback(async (options: NotificationOptions) => {
    if (!isSupported || permission !== "granted") {
      console.log("Notifications not available or not permitted");
      toast.error("Notifications are not enabled");
      return;
    }

    try {
      // Always get the current service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      await registration.showNotification(options.title, {
        body: options.body,
        tag: options.tag || `notification-${Date.now()}`,
        icon: options.icon || "/favicon.ico",
        data: options.data,
        requireInteraction: options.requireInteraction,
        silent: options.silent,
      });
      
      toast.success("Notification sent!");
    } catch (error) {
      console.error("Failed to send notification:", error);
      // Fallback to regular notification
      try {
        new Notification(options.title, {
          body: options.body,
          tag: options.tag || `notification-${Date.now()}`,
          icon: options.icon || "/favicon.ico",
        });
        toast.success("Notification sent!");
      } catch (fallbackError) {
        console.error("Fallback notification also failed:", fallbackError);
        toast.error("Failed to send notification");
      }
    }
  }, [isSupported, permission]);

  const scheduleNotification = useCallback((options: NotificationOptions, delayMs: number): number => {
    const timeoutId = window.setTimeout(() => {
      sendNotification(options);
    }, delayMs);
    
    return timeoutId;
  }, [sendNotification]);

  const cancelScheduledNotification = useCallback((timeoutId: number) => {
    window.clearTimeout(timeoutId);
  }, []);

  return {
    permission,
    isSupported,
    isPushSubscribed,
    requestPermission,
    sendNotification,
    scheduleNotification,
    cancelScheduledNotification,
    subscribeToPush,
    unsubscribeFromPush,
  };
};

// Singleton instance for use outside of React components
let notificationInstance: {
  sendNotification: (options: NotificationOptions) => void;
} | null = null;

export const getNotificationSender = () => {
  if (!notificationInstance && "Notification" in window && Notification.permission === "granted") {
    notificationInstance = {
      sendNotification: (options: NotificationOptions) => {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(options.title, {
              body: options.body,
              tag: options.tag || `notification-${Date.now()}`,
              icon: options.icon || "/favicon.ico",
              data: options.data,
              requireInteraction: options.requireInteraction,
              silent: options.silent,
            });
          });
        } else {
          new Notification(options.title, {
            body: options.body,
            icon: options.icon || "/favicon.ico",
          });
        }
      },
    };
  }
  return notificationInstance;
};
