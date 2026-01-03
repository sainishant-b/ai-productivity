import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Moon, Sun, User, Bell, BellOff, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";

const Settings = () => {
  const navigate = useNavigate();
  const [workHoursStart, setWorkHoursStart] = useState("09:00");
  const [workHoursEnd, setWorkHoursEnd] = useState("17:00");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  
  const { permission, isSupported, requestPermission, sendNotification } = useNotifications();

  useEffect(() => {
    loadSettings();
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" || "dark";
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("work_hours_start, work_hours_end")
      .eq("id", user.id)
      .single();

    if (profile) {
      setWorkHoursStart(profile.work_hours_start || "09:00");
      setWorkHoursEnd(profile.work_hours_end || "17:00");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        work_hours_start: workHoursStart,
        work_hours_end: workHoursEnd,
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Settings saved successfully");
    }
    setLoading(false);
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const handleTestNotification = () => {
    sendNotification({
      title: "Test Notification 🔔",
      body: "Notifications are working! You'll receive check-in reminders and task alerts.",
      tag: "test-notification",
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-4xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-2">Customize your experience</p>
          </div>
          <Button onClick={() => navigate("/")} variant="outline">
            Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Work Hours
            </CardTitle>
            <CardDescription>
              Set your typical work hours for better productivity tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={workHoursStart}
                  onChange={(e) => setWorkHoursStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={workHoursEnd}
                  onChange={(e) => setWorkHoursEnd(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full md:w-auto">
              Save Work Hours
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              Appearance
            </CardTitle>
            <CardDescription>
              Choose between light and dark theme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={toggleTheme} variant="outline" className="w-full md:w-auto">
              {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            </Button>
          </CardContent>
        </Card>

        {isSupported && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                {permission === "granted" ? (
                  <Bell className="h-5 w-5 text-success" />
                ) : permission === "denied" ? (
                  <BellOff className="h-5 w-5 text-destructive" />
                ) : (
                  <Bell className="h-5 w-5" />
                )}
                Notifications
              </CardTitle>
              <CardDescription>
                Get notified about check-ins and task reminders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {permission === "granted" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-success">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Notifications are enabled</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>You'll receive notifications for:</p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>Check-in reminders during work hours</li>
                      <li>Tasks due today</li>
                      <li>Overdue task alerts</li>
                      <li>Upcoming task reminders</li>
                    </ul>
                  </div>
                  <Button onClick={handleTestNotification} variant="outline" className="w-full md:w-auto">
                    Send Test Notification
                  </Button>
                </div>
              ) : permission === "denied" ? (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">Notifications are blocked</p>
                  <p className="text-sm text-muted-foreground">
                    To enable notifications, click the lock icon in your browser's address bar and allow notifications for this site.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Enable notifications to stay on track with check-ins and never miss a deadline.
                  </p>
                  <Button onClick={requestPermission} className="w-full md:w-auto">
                    Enable Notifications
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>
              Manage your account settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSignOut} variant="destructive" className="w-full md:w-auto">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
