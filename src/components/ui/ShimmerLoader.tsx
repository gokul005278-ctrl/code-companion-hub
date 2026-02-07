import { cn } from '@/lib/utils';

interface ShimmerLoaderProps {
  className?: string;
}

export function ShimmerCard({ className }: ShimmerLoaderProps) {
  return (
    <div className={cn('zoho-card p-4 space-y-4', className)}>
      <div className="flex items-center gap-4">
        <div className="shimmer h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="shimmer h-4 w-2/3 rounded" />
          <div className="shimmer h-3 w-1/2 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="shimmer h-3 w-full rounded" />
        <div className="shimmer h-3 w-4/5 rounded" />
      </div>
    </div>
  );
}

export function ShimmerTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="zoho-card overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4 bg-muted/50 border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="shimmer h-4 flex-1 rounded" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b border-border last:border-0">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div key={colIndex} className="shimmer h-4 flex-1 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ShimmerStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="zoho-card p-5 space-y-3">
          <div className="shimmer h-4 w-1/2 rounded" />
          <div className="shimmer h-8 w-2/3 rounded" />
          <div className="shimmer h-3 w-1/3 rounded" />
        </div>
      ))}
    </div>
  );
}

export function ShimmerList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="zoho-card p-4">
          <div className="flex items-center gap-4">
            <div className="shimmer h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="shimmer h-4 w-1/3 rounded" />
              <div className="shimmer h-3 w-1/2 rounded" />
            </div>
            <div className="shimmer h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
