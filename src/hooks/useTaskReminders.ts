import { useEffect, useRef, useCallback } from "react";
import { getNotificationSender } from "@/hooks/useNotifications";

interface Task {
  id: string;
  title: string;
  due_date?: string | null;
  status: string;
  priority?: string;
}

interface UseTaskRemindersOptions {
  tasks: Task[];
  enabled?: boolean;
}

export const useTaskReminders = ({ tasks, enabled = true }: UseTaskRemindersOptions) => {
  const notifiedTasks = useRef<Set<string>>(new Set());
  const checkIntervalRef = useRef<number | null>(null);

  const checkTaskReminders = useCallback(() => {
    if (!enabled) return;
    
    const notificationSender = getNotificationSender();
    if (!notificationSender) return;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    tasks.forEach((task) => {
      if (task.status === "completed" || !task.due_date) return;
      
      const dueDate = new Date(task.due_date);
      const dueDateStart = new Date(dueDate);
      dueDateStart.setHours(0, 0, 0, 0);
      
      const taskKey = `${task.id}-${dueDateStart.toISOString()}`;
      
      // Already notified for this task today
      if (notifiedTasks.current.has(taskKey)) return;

      const timeDiff = dueDateStart.getTime() - todayStart.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

      // Overdue task
      if (daysDiff < 0) {
        notificationSender.sendNotification({
          title: "⚠️ Overdue Task",
          body: `"${task.title}" is ${Math.abs(daysDiff)} day${Math.abs(daysDiff) > 1 ? 's' : ''} overdue`,
          tag: `task-overdue-${task.id}`,
          data: { type: "task-reminder", taskId: task.id },
          actions: [
            { action: "view", title: "View Task" },
            { action: "dismiss", title: "Dismiss" }
          ],
          requireInteraction: true,
        });
        notifiedTasks.current.add(taskKey);
      }
      // Due today
      else if (daysDiff === 0) {
        notificationSender.sendNotification({
          title: "📅 Task Due Today",
          body: `"${task.title}" is due today!`,
          tag: `task-due-${task.id}`,
          data: { type: "task-reminder", taskId: task.id },
          actions: [
            { action: "view", title: "View Task" },
            { action: "dismiss", title: "Dismiss" }
          ],
        });
        notifiedTasks.current.add(taskKey);
      }
      // Due tomorrow (optional reminder)
      else if (daysDiff === 1) {
        // Check if it's after 6 PM to send "due tomorrow" reminder
        if (now.getHours() >= 18) {
          notificationSender.sendNotification({
            title: "📋 Task Due Tomorrow",
            body: `"${task.title}" is due tomorrow`,
            tag: `task-upcoming-${task.id}`,
            data: { type: "task-reminder", taskId: task.id },
            actions: [
              { action: "view", title: "View Task" },
              { action: "dismiss", title: "Dismiss" }
            ],
          });
          notifiedTasks.current.add(taskKey);
        }
      }
    });
  }, [tasks, enabled]);

  useEffect(() => {
    // Check immediately on mount and when tasks change
    checkTaskReminders();

    // Check every 30 minutes
    checkIntervalRef.current = window.setInterval(checkTaskReminders, 30 * 60 * 1000);

    return () => {
      if (checkIntervalRef.current) {
        window.clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkTaskReminders]);

  // Reset notified tasks at midnight
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = midnight.getTime() - now.getTime();
    
    const midnightTimeout = window.setTimeout(() => {
      notifiedTasks.current.clear();
    }, msUntilMidnight);

    return () => window.clearTimeout(midnightTimeout);
  }, []);

  return {
    checkNow: checkTaskReminders,
  };
};
