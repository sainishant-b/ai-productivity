import { Flame, CheckCircle2 } from "lucide-react";
import CountUpNumber from "@/components/CountUpNumber";

interface MobileStatsBarProps {
  streak: number;
  completedCount: number;
}

const MobileStatsBar = ({ streak, completedCount }: MobileStatsBarProps) => {
  return (
    <div className="flex lg:hidden items-center gap-4 px-4 py-2 bg-card/80 backdrop-blur-sm border-b border-border/50">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-accent-orange" />
        <span className="font-bold"><CountUpNumber value={streak} /></span>
        <span className="text-xs text-muted-foreground">streak</span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-accent-green" />
        <span className="font-bold"><CountUpNumber value={completedCount} /></span>
        <span className="text-xs text-muted-foreground">done</span>
      </div>
    </div>
  );
};

export default MobileStatsBar;
