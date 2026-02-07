import { ReactNode, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, MoreHorizontal, FileText, Package, UserCog, FolderOpen, Link2, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, BarChart3, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SidebarCollapseProvider } from '@/hooks/useSidebarCollapse';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Failed to sign out');
    } else {
      navigate('/auth');
    }
  };

  return (
    <TooltipProvider>
      <SidebarCollapseProvider>
        <div className="flex h-screen w-full bg-background overflow-x-hidden">
          {/* Sidebar - Only shown on desktop */}
          {!isMobile && (
            <div className="flex-shrink-0">
              <AppSidebar />
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden max-w-full">
            {/* Mobile Header */}
            {isMobile ? (
              <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-2 flex-shrink-0">
                <div className="min-w-0 flex-1">
                  <h1 className="text-base font-semibold text-foreground truncate">{title}</h1>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/settings')}
                    className="h-9 w-9"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    className="h-9 w-9 text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </header>
            ) : (
              <TopBar title={title} subtitle={subtitle} />
            )}
            
            <main className={cn(
              "flex-1 overflow-auto overflow-x-hidden",
              isMobile ? "p-3 pb-24" : "p-6"
            )}>
              <div className="page-transition max-w-full">
                {children}
              </div>
            </main>

            {/* Mobile Bottom Navigation */}
            {isMobile && (
              <MobileBottomNav />
            )}
          </div>
        </div>
      </SidebarCollapseProvider>
    </TooltipProvider>
  );
}

// Mobile Bottom Navigation Component
function MobileBottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const mainNavItems = [
    { icon: LayoutDashboard, label: 'Home', href: '/dashboard' },
    { icon: Calendar, label: 'Bookings', href: '/bookings' },
    { icon: Users, label: 'Clients', href: '/clients' },
    { icon: Target, label: 'Leads', href: '/leads' },
  ];

  const moreItems = [
    { icon: FolderOpen, label: 'Media', href: '/media' },
    { icon: Link2, label: 'Selection', href: '/selection' },
    { icon: Package, label: 'Packages', href: '/packages' },
    { icon: UserCog, label: 'Team', href: '/team' },
    { icon: Receipt, label: 'Payments', href: '/invoices' },
    { icon: FileText, label: 'Expenses', href: '/expenses' },
    { icon: BarChart3, label: 'Reports', href: '/reports' },
    { icon: Calendar, label: 'Calendar', href: '/calendar' },
  ];

  const isMoreActive = moreItems.some(item => location.pathname === item.href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-full">
        {mainNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors min-w-0',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
              <span className="text-[10px] mt-1 font-medium truncate">{item.label}</span>
            </NavLink>
          );
        })}
        
        {/* More menu */}
        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors min-w-0',
                isMoreActive || moreOpen ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <MoreHorizontal className={cn('h-5 w-5 flex-shrink-0', (isMoreActive || moreOpen) && 'text-primary')} />
              <span className="text-[10px] mt-1 font-medium">More</span>
            </button>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            align="end" 
            className="w-48 p-2 mb-2 mr-2 rounded-xl"
            sideOffset={8}
          >
            <div className="grid grid-cols-3 gap-2">
              {moreItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex flex-col items-center justify-center p-2 rounded-lg transition-colors',
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[9px] mt-1 font-medium text-center leading-tight">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </nav>
  );
}
