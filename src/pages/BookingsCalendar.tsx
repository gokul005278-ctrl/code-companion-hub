import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ShimmerCard } from '@/components/ui/ShimmerLoader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Plus,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isToday,
  parseISO,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Booking {
  id: string;
  event_type: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  status: string;
  client: { name: string } | null;
}

type ViewMode = 'month' | 'week' | 'day';

export default function BookingsCalendar() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) fetchBookings();
  }, [user, currentDate, viewMode]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'month') {
        startDate = startOfWeek(startOfMonth(currentDate));
        endDate = endOfWeek(endOfMonth(currentDate));
      } else if (viewMode === 'week') {
        startDate = startOfWeek(currentDate);
        endDate = endOfWeek(currentDate);
      } else {
        startDate = currentDate;
        endDate = currentDate;
      }

      const { data } = await supabase
        .from('bookings')
        .select(`
          id,
          event_type,
          event_date,
          event_time,
          location,
          status,
          client:clients(name)
        `)
        .gte('event_date', format(startDate, 'yyyy-MM-dd'))
        .lte('event_date', format(endDate, 'yyyy-MM-dd'))
        .order('event_date', { ascending: true });

      setBookings((data as Booking[]) || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigatePrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const navigateNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getBookingsForDate = (date: Date) => {
    return bookings.filter((b) => isSameDay(parseISO(b.event_date), date));
  };

  const hasConflict = (date: Date) => {
    const dayBookings = getBookingsForDate(date);
    return dayBookings.length > 1;
  };

  const getEventColor = (eventType: string) => {
    const colors: Record<string, string> = {
      wedding: 'bg-primary/20 text-primary border-primary/40',
      engagement: 'bg-success/20 text-success border-success/40',
      birthday: 'bg-warning/20 text-warning border-warning/40',
      corporate: 'bg-info/20 text-info border-info/40',
      reel: 'bg-pink-500/20 text-pink-600 border-pink-500/40',
      drone: 'bg-cyan-500/20 text-cyan-600 border-cyan-500/40',
      other: 'bg-muted text-muted-foreground border-border',
    };
    return colors[eventType] || colors.other;
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Week view days
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const renderMonthView = () => (
    <div className="zoho-card overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-7 bg-muted/50 border-b border-border">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const dayBookings = getBookingsForDate(day);
          const conflict = hasConflict(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <div
              key={index}
              className={cn(
                'min-h-28 p-2 border-b border-r border-border cursor-pointer transition-colors',
                !isCurrentMonth && 'bg-muted/30',
                isToday(day) && 'bg-primary/5',
                isSelected && 'ring-2 ring-primary ring-inset',
                'hover:bg-accent/30'
              )}
              onClick={() => setSelectedDate(day)}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'text-sm font-medium',
                    !isCurrentMonth && 'text-muted-foreground',
                    isToday(day) &&
                      'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {conflict && (
                  <span className="text-xs bg-destructive/20 text-destructive px-1.5 rounded">
                    Conflict
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {dayBookings.slice(0, 3).map((booking) => (
                  <div
                    key={booking.id}
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded truncate border-l-2',
                      getEventColor(booking.event_type)
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/bookings?id=${booking.id}`);
                    }}
                  >
                    {booking.client?.name || 'Unknown'}
                  </div>
                ))}
                {dayBookings.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{dayBookings.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderWeekView = () => (
    <div className="zoho-card overflow-hidden">
      <div className="grid grid-cols-7">
        {weekDays.map((day, index) => {
          const dayBookings = getBookingsForDate(day);

          return (
            <div
              key={index}
              className={cn(
                'min-h-[400px] border-r border-border last:border-r-0',
                isToday(day) && 'bg-primary/5'
              )}
            >
              <div
                className={cn(
                  'p-3 border-b border-border text-center',
                  isToday(day) && 'bg-primary text-primary-foreground'
                )}
              >
                <p className="text-xs text-muted-foreground">{format(day, 'EEE')}</p>
                <p className="text-lg font-semibold">{format(day, 'd')}</p>
              </div>
              <div className="p-2 space-y-2">
                {dayBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className={cn(
                      'p-2 rounded-lg border cursor-pointer transition-shadow hover:shadow-md',
                      getEventColor(booking.event_type)
                    )}
                    onClick={() => navigate(`/bookings?id=${booking.id}`)}
                  >
                    <p className="font-medium text-sm truncate">
                      {booking.client?.name || 'Unknown'}
                    </p>
                    <p className="text-xs opacity-80 capitalize">
                      {booking.event_type.replace(/_/g, ' ')}
                    </p>
                    {booking.event_time && (
                      <p className="text-xs opacity-70 flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {booking.event_time}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDayView = () => {
    const dayBookings = getBookingsForDate(currentDate);

    return (
      <div className="zoho-card p-6">
        <h3 className="text-lg font-semibold mb-4">{format(currentDate, 'EEEE, MMMM d, yyyy')}</h3>
        {dayBookings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No bookings for this day</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dayBookings.map((booking) => (
              <div
                key={booking.id}
                className="p-4 rounded-lg border border-border hover:shadow-md cursor-pointer transition-shadow"
                onClick={() => navigate(`/bookings?id=${booking.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{booking.client?.name || 'Unknown Client'}</h4>
                      <StatusBadge status={booking.status} />
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">
                      {booking.event_type.replace(/_/g, ' ')} Event
                    </p>
                  </div>
                  <div className={cn('px-3 py-1 rounded-lg text-sm', getEventColor(booking.event_type))}>
                    {booking.event_type}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  {booking.event_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {booking.event_time}
                    </span>
                  )}
                  {booking.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {booking.location}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <MainLayout title="Calendar" subtitle="View and manage your booking schedule">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-4">
            {viewMode === 'day'
              ? format(currentDate, 'MMMM d, yyyy')
              : format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors capitalize',
                  viewMode === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          <Button onClick={() => navigate('/bookings?new=true')} className="btn-fade">
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Calendar */}
      {loading ? (
        <ShimmerCard className="min-h-[500px]" />
      ) : viewMode === 'month' ? (
        renderMonthView()
      ) : viewMode === 'week' ? (
        renderWeekView()
      ) : (
        renderDayView()
      )}

      {/* Selected Date Sidebar */}
      {selectedDate && viewMode === 'month' && (
        <div className="fixed bottom-4 right-4 w-80 zoho-card p-4 shadow-lg max-h-80 overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">{format(selectedDate, 'MMMM d, yyyy')}</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate(null)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
          {getBookingsForDate(selectedDate).length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings</p>
          ) : (
            <div className="space-y-2">
              {getBookingsForDate(selectedDate).map((booking) => (
                <div
                  key={booking.id}
                  className="p-2 rounded border border-border cursor-pointer hover:bg-accent/30"
                  onClick={() => navigate(`/bookings?id=${booking.id}`)}
                >
                  <p className="font-medium text-sm">{booking.client?.name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {booking.event_type.replace(/_/g, ' ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
}
