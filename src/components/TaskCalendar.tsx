import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  category: string;
}

interface TaskCalendarProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onDateClick: (date: Date) => void;
  viewMode: "month" | "week";
}

export function TaskCalendar({ tasks, onTaskClick, onDateClick, viewMode }: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const getDateRange = () => {
    if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return { start: weekStart, end: weekEnd };
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart);
      const calendarEnd = endOfWeek(monthEnd);
      return { start: calendarStart, end: calendarEnd };
    }
  };

  const { start, end } = getDateRange();
  const days = eachDayOfInterval({ start, end });

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      return isSameDay(new Date(task.due_date), day);
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-foreground text-background";
      case "medium": return "bg-muted text-foreground";
      case "low": return "bg-muted/50 text-muted-foreground";
      default: return "bg-muted text-foreground";
    }
  };

  const handlePrevious = () => {
    if (viewMode === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : [];

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">
            {viewMode === "week" 
              ? `Week of ${format(startOfWeek(currentDate), "MMM d, yyyy")}`
              : format(currentDate, "MMMM yyyy")}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const dayTasks = getTasksForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toString()}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "min-h-[100px] p-2 border border-border rounded-sm relative group cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]",
                  !isCurrentMonth && "bg-muted/30",
                  isToday && "border-foreground border-2",
                  selectedDay && isSameDay(selectedDay, day) && "ring-2 ring-primary"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={cn(
                    "text-sm",
                    isToday && "font-bold",
                    !isCurrentMonth && "text-muted-foreground"
                  )}>
                    {format(day, "d")}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDateClick(day);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map(task => (
                    <button
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick(task.id);
                      }}
                      className={cn(
                        "w-full text-left text-xs p-1 rounded truncate transition-opacity hover:opacity-70",
                        getPriorityColor(task.priority)
                      )}
                    >
                      {task.title}
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded Day View Sheet */}
      <Sheet open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {selectedDay && format(selectedDay, "EEEE, MMMM d, yyyy")}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {selectedDayTasks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No tasks scheduled for this day</p>
                <Button onClick={() => selectedDay && onDateClick(selectedDay)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {selectedDayTasks.length} {selectedDayTasks.length === 1 ? "task" : "tasks"}
                  </h3>
                  <Button onClick={() => selectedDay && onDateClick(selectedDay)} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>

                <div className="space-y-3">
                  {selectedDayTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task.id)}
                      className={cn(
                        "p-4 rounded-lg border border-border cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] animate-fade-in",
                        task.status === "completed" && "opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="font-medium flex-1">{task.title}</h4>
                        <Badge variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "secondary"}>
                          {task.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {task.category}
                        </Badge>
                        <span className="capitalize">{task.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
