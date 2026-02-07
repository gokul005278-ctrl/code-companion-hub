import { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface DetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  className?: string;
}

export function DetailModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  onEdit,
  onDelete,
  isDeleting,
  className,
}: DetailModalProps) {
  const isMobile = useIsMobile();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'rounded-2xl',
        isMobile ? 'mx-4 max-w-[calc(100vw-32px)] left-[50%] translate-x-[-50%] overflow-x-hidden' : 'max-w-2xl mx-4 sm:mx-auto',
        className
      )}>
        <DialogHeader className="border-b border-border pb-4">
          <div className={cn(
            "flex justify-between",
            isMobile ? "flex-col gap-3" : "items-start"
          )}>
            <div className="min-w-0 flex-1">
              <DialogTitle className={cn(
                "truncate",
                isMobile ? "text-lg" : "text-xl"
              )}>
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription className="mt-1 truncate">{description}</DialogDescription>
              )}
            </div>
            <div className={cn(
              "flex items-center gap-2",
              isMobile && "justify-end"
            )}>
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  className="btn-fade gap-1.5"
                >
                  <Pencil className="h-4 w-4" />
                  {!isMobile && "Edit"}
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="btn-fade gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {!isMobile && "Delete"}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="py-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
