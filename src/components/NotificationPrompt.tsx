import { Bell, BellOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotifications } from "@/hooks/useNotifications";

interface NotificationPromptProps {
  onDismiss?: () => void;
  compact?: boolean;
}

const NotificationPrompt = ({ onDismiss, compact = false }: NotificationPromptProps) => {
  const { permission, isSupported, requestPermission } = useNotifications();

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted && onDismiss) {
      onDismiss();
    }
  };

  if (!isSupported) {
    return null;
  }

  if (permission === "granted") {
    if (compact) return null;
    
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="h-8 w-8 rounded-full bg-success/20 flex items-center justify-center">
            <Check className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="text-sm font-medium">Notifications enabled</p>
            <p className="text-xs text-muted-foreground">You'll receive check-in reminders and task notifications</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (permission === "denied") {
    if (compact) return null;
    
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center">
            <BellOff className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-medium">Notifications blocked</p>
            <p className="text-xs text-muted-foreground">Enable notifications in your browser settings to receive reminders</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Button variant="outline" size="sm" onClick={handleEnable} className="gap-2">
        <Bell className="h-4 w-4" />
        Enable Notifications
      </Button>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Stay on Track
        </CardTitle>
        <CardDescription>
          Get notified for check-ins and task reminders
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button onClick={handleEnable} size="sm">
          Enable Notifications
        </Button>
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Maybe Later
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationPrompt;
