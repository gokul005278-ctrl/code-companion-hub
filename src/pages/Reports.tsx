import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ShimmerStats, ShimmerCard } from '@/components/ui/ShimmerLoader';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Target,
  Percent,
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  Receipt,
  CreditCard,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
  ComposedChart,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, differenceInDays, startOfWeek, endOfWeek, eachWeekOfInterval, parseISO } from 'date-fns';

interface ReportStats {
  totalRevenue: number;
  totalBookings: number;
  avgBookingValue: number;
  totalClients: number;
  pendingPayments: number;
  paidPayments: number;
  partialPayments: number;
  deliveredBookings: number;
  conversionRate: number;
  avgTurnaroundDays: number;
  totalExpenses: number;
  netProfit: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  bookings: number;
  newClients: number;
  profit: number;
}

interface ExpenseCategoryData {
  name: string;
  value: number;
  color: string;
}

interface PaymentStatusData {
  status: string;
  count: number;
  amount: number;
  color: string;
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('6months');
  const [stats, setStats] = useState<ReportStats>({
    totalRevenue: 0,
    totalBookings: 0,
    avgBookingValue: 0,
    totalClients: 0,
    pendingPayments: 0,
    paidPayments: 0,
    partialPayments: 0,
    deliveredBookings: 0,
    conversionRate: 0,
    avgTurnaroundDays: 0,
    totalExpenses: 0,
    netProfit: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [eventTypeData, setEventTypeData] = useState<{ name: string; value: number; revenue: number; color: string }[]>([]);
  const [statusData, setStatusData] = useState<{ status: string; count: number; color: string }[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<{ name: string; type: string; bookings: number }[]>([]);
  const [expenseCategoryData, setExpenseCategoryData] = useState<ExpenseCategoryData[]>([]);
  const [paymentStatusData, setPaymentStatusData] = useState<PaymentStatusData[]>([]);
  const [packageData, setPackageData] = useState<{ name: string; bookings: number; revenue: number }[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchReportData();
  }, [user, dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const monthsAgo = dateRange === '12months' ? 12 : dateRange === '3months' ? 3 : 6;
      const startDate = startOfMonth(subMonths(new Date(), monthsAgo - 1));
      const endDate = endOfMonth(new Date());

      // Fetch all data in parallel
      const [bookingsRes, clientsRes, packagesRes, paymentsRes, teamRes, expensesRes] = await Promise.all([
        supabase.from('bookings').select('*').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString()),
        supabase.from('clients').select('*', { count: 'exact' }).gte('created_at', startDate.toISOString()),
        supabase.from('packages').select('id, name'),
        supabase.from('payments').select('*').gte('created_at', startDate.toISOString()),
        supabase.from('booking_team').select('*, team_member:team_members(name, member_type)'),
        supabase.from('expenses').select('*').gte('expense_date', startDate.toISOString().split('T')[0]),
      ]);

      const bookings = bookingsRes.data || [];
      const clients = clientsRes.data || [];
      const clientsCount = clientsRes.count || 0;
      const packages = packagesRes.data || [];
      const payments = paymentsRes.data || [];
      const teamAssignments = teamRes.data || [];
      const expenses = expensesRes.data || [];

      // Calculate stats
      const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const pendingPayments = bookings.filter(b => b.payment_status === 'pending').reduce((sum, b) => sum + (Number(b.balance_amount) || 0), 0);
      const paidPayments = bookings.filter(b => b.payment_status === 'paid').length;
      const partialPayments = bookings.filter(b => b.payment_status === 'partial').length;
      const deliveredBookings = bookings.filter((b) => b.status === 'delivered').length;
      const confirmedOrMore = bookings.filter((b) => b.status !== 'inquiry').length;
      const conversionRate = bookings.length > 0 ? (confirmedOrMore / bookings.length) * 100 : 0;

      // Calculate average turnaround
      const completedBookings = bookings.filter((b) => b.status === 'delivered');
      let totalDays = 0;
      completedBookings.forEach((b) => {
        const eventDate = new Date(b.event_date);
        const updatedAt = new Date(b.updated_at);
        totalDays += Math.max(0, differenceInDays(updatedAt, eventDate));
      });
      const avgTurnaroundDays = completedBookings.length > 0 ? Math.round(totalDays / completedBookings.length) : 0;

      setStats({
        totalRevenue,
        totalBookings: bookings.length,
        avgBookingValue: bookings.length > 0 ? totalRevenue / bookings.length : 0,
        totalClients: clientsCount,
        pendingPayments,
        paidPayments,
        partialPayments,
        deliveredBookings,
        conversionRate,
        avgTurnaroundDays,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
      });

      // Calculate monthly data with expenses
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      const monthlyStats = months.map((month) => {
        const monthPayments = payments.filter((p) => {
          const paymentDate = new Date(p.payment_date);
          return paymentDate.getMonth() === month.getMonth() && paymentDate.getFullYear() === month.getFullYear();
        });

        const monthExpenses = expenses.filter((e) => {
          const expenseDate = new Date(e.expense_date);
          return expenseDate.getMonth() === month.getMonth() && expenseDate.getFullYear() === month.getFullYear();
        });

        const monthBookings = bookings.filter((b) => {
          const bookingDate = new Date(b.created_at);
          return bookingDate.getMonth() === month.getMonth() && bookingDate.getFullYear() === month.getFullYear();
        });

        const monthClients = clients.filter((c) => {
          const clientDate = new Date(c.created_at);
          return clientDate.getMonth() === month.getMonth() && clientDate.getFullYear() === month.getFullYear();
        });

        const revenue = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const expenseTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

        return {
          month: format(month, 'MMM'),
          revenue,
          expenses: expenseTotal,
          bookings: monthBookings.length,
          newClients: monthClients.length,
          profit: revenue - expenseTotal,
        };
      });
      setMonthlyData(monthlyStats);

      // Expense category breakdown
      const expenseCategories: Record<string, number> = {};
      const categoryColors: Record<string, string> = {
        equipment: '#3B82F6',
        travel: '#10B981',
        software: '#8B5CF6',
        marketing: '#EC4899',
        rent: '#F59E0B',
        utilities: '#6366F1',
        salaries: '#EF4444',
        supplies: '#14B8A6',
        maintenance: '#F97316',
        insurance: '#06B6D4',
        other: '#6B7280',
      };

      expenses.forEach((e) => {
        expenseCategories[e.category] = (expenseCategories[e.category] || 0) + Number(e.amount);
      });

      const expenseCatData = Object.entries(expenseCategories)
        .map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: categoryColors[name] || '#6B7280',
        }))
        .sort((a, b) => b.value - a.value);
      setExpenseCategoryData(expenseCatData);

