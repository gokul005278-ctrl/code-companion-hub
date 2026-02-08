import { cn } from '@/lib/utils';

interface SpeedometerGaugeProps {
  value: number;
  max?: number;
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SpeedometerGauge({ 
  value, 
  max = 100, 
  label, 
  sublabel,
  size = 'md',
  className 
}: SpeedometerGaugeProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  // Calculate the rotation angle (-90 to 90 degrees for half circle)
  const angle = -90 + (percentage * 1.8);
  
  // Determine color based on percentage
  const getColor = () => {
    if (percentage >= 75) return 'text-success';
    if (percentage >= 50) return 'text-warning';
    if (percentage >= 25) return 'text-warning';
    return 'text-destructive';
  };

  const getStrokeColor = () => {
    if (percentage >= 75) return 'hsl(var(--success))';
    if (percentage >= 50) return 'hsl(var(--warning))';
    if (percentage >= 25) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  const sizeClasses = {
    sm: 'w-24 h-14',
    md: 'w-32 h-20',
    lg: 'w-40 h-24',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className={cn('relative flex flex-col items-center', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        <svg 
          viewBox="0 0 100 60" 
          className="w-full h-full"
        >
          {/* Background arc */}
          <path
            d="M 10 55 A 40 40 0 0 1 90 55"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            strokeLinecap="round"
          />
          
          {/* Progress arc */}
          <path
            d="M 10 55 A 40 40 0 0 1 90 55"
            fill="none"
            stroke={getStrokeColor()}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 1.26} 126`}
            className="transition-all duration-700 ease-out"
          />
          
          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const tickAngle = (-90 + tick * 1.8) * (Math.PI / 180);
            const x1 = 50 + 35 * Math.cos(tickAngle);
            const y1 = 55 + 35 * Math.sin(tickAngle);
            const x2 = 50 + 42 * Math.cos(tickAngle);
            const y2 = 55 + 42 * Math.sin(tickAngle);
            return (
              <line
                key={tick}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="1"
                opacity="0.5"
              />
            );
          })}
          
          {/* Needle */}
          <g 
            transform={`rotate(${angle} 50 55)`}
            className="transition-transform duration-700 ease-out"
          >
            <polygon 
              points="50,20 48,55 52,55" 
              fill="hsl(var(--foreground))"
            />
            <circle cx="50" cy="55" r="4" fill="hsl(var(--foreground))" />
          </g>
        </svg>
        
        {/* Value display */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <span className={cn('font-bold', textSizes[size], getColor())}>
            {Math.round(value)}%
          </span>
        </div>
      </div>
      
      {label && (
        <p className="text-sm font-medium mt-1">{label}</p>
      )}
      {sublabel && (
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
}
