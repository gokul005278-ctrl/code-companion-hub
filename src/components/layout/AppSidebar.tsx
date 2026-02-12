import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Package,
  UserCog,
  FolderOpen,
  Link2,
  FileText,
  BarChart3,
  Settings,
  Camera,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Target,
  Receipt,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSidebarCollapse } from '@/hooks/useSidebarCollapse';
import { useRef, useEffect } from 'react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Bookings', href: '/bookings', icon: Calendar },
  { title: 'Calendar', href: '/calendar', icon: Calendar },
  { title: 'Clients', href: '/clients', icon: Users },
  { title: 'Leads', href: '/leads', icon: Target },
  { title: 'Packages', href: '/packages', icon: Package },
  { title: 'Team', href: '/team', icon: UserCog },
  { title: 'Media', href: '/media', icon: FolderOpen },
  { title: 'Client Selection', href: '/selection', icon: Link2 },
];

const secondaryNavItems: NavItem[] = [
  { title: 'Payments', href: '/invoices', icon: FileText },
  { title: 'Expenses', href: '/expenses', icon: Receipt },
  { title: 'Reports', href: '/reports', icon: BarChart3 },
  { title: 'Settings', href: '/settings', icon: Settings },
  { title: 'Help & Support', href: '/help', icon: HelpCircle },
];

export function AppSidebar() {
  const { collapsed, setCollapsed } = useSidebarCollapse();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const navRef = useRef<HTMLElement>(null);
  const scrollPosRef = useRef(0);

  // Save scroll position before navigation
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    // Restore saved position after route change
    nav.scrollTop = scrollPosRef.current;
  }, [location.pathname]);

  const handleNavClick = () => {
    if (navRef.current) {
      scrollPosRef.current = navRef.current.scrollTop;
    }
  };

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;

    const linkContent = (
      <NavLink
        to={item.href}
        onClick={handleNavClick}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
          'hover:bg-sidebar-accent text-sidebar-foreground',
          isActive && 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary',
          collapsed && 'justify-center px-2'
        )}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-current')} />
        {!collapsed && (
          <span className="text-sm font-medium truncate">{item.title}</span>
        )}
        {!collapsed && item.badge && (
          <span className="ml-auto text-xs bg-sidebar-primary text-sidebar-primary-foreground px-2 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'h-16 border-b border-sidebar-border flex items-center px-4',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="p-2 rounded-lg bg-sidebar-primary/10">
          <Camera className="h-5 w-5 text-sidebar-primary" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-white truncate">Studio Manager</h1>
            <p className="text-xs text-sidebar-muted truncate">Photography SaaS</p>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav ref={navRef} className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavItemComponent key={item.href} item={item} />
          ))}
        </div>

        <div className="my-4 border-t border-sidebar-border" />

        <div className="space-y-1">
          {secondaryNavItems.map((item) => (
            <NavItemComponent key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* User & Collapse */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {!collapsed && user && (
          <div className="px-3 py-2 rounded-lg bg-sidebar-accent/50">
            <p className="text-xs text-sidebar-muted truncate">Signed in as</p>
            <p className="text-sm text-white truncate">{user.email}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className={cn(
                  'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white',
                  collapsed ? 'w-full justify-center' : ''
                )}
              >
                <LogOut className="h-4 w-4" />
                {!collapsed && <span className="ml-2">Sign out</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Sign out</TooltipContent>
            )}
          </Tooltip>

          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              className="ml-auto text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className="w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </aside>
  );
}