      // Payment status breakdown
      const paymentStatuses: Record<string, { count: number; amount: number }> = {
        pending: { count: 0, amount: 0 },
        partial: { count: 0, amount: 0 },
        paid: { count: 0, amount: 0 },
      };

      bookings.forEach((b) => {
        const status = b.payment_status || 'pending';
        if (paymentStatuses[status]) {
          paymentStatuses[status].count += 1;
          paymentStatuses[status].amount += Number(b.total_amount) || 0;
        }
      });

      const paymentStatusColors: Record<string, string> = {
        pending: '#EF4444',
        partial: '#F59E0B',
        paid: '#10B981',
      };

      setPaymentStatusData(
        Object.entries(paymentStatuses).map(([status, data]) => ({
          status: status.charAt(0).toUpperCase() + status.slice(1),
          count: data.count,
          amount: data.amount,
          color: paymentStatusColors[status],
        }))
      );

      // Event type distribution
      const eventCounts: Record<string, { count: number; revenue: number }> = {};
      const eventColors: Record<string, string> = {
        wedding: '#0066FF',
        engagement: '#00C853',
        birthday: '#FF9800',
        corporate: '#9C27B0',
        reel: '#E91E63',
        drone: '#00BCD4',
        other: '#607D8B',
      };

      bookings.forEach((b) => {
        if (!eventCounts[b.event_type]) {
          eventCounts[b.event_type] = { count: 0, revenue: 0 };
        }
        eventCounts[b.event_type].count += 1;
        eventCounts[b.event_type].revenue += Number(b.total_amount) || 0;
      });

