import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY_PREFIX = "work_session_";

interface WorkSessionState {
  isWorking: boolean;
  startTime: string | null;
}

export const useWorkSessionTimer = (taskId: string | undefined) => {
  const [isWorking, setIsWorking] = useState(false);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const storageKey = taskId ? `${STORAGE_KEY_PREFIX}${taskId}` : null;

  // Load session state from localStorage on mount
  useEffect(() => {
    if (!storageKey) return;

    const savedState = localStorage.getItem(storageKey);
    if (savedState) {
      try {
        const state: WorkSessionState = JSON.parse(savedState);
        if (state.isWorking && state.startTime) {
          const startDate = new Date(state.startTime);
          setSessionStart(startDate);
          setIsWorking(true);
        }
      } catch (e) {
        localStorage.removeItem(storageKey);
      }
    }
  }, [storageKey]);

  // Update elapsed time every second when working
  useEffect(() => {
    if (!isWorking || !sessionStart) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - sessionStart.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [isWorking, sessionStart]);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (!storageKey) return;

    if (isWorking && sessionStart) {
      const state: WorkSessionState = {
        isWorking: true,
        startTime: sessionStart.toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(state));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [isWorking, sessionStart, storageKey]);

  const startSession = useCallback(() => {
    const now = new Date();
    setSessionStart(now);
    setIsWorking(true);
  }, []);

  const endSession = useCallback(() => {
    setIsWorking(false);
    setSessionStart(null);
    setElapsedSeconds(0);
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }, []);

  const formatTimeReadable = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes} min ${secs} sec`;
    }
    return `${secs} sec`;
  }, []);

  return {
    isWorking,
    sessionStart,
    elapsedSeconds,
    startSession,
    endSession,
    formatTime,
    formatTimeReadable,
  };
};
