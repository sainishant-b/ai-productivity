import { Flame, CheckCircle2, Clock } from "lucide-react";
import CountUpNumber from "@/components/CountUpNumber";

interface MobileStatsBarProps {
  streak: number;
  completedCount: number;
  nextCheckIn?: string;
  isWorkHours?: boolean;
}

const MobileStatsBar = ({ streak, completedCount, nextCheckIn, isWorkHours }: MobileStatsBarProps) => {
  return (
    <>
      {/* Tablet view - horizontal stats bar with more detail */}
      <div className="hidden md:flex lg:hidden items-center justify-center gap-6 px-4 py-3 bg-card/80 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-orange/10">
          <Flame className="h-4 w-4 text-accent-orange" />
          <span className="font-bold text-lg"><CountUpNumber value={streak} /></span>
          <span className="text-sm text-muted-foreground">day streak</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-green/10">
          <CheckCircle2 className="h-4 w-4 text-accent-green" />
          <span className="font-bold text-lg"><CountUpNumber value={completedCount} /></span>
          <span className="text-sm text-muted-foreground">completed</span>
        </div>
        {nextCheckIn && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-blue/10">
            <Clock className="h-4 w-4 text-accent-blue" />
            <span className="font-semibold text-sm">{nextCheckIn}</span>
            <span className="text-xs text-muted-foreground">{isWorkHours ? "check-in" : "off"}</span>
          </div>
        )}
      </div>

      {/* Mobile view - minimal chips */}
      <div className="flex md:hidden items-center gap-3 px-3 py-2 bg-card/80 backdrop-blur-sm border-b border-border/50 overflow-x-auto scrollbar-hide max-w-full">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-accent-orange/10 shrink-0">
          <Flame className="h-3.5 w-3.5 text-accent-orange" />
          <span className="font-bold text-sm"><CountUpNumber value={streak} /></span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-accent-green/10 shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5 text-accent-green" />
          <span className="font-bold text-sm"><CountUpNumber value={completedCount} /></span>
        </div>
        {nextCheckIn && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-accent-blue/10 shrink-0">
            <Clock className="h-3.5 w-3.5 text-accent-blue" />
            <span className="font-semibold text-xs">{nextCheckIn}</span>
          </div>
        )}
      </div>
    </>
  );
};

export default MobileStatsBar;