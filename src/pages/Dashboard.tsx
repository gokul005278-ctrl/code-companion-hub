import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ShimmerStats, ShimmerList } from '@/components/ui/ShimmerLoader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Calendar,
  Users,
  DollarSign,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardStats {
  totalBookings: number;
  totalClients: number;
  totalRevenue: number;
  pendingDeliveries: number;
}

interface RecentBooking {
  id: string;
  event_type: string;
  event_date: string;
  status: string;
  client: { name: string } | null;
  total_amount: number;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    totalClients: 0,
    totalRevenue: 0,
    pendingDeliveries: 0,
  });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch bookings count
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      // Fetch clients count
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // Fetch total revenue
      const { data: bookings } = await supabase
        .from('bookings')
        .select('total_amount');

      const totalRevenue = bookings?.reduce(
        (sum, b) => sum + (Number(b.total_amount) || 0),
        0
      ) || 0;

      // Fetch pending deliveries
      const { count: pendingCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'delivered');

      // Fetch recent bookings
      const { data: recent } = await supabase
        .from('bookings')
        .select(`
          id,
          event_type,
          event_date,
          status,
          total_amount,
          client:clients(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalBookings: bookingsCount || 0,
        totalClients: clientsCount || 0,
        totalRevenue,
        pendingDeliveries: pendingCount || 0,
      });

      setRecentBookings((recent as any) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <MainLayout title="Dashboard" subtitle="Welcome to your studio overview">
      {loading ? (
        <div className="space-y-6">
          <ShimmerStats />
          <ShimmerList count={5} />
        </div>
      ) : (
        <div className="space-y-6">
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

          {/* Recent Bookings */}
          <div className="zoho-card">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Recent Bookings</h2>
            </div>
            {recentBookings.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No bookings yet"
                description="Create your first booking to get started"
                action={{
                  label: 'Add Booking',
                  onClick: () => window.location.href = '/bookings?new=true',
                }}
              />
            ) : (
              <div className="divide-y divide-border">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 hover:bg-accent/30 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/bookings?id=${booking.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {booking.client?.name || 'Unknown Client'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {booking.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} •{' '}
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
        </div>
      )}
    </MainLayout>
  );
}
