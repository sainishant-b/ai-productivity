import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface NotificationOptions {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  data?: Record<string, any>;
  actions?: { action: string; title: string }[];
  requireInteraction?: boolean;
  silent?: boolean;
}

interface UseNotificationsReturn {
  permission: NotificationPermission | "unsupported";
  isSupported: boolean;
  requestPermission: () => Promise<boolean>;
  sendNotification: (options: NotificationOptions) => void;
  scheduleNotification: (options: NotificationOptions, delayMs: number) => number;
  cancelScheduledNotification: (timeoutId: number) => void;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSupported, setIsSupported] = useState(false);
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

  const sendNotification = useCallback((options: NotificationOptions) => {
    if (!isSupported || permission !== "granted") {
      console.log("Notifications not available or not permitted");
      return;
    }

    const notificationOptions: NotificationOptions = {
      ...options,
      icon: options.icon || "/favicon.ico",
    };

    // Use service worker to show notification if available
    if (swRegistration) {
      swRegistration.showNotification(options.title, {
        body: options.body,
        tag: options.tag || `notification-${Date.now()}`,
        icon: notificationOptions.icon,
        data: options.data,
        actions: options.actions,
        requireInteraction: options.requireInteraction,
        silent: options.silent,
      } as NotificationOptions);
    } else {
      // Fallback to regular notification
      new Notification(options.title, {
        body: options.body,
        tag: options.tag || `notification-${Date.now()}`,
        icon: notificationOptions.icon,
      });
    }
  }, [isSupported, permission, swRegistration]);

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
    requestPermission,
    sendNotification,
    scheduleNotification,
    cancelScheduledNotification,
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
              actions: options.actions,
              requireInteraction: options.requireInteraction,
              silent: options.silent,
            } as NotificationOptions);
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
