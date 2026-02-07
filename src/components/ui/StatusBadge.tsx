import { cn } from '@/lib/utils';

type BookingStatus = 'inquiry' | 'confirmed' | 'advance_paid' | 'shoot_completed' | 'delivered';
type PaymentStatus = 'pending' | 'partial' | 'paid';
type TaskStatus = 'pending' | 'in_progress' | 'completed';

interface StatusBadgeProps {
  status: BookingStatus | PaymentStatus | TaskStatus | string;
  className?: string;
  customLabels?: Record<string, string>;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Booking statuses
  inquiry: { label: 'Inquiry', className: 'bg-info/10 text-info border-info/20' },
  confirmed: { label: 'Confirmed', className: 'bg-primary/10 text-primary border-primary/20' },
  advance_paid: { label: 'Advance Paid', className: 'bg-warning/10 text-warning border-warning/20' },
  shoot_completed: { label: 'Shoot Done', className: 'bg-success/10 text-success border-success/20' },
  delivered: { label: 'Delivered', className: 'bg-muted text-muted-foreground border-border' },
  
  // Payment statuses
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning border-warning/20' },
  partial: { label: 'Partial', className: 'bg-info/10 text-info border-info/20' },
  paid: { label: 'Paid', className: 'bg-success/10 text-success border-success/20' },
  
  // Task statuses
  in_progress: { label: 'In Progress', className: 'bg-primary/10 text-primary border-primary/20' },
  completed: { label: 'Completed', className: 'bg-success/10 text-success border-success/20' },
  
  // Access statuses
  active: { label: 'Active', className: 'bg-success/10 text-success border-success/20' },
  inactive: { label: 'Inactive', className: 'bg-muted text-muted-foreground border-border' },
  expired: { label: 'Expired', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  
  // Payment types
  advance: { label: 'Advance', className: 'bg-info/10 text-info border-info/20' },
  final: { label: 'Final', className: 'bg-success/10 text-success border-success/20' },
  refund: { label: 'Refund', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export function StatusBadge({ status, className, customLabels }: StatusBadgeProps) {
  const config = statusConfig[status] || { 
    label: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
    className: 'bg-muted text-muted-foreground border-border' 
  };

  const displayLabel = customLabels?.[status] || config.label;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {displayLabel}
    </span>
  );
}
