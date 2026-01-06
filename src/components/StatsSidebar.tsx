import { Flame, CheckCircle2, Clock } from "lucide-react";
import CountUpNumber from "@/components/CountUpNumber";

interface StatsSidebarProps {
  streak: number;
  completedCount: number;
  nextCheckIn: string;
  isWorkHours: boolean;
}

const StatsSidebar = ({ streak, completedCount, nextCheckIn, isWorkHours }: StatsSidebarProps) => {
  return (
    <aside className="hidden lg:flex flex-col gap-3 w-[180px] shrink-0 sticky top-20 h-fit">
      {/* Streak */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm">
        <div className="p-2 rounded-lg bg-accent-orange/10">
          <Flame className="h-4 w-4 text-accent-orange" />
        </div>
        <div>
          <div className="text-2xl font-bold leading-none">
            <CountUpNumber value={streak} />
          </div>
          <div className="text-xs text-muted-foreground">day streak</div>
        </div>
      </div>

      {/* Completed */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm">
        <div className="p-2 rounded-lg bg-accent-green/10">
          <CheckCircle2 className="h-4 w-4 text-accent-green" />
        </div>
        <div>
          <div className="text-2xl font-bold leading-none">
            <CountUpNumber value={completedCount} />
          </div>
          <div className="text-xs text-muted-foreground">completed</div>
        </div>
      </div>

      {/* Next Check-in */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm">
        <div className="p-2 rounded-lg bg-accent-blue/10">
          <Clock className="h-4 w-4 text-accent-blue" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">{nextCheckIn}</div>
          <div className="text-xs text-muted-foreground">
            {isWorkHours ? "next check-in" : "off hours"}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default StatsSidebar;
