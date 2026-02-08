import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ShimmerStats, ShimmerList, ShimmerCard } from '@/components/ui/ShimmerLoader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SpeedometerGauge } from '@/components/ui/SpeedometerGauge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Calendar,
  Users,
  DollarSign,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Clock,
  Target,
  IndianRupee,
  ChevronRight,
  Zap,
  Receipt,
  Phone,
  Bell,
} from 'lucide-react';
import { format, addDays, isToday, isTomorrow, startOfMonth, endOfMonth, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

interface DashboardStats {
  totalBookings: number;
  totalClients: number;
  totalRevenue: number;
  pendingDeliveries: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  pendingPayments: number;
  completedTasks: number;
  totalTasks: number;
}

interface RecentBooking {
  id: string;
  event_type: string;
  event_date: string;
  status: string;
  client: { name: string } | null;
  total_amount: number;
}

interface UpcomingEvent {
  id: string;
  event_type: string;
  event_date: string;
  event_time: string | null;
  client: { name: string } | null;
  location: string | null;
}

interface UpcomingFollowUp {
  id: string;
  name: string;
  follow_up_date: string;
  phone: string | null;
  event_type: string | null;
}

interface BusinessInsight {
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info';
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    totalClients: 0,
    totalRevenue: 0,
    pendingDeliveries: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    pendingPayments: 0,
    completedTasks: 0,
    totalTasks: 0,
  });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<UpcomingFollowUp[]>([]);
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
  const [todayActions, setTodayActions] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Rotate insights every 5 seconds
  useEffect(() => {
    if (insights.length > 1) {
      const interval = setInterval(() => {
        setCurrentInsightIndex((prev) => (prev + 1) % insights.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [insights.length]);

  const fetchDashboardData = async () => {
    try {
      const startOfCurrentMonth = startOfMonth(new Date());
      const endOfCurrentMonth = endOfMonth(new Date());
      const next7Days = addDays(new Date(), 7);

      // Fetch all data in parallel
      const [
        bookingsRes,
        clientsRes,
        paymentsRes,
        expensesRes,
        upcomingRes,
        recentRes,
        tasksRes,
        followUpsRes,
        activityRes,
      ] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact' }),
        supabase.from('clients').select('*', { count: 'exact' }),
        supabase
          .from('payments')
          .select('amount, payment_date')
          .gte('payment_date', startOfCurrentMonth.toISOString().split('T')[0])
          .lte('payment_date', endOfCurrentMonth.toISOString().split('T')[0]),
        supabase
          .from('expenses')
          .select('amount, expense_date')
          .gte('expense_date', startOfCurrentMonth.toISOString().split('T')[0])
          .lte('expense_date', endOfCurrentMonth.toISOString().split('T')[0]),
        supabase
          .from('bookings')
          .select(`id, event_type, event_date, event_time, location, client:clients(name)`)
          .gte('event_date', format(new Date(), 'yyyy-MM-dd'))
          .lte('event_date', format(next7Days, 'yyyy-MM-dd'))
          .order('event_date', { ascending: true })
          .limit(5),
        supabase
          .from('bookings')
          .select(`id, event_type, event_date, status, total_amount, client:clients(name)`)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('booking_tasks').select('id, status'),
        supabase
          .from('leads')
          .select('id, name, follow_up_date, phone, event_type')
          .gte('follow_up_date', format(new Date(), 'yyyy-MM-dd'))
          .lte('follow_up_date', format(next7Days, 'yyyy-MM-dd'))
          .order('follow_up_date', { ascending: true })
          .limit(5),
        supabase
          .from('activity_log')
          .select('id, created_at')
          .gte('created_at', format(new Date(), 'yyyy-MM-dd'))
      ]);

      const bookings = bookingsRes.data || [];
      const payments = paymentsRes.data || [];
      const expenses = expensesRes.data || [];
      const tasks = tasksRes.data || [];

      const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
      const monthlyRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const monthlyExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const pendingPayments = bookings
        .filter((b) => b.payment_status === 'pending' || b.payment_status === 'partial')
        .reduce((sum, b) => sum + (Number(b.balance_amount) || 0), 0);
      const pendingDeliveries = bookings.filter((b) => b.status !== 'delivered').length;
      const completedTasks = tasks.filter((t) => t.status === 'completed').length;

      setStats({
        totalBookings: bookingsRes.count || 0,
        totalClients: clientsRes.count || 0,
        totalRevenue,
        pendingDeliveries,
        monthlyRevenue,
        monthlyExpenses,
        pendingPayments,
        completedTasks,
        totalTasks: tasks.length,
      });

      setUpcomingEvents((upcomingRes.data as UpcomingEvent[]) || []);
      setRecentBookings((recentRes.data as any) || []);
      setUpcomingFollowUps((followUpsRes.data as UpcomingFollowUp[]) || []);
      setTodayActions(activityRes.data?.length || 0);

      // Generate insights
      const generatedInsights: BusinessInsight[] = [];
      
      const netProfit = monthlyRevenue - monthlyExpenses;
      if (netProfit > 0) {
        generatedInsights.push({
          title: 'Profit Update',
          message: `You're ₹${netProfit.toLocaleString()} in profit this month! Keep it up.`,
          type: 'success',
        });
      } else if (netProfit < 0) {
        generatedInsights.push({
          title: 'Expense Alert',
          message: `Expenses exceed revenue by ₹${Math.abs(netProfit).toLocaleString()} this month.`,
          type: 'warning',
        });
      }

      if (pendingPayments > 50000) {
        generatedInsights.push({
          title: 'Payment Reminder',
          message: `₹${pendingPayments.toLocaleString()} in pending payments. Time to follow up!`,
          type: 'warning',
        });
      }

      if (pendingDeliveries > 0) {
        generatedInsights.push({
          title: 'Deliveries Pending',
          message: `${pendingDeliveries} bookings awaiting delivery. Stay on track!`,
          type: 'info',
        });
      }

      const taskCompletionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
      if (taskCompletionRate >= 80) {
        generatedInsights.push({
          title: 'Great Progress',
          message: `${taskCompletionRate.toFixed(0)}% task completion rate. Excellent work!`,
          type: 'success',
        });
      }

      if (generatedInsights.length === 0) {
        generatedInsights.push({
          title: 'Welcome',
          message: 'Your studio dashboard is ready. Add bookings to see insights.',
          type: 'info',
        });
      }

      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const productivityScore = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const statCards = [
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      icon: Calendar,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      trend: null,
    },
    {
      title: 'Active Clients',
      value: stats.totalClients,
      icon: Users,
      color: 'text-info',
      bgColor: 'bg-info/10',
      trend: null,
    },
    {
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
      trend: { value: '+12%', positive: true },
    },
    {
      title: 'Pending Deliveries',
      value: stats.pendingDeliveries,
      icon: CheckCircle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      trend: null,
    },
  ];

  const getEventDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const getEventColor = (eventType: string) => {
    const colors: Record<string, string> = {
      wedding: 'bg-primary/10 text-primary border-l-primary',
      engagement: 'bg-success/10 text-success border-l-success',
      birthday: 'bg-warning/10 text-warning border-l-warning',
      corporate: 'bg-info/10 text-info border-l-info',
      reel: 'bg-pink-500/10 text-pink-600 border-l-pink-500',
      drone: 'bg-cyan-500/10 text-cyan-600 border-l-cyan-500',
      other: 'bg-muted text-muted-foreground border-l-muted-foreground',
    };
    return colors[eventType] || colors.other;
  };

  const insightColors = {
    success: 'bg-success/10 border-success/20 text-success',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    info: 'bg-info/10 border-info/20 text-info',
  };

  return (
    <MainLayout title="Dashboard" subtitle="Welcome to your studio overview">
      {loading ? (
        <div className="space-y-6">
          <ShimmerStats />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ShimmerList count={5} />
            </div>
            <ShimmerCard />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Business Insights Banner */}
          {insights.length > 0 && (
            <div
              className={cn(
                'p-4 rounded-xl border-l-4 flex items-center gap-3 transition-all duration-500',
                insightColors[insights[currentInsightIndex].type]
              )}
            >
              <Zap className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{insights[currentInsightIndex].title}</p>
                <p className="text-sm opacity-90">{insights[currentInsightIndex].message}</p>
              </div>
              {insights.length > 1 && (
                <div className="flex gap-1">
                  {insights.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentInsightIndex(idx)}
                      className={cn(
                        'w-2 h-2 rounded-full transition-all',
                        idx === currentInsightIndex ? 'bg-current' : 'bg-current/30'
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <div key={stat.title} className="zoho-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{stat.title}</span>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                  {stat.trend && (
                    <span
                      className={`flex items-center text-sm ${
                        stat.trend.positive ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {stat.trend.positive ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                      {stat.trend.value}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Secondary Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Productivity Score - Speedometer */}
            <div className="zoho-card p-4 md:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Productivity</span>
              </div>
              <SpeedometerGauge 
                value={productivityScore} 
                size="sm"
                sublabel={`${stats.completedTasks}/${stats.totalTasks} tasks`}
              />
              {todayActions > 0 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {todayActions} actions today
                </p>
              )}
            </div>

            {/* Monthly Revenue */}
            <div className="zoho-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">This Month</span>
              </div>
              <p className="text-lg font-bold text-success">
                ₹{stats.monthlyRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Revenue collected</p>
            </div>

            {/* Monthly Expenses */}
            <div className="zoho-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">Expenses</span>
              </div>
              <p className="text-lg font-bold text-destructive">
                ₹{stats.monthlyExpenses.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">This month</p>
            </div>

            {/* Pending Payments */}
            <div className="zoho-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <IndianRupee className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Pending</span>
              </div>
              <p className="text-lg font-bold text-warning">
                ₹{stats.pendingPayments.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">To be collected</p>
            </div>
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Bookings */}
            <div className="lg:col-span-2 zoho-card">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Recent Bookings</h2>
                <button
                  onClick={() => navigate('/bookings')}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View all <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              {recentBookings.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No bookings yet"
                  description="Create your first booking to get started"
                  action={{
                    label: 'Add Booking',
                    onClick: () => navigate('/bookings?new=true'),
                  }}
                />
              ) : (
                <div className="divide-y divide-border">
                  {recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/bookings?id=${booking.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {booking.client?.name || 'Unknown Client'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {booking.event_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} •{' '}
                            {format(new Date(booking.event_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-foreground">
                            ₹{Number(booking.total_amount).toLocaleString()}
                          </span>
                          <StatusBadge status={booking.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column - Events & Follow-ups */}
            <div className="space-y-6">
              {/* Upcoming Calendar */}
              <div className="zoho-card">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Upcoming Events</h2>
                  <button
                    onClick={() => navigate('/calendar')}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Calendar <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                {upcomingEvents.length === 0 ? (
                  <div className="p-6 text-center">
                    <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">No upcoming events this week</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          'p-4 border-l-4 cursor-pointer hover:bg-accent/30 transition-colors',
                          getEventColor(event.event_type)
                        )}
                        onClick={() => navigate(`/bookings?id=${event.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {event.client?.name || 'Unknown'}
                            </p>
                            <p className="text-xs capitalize opacity-80">
                              {event.event_type.replace(/_/g, ' ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold">
                              {getEventDateLabel(event.event_date)}
                            </p>
                            {event.event_time && (
                              <p className="text-xs text-muted-foreground">{event.event_time}</p>
                            )}
                          </div>
                        </div>
                        {event.location && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            📍 {event.location}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Follow-ups */}
              <div className="zoho-card">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Bell className="h-4 w-4 text-warning" />
                    Follow-ups
                  </h2>
                  <button
                    onClick={() => navigate('/leads')}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    View all <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                {upcomingFollowUps.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">No follow-ups scheduled</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {upcomingFollowUps.map((lead) => (
                      <div
                        key={lead.id}
                        className="p-3 hover:bg-accent/30 transition-colors cursor-pointer"
                        onClick={() => navigate('/leads')}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-foreground text-sm">{lead.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {lead.event_type?.replace(/_/g, ' ') || 'General Inquiry'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-warning">
                              {getEventDateLabel(lead.follow_up_date)}
                            </p>
                            {lead.phone && (
                              <a 
                                href={`tel:${lead.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-primary flex items-center gap-1 justify-end mt-0.5"
                              >
                                <Phone className="h-3 w-3" />
                                Call
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
