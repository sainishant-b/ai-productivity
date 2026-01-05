import { useEffect, useState, useRef } from "react";

interface CountUpNumberProps {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
}

const CountUpNumber = ({ value, duration = 1000, suffix = "", className = "" }: CountUpNumberProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    // Only animate on first load or when value changes significantly
    if (!hasAnimated.current || Math.abs(value - previousValue.current) > 0) {
      hasAnimated.current = true;
      previousValue.current = value;

      const startValue = displayValue;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (value - startValue) * easeOutQuart);
        
        setDisplayValue(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(value);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [value, duration]);

  return (
    <span className={`tabular-nums ${className}`}>
      {displayValue}{suffix}
    </span>
  );
};

export default CountUpNumber;