      setEventTypeData(
        Object.entries(eventCounts).map(([name, data]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value: data.count,
          revenue: data.revenue,
          color: eventColors[name] || '#607D8B',
        }))
      );

      // Booking status distribution
      const statusCounts: Record<string, number> = {};
      const statusColors: Record<string, string> = {
        inquiry: '#9CA3AF',
        confirmed: '#0066FF',
        advance_paid: '#F59E0B',
        shoot_completed: '#8B5CF6',
        delivered: '#10B981',
      };

      bookings.forEach((b) => {
        statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
      });

      setStatusData(
        Object.entries(statusCounts).map(([status, count]) => ({
          status: status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          count,
          color: statusColors[status] || '#607D8B',
        }))
      );

      // Package performance
      const packageStats = packages
        .map((pkg) => {
          const pkgBookings = bookings.filter((b) => b.package_id === pkg.id);
          return {
            name: pkg.name,
            bookings: pkgBookings.length,
            revenue: pkgBookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0),
          };
        })
        .filter((p) => p.bookings > 0)
        .sort((a, b) => b.revenue - a.revenue);
      setPackageData(packageStats);

      // Team performance
      const teamStats: Record<string, { name: string; type: string; count: number }> = {};
      teamAssignments.forEach((assignment) => {
        const member = assignment.team_member as any;
        if (member) {
          if (!teamStats[member.name]) {
            teamStats[member.name] = {
              name: member.name,
              type: member.member_type.replace(/_/g, ' '),
              count: 0,
            };
          }
          teamStats[member.name].count += 1;
        }
      });

      setTeamPerformance(
        Object.values(teamStats)
          .map((t) => ({ name: t.name, type: t.type, bookings: t.count }))
          .sort((a, b) => b.bookings - a.bookings)
          .slice(0, 10)
      );
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Revenue', value: `Rs. ${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-success', bgColor: 'bg-success/10', change: '+12%', positive: true },
    { title: 'Net Profit', value: `Rs. ${stats.netProfit.toLocaleString()}`, icon: TrendingUp, color: stats.netProfit >= 0 ? 'text-success' : 'text-destructive', bgColor: stats.netProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10', change: stats.netProfit >= 0 ? '+8%' : '-5%', positive: stats.netProfit >= 0 },
    { title: 'Total Expenses', value: `Rs. ${stats.totalExpenses.toLocaleString()}`, icon: Receipt, color: 'text-destructive', bgColor: 'bg-destructive/10', change: '-3%', positive: false },
    { title: 'Total Bookings', value: stats.totalBookings, icon: Calendar, color: 'text-primary', bgColor: 'bg-primary/10', change: '+8%', positive: true },
    { title: 'Pending Payments', value: `Rs. ${stats.pendingPayments.toLocaleString()}`, icon: AlertCircle, color: 'text-destructive', bgColor: 'bg-destructive/10', change: '-3%', positive: false },
    { title: 'Conversion Rate', value: `${stats.conversionRate.toFixed(1)}%`, icon: Percent, color: 'text-success', bgColor: 'bg-success/10', change: '+2%', positive: true },
    { title: 'Delivered', value: stats.deliveredBookings, icon: CheckCircle, color: 'text-success', bgColor: 'bg-success/10', change: '+20%', positive: true },
    { title: 'Avg. Turnaround', value: `${stats.avgTurnaroundDays} days`, icon: Clock, color: 'text-muted-foreground', bgColor: 'bg-muted', change: '-5%', positive: true },
  ];

  return (
    <MainLayout title="Reports & Analytics" subtitle="In-depth business insights and performance metrics">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="12months">Last 12 Months</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="btn-fade">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {loading ? (
        <div className="space-y-6">
          <ShimmerStats />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ShimmerCard />
            <ShimmerCard />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {statCards.map((stat) => (
              <div key={stat.title} className="zoho-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  </div>
                  <span className={`text-[10px] flex items-center ${stat.positive ? 'text-success' : 'text-destructive'}`}>
                    {stat.positive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                    {stat.change}
                  </span>
                </div>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.title}</p>
              </div>
            ))}
          </div>

          {/* Revenue, Expenses & Profit Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="zoho-card p-6">
              <h3 className="text-lg font-semibold mb-4">Revenue vs Expenses</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [`Rs. ${value.toLocaleString()}`, name]}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Expenses" />
                    <Line type="monotone" dataKey="profit" stroke="hsl(var(--primary))" strokeWidth={2} name="Net Profit" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense Categories */}
            <div className="zoho-card p-6">
              <h3 className="text-lg font-semibold mb-4">Expense Breakdown</h3>
              {expenseCategoryData.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-muted-foreground">
                  No expense data available
                </div>
              ) : (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseCategoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {expenseCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, 'Amount']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {expenseCategoryData.slice(0, 6).map((cat) => (
                      <div key={cat.name} className="flex items-center gap-1.5 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span>{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment Status & Event Types */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Status */}
            <div className="zoho-card p-6">
              <h3 className="text-lg font-semibold mb-4">Payment Status</h3>
              <div className="space-y-4">
                {paymentStatusData.map((item) => (
                  <div key={item.status} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm font-medium">{item.status}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{item.count} bookings</p>
                        <p className="text-xs text-muted-foreground">Rs. {item.amount.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${stats.totalBookings > 0 ? (item.count / stats.totalBookings) * 100 : 0}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Event Types */}
            <div className="zoho-card p-6">
              <h3 className="text-lg font-semibold mb-4">Event Type Distribution</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={eventTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {eventTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string, props: any) => [
                        `${value} bookings (Rs. ${props.payload.revenue.toLocaleString()})`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {eventTypeData.map((event) => (
                  <div key={event.name} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: event.color }} />
                    <span>{event.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Booking Pipeline */}
            <div className="zoho-card p-6">
              <h3 className="text-lg font-semibold mb-4">Booking Pipeline</h3>
              <div className="space-y-3">
                {statusData.map((status) => (
                  <div key={status.status} className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{status.status}</span>
                        <span className="text-sm font-semibold">{status.count}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${stats.totalBookings > 0 ? (status.count / stats.totalBookings) * 100 : 0}%`,
                            backgroundColor: status.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Package & Team Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="zoho-card p-6">
              <h3 className="text-lg font-semibold mb-4">Package Performance</h3>
              {packageData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No package data available
                </div>
              ) : (
                <div className="space-y-4">
                  {packageData.slice(0, 5).map((pkg, index) => (
                    <div key={pkg.name} className="flex items-center gap-4">
                      <span className="text-sm font-medium text-muted-foreground w-6">#{index + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">{pkg.name}</p>
                          <p className="text-sm text-muted-foreground">{pkg.bookings} bookings</p>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(pkg.revenue / (packageData[0]?.revenue || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-success min-w-24 text-right">
                        Rs. {pkg.revenue.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="zoho-card p-6">
              <h3 className="text-lg font-semibold mb-4">Team Performance</h3>
              {teamPerformance.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No team assignment data available
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string, props: any) => [`${value} bookings`, props.payload.type]}
                      />
                      <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
