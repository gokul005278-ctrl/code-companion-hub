import { useState, useEffect, useRef } from 'react';
import { Bell, Search, Plus, ChevronDown, HelpCircle, X, User, Calendar, Package, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

interface SearchResult {
  id: string;
  type: 'booking' | 'client' | 'package' | 'team';
  title: string;
  subtitle: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  time: Date;
  read: boolean;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Only fetch notifications once on mount, not on every page switch
  useEffect(() => {
    if (user && notifications.length === 0) {
      fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery.length >= 2) {
        handleSearch();
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const fetchNotifications = async () => {
    try {
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id, event_date, event_type, status,
          client:clients(name)
        `)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(10);

      const notifs: Notification[] = [];

      if (bookings) {
        bookings.forEach((booking) => {
          const eventDate = new Date(booking.event_date);
          if (isToday(eventDate)) {
            notifs.push({
              id: `booking-today-${booking.id}`,
              title: 'Event Today',
              message: `${booking.client?.name || 'Client'} - ${booking.event_type}`,
              type: 'warning',
              time: eventDate,
              read: false,
            });
          } else if (isTomorrow(eventDate)) {
            notifs.push({
              id: `booking-tomorrow-${booking.id}`,
              title: 'Event Tomorrow',
              message: `${booking.client?.name || 'Client'} - ${booking.event_type}`,
              type: 'info',
              time: eventDate,
              read: false,
            });
          }
        });

        const pendingPayments = bookings.filter((b) => b.status === 'advance_paid' || b.status === 'confirmed');
        if (pendingPayments.length > 0) {
          notifs.push({
            id: 'pending-payments',
            title: 'Pending Payments',
            message: `${pendingPayments.length} bookings have pending payments`,
            type: 'warning',
            time: new Date(),
            read: false,
          });
        }
      }

      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results: SearchResult[] = [];
      const query = searchQuery.toLowerCase();

      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, email, phone')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(5);

      if (clients) {
        clients.forEach((client) => {
          results.push({
            id: client.id,
            type: 'client',
            title: client.name,
            subtitle: client.email || client.phone || 'Client',
          });
        });
      }

      const { data: bookings } = await supabase
        .from('bookings')
        .select(`id, event_type, event_date, location, client:clients(name)`)
        .or(`location.ilike.%${query}%,event_type.ilike.%${query}%`)
        .limit(5);

      if (bookings) {
        bookings.forEach((booking) => {
          results.push({
            id: booking.id,
            type: 'booking',
            title: booking.client?.name || 'Walk-in Client',
            subtitle: `${booking.event_type} - ${format(new Date(booking.event_date), 'MMM dd, yyyy')}`,
          });
        });
      }

      const { data: packages } = await supabase
        .from('packages')
        .select('id, name, base_price')
        .ilike('name', `%${query}%`)
        .limit(3);

      if (packages) {
        packages.forEach((pkg) => {
          results.push({
            id: pkg.id,
            type: 'package',
            title: pkg.name,
            subtitle: `Rs. ${pkg.base_price.toLocaleString()}`,
          });
        });
      }

      const { data: team } = await supabase
        .from('team_members')
        .select('id, name, member_type')
        .or(`name.ilike.%${query}%,member_type.ilike.%${query}%`)
        .limit(3);

      if (team) {
        team.forEach((member) => {
          results.push({
            id: member.id,
            type: 'team',
            title: member.name,
            subtitle: member.member_type.replace(/_/g, ' '),
          });
        });
      }

      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setShowSearchResults(false);
    setSearchQuery('');
    
    switch (result.type) {
      case 'client':
        navigate(`/clients?id=${result.id}`);
        break;
      case 'booking':
        navigate(`/bookings?id=${result.id}`);
        break;
      case 'package':
        navigate(`/packages?id=${result.id}`);
        break;
      case 'team':
        navigate(`/team?id=${result.id}`);
        break;
    }
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'client': return User;
      case 'booking': return Calendar;
      case 'package': return Package;
      case 'team': return Users;
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6">
      <div className="min-w-0 flex-shrink">
        <h1 className="text-base md:text-lg font-semibold text-foreground truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Search - prevent autofill */}
        <div ref={searchRef} className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
            className="pl-9 w-48 md:w-64 h-9 bg-secondary border-0"
            autoComplete="off"
            name="global-search-field"
            data-form-type="other"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowSearchResults(false);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-muted-foreground">
                  <div className="shimmer h-4 w-24 mx-auto rounded" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No results found for "{searchQuery}"
                </div>
              ) : (
                <div className="py-2">
                  {searchResults.map((result) => {
                    const Icon = getResultIcon(result.type);
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full px-4 py-2 flex items-center gap-3 hover:bg-accent transition-colors text-left"
                      >
                        <div className="p-1.5 rounded bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">{result.type}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Create */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="btn-fade gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/bookings?new=true')}>
              New Booking
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/clients?new=true')}>
              New Client
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/packages?new=true')}>
              New Package
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/team?new=true')}>
              New Team Member
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/selection?new=true')}>
              Create Selection Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h4 className="font-semibold text-sm">Notifications</h4>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                  Mark all read
                </Button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No notifications
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={cn(
                      'p-3 border-b border-border last:border-0 hover:bg-accent transition-colors',
                      !notif.read && 'bg-primary/5'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full mt-1.5 flex-shrink-0',
                          notif.type === 'warning' && 'bg-warning',
                          notif.type === 'success' && 'bg-success',
                          notif.type === 'info' && 'bg-info'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{notif.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(notif.time, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Help */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Help & Support</h4>
              <div className="space-y-2 text-sm">
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">📖 Documentation</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">💬 Contact Support</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">🎥 Video Tutorials</a>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">Studio Manager v1.0.0</p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
