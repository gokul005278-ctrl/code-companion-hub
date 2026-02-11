import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ShimmerList } from '@/components/ui/ShimmerLoader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Calendar, Plus, Search, Filter, Loader2, Users, UserCheck, AlertCircle, ArrowLeft, Download, CheckCircle, Camera, Video, Edit3, BookOpen, Check, Trash2, Clock, FileText, IndianRupee, Package as PackageIcon } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { Database } from '@/integrations/supabase/types';
import { Progress } from '@/components/ui/progress';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Booking = Database['public']['Tables']['bookings']['Row'] & {
  client: { name: string; email?: string | null; phone?: string | null } | null;
  package: { name: string } | null;
};

type TeamMember = Database['public']['Tables']['team_members']['Row'] & {
  assignedBookingsCount?: number;
  isAssigned?: boolean;
  hasConflict?: boolean;
};

type BookingTeam = {
  id: string;
  team_member_id: string;
  team_member: { name: string; member_type: string } | null;
};

type BookingTask = {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  status: string;
  progress: number | null;
  scheduled_date: string | null;
  notes: string | null;
};

type BookingExpense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
};

type PackageAddon = {
  id: string;
  name: string;
  default_price: number | null;
};

type BookingAddon = {
  id: string;
  addon_id: string;
  custom_price: number | null;
  addon: { name: string; default_price: number | null } | null;
};

type EventType = Database['public']['Enums']['event_type'];
type BookingStatus = Database['public']['Enums']['booking_status'];

const eventTypes: { value: EventType; label: string }[] = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'reel', label: 'Reel' },
  { value: 'drone', label: 'Drone' },
  { value: 'other', label: 'Other' },
];

const bookingStatuses: { value: BookingStatus; label: string }[] = [
  { value: 'inquiry', label: 'Inquiry' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'advance_paid', label: 'Advance Paid' },
  { value: 'shoot_completed', label: 'Shoot Completed' },
  { value: 'delivered', label: 'Delivered' },
];

const taskTypes = [
  { value: 'pre_shoot', label: 'Pre-Shoot', icon: Camera, color: 'bg-blue-500' },
  { value: 'main_shoot', label: 'Main Shoot', icon: Video, color: 'bg-orange-500' },
  { value: 'editing', label: 'Editing', icon: Edit3, color: 'bg-purple-500' },
  { value: 'album_processing', label: 'Album', icon: BookOpen, color: 'bg-pink-500' },
  { value: 'delivery', label: 'Delivery', icon: Check, color: 'bg-emerald-500' },
];

const expenseCategories = [
  { value: 'equipment', label: 'Equipment' },
  { value: 'travel', label: 'Travel' },
  { value: 'software', label: 'Software' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'other', label: 'Other' },
];

export default function Bookings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [packages, setPackages] = useState<{ id: string; name: string; base_price: number }[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [allBookingTeams, setAllBookingTeams] = useState<{ booking_id: string; team_member_id: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [bookingTeamMembers, setBookingTeamMembers] = useState<BookingTeam[]>([]);
  const [bookingTasks, setBookingTasks] = useState<BookingTask[]>([]);
  const [bookingExpenses, setBookingExpenses] = useState<BookingExpense[]>([]);
  const [bookingAddons, setBookingAddons] = useState<BookingAddon[]>([]);
  const [availableAddons, setAvailableAddons] = useState<PackageAddon[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showDetailPage, setShowDetailPage] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [profile, setProfile] = useState<{ studio_name: string | null; full_name: string | null; phone: string | null } | null>(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    client_id: '',
    package_id: '',
    event_type: 'wedding' as EventType,
    event_date: '',
    event_time: '',
    location: '',
    venue_details: '',
    status: 'inquiry' as BookingStatus,
    total_amount: 0,
    advance_amount: 0,
    notes: '',
  });

  const [taskFormData, setTaskFormData] = useState({
    title: '',
    task_type: 'pre_shoot',
    scheduled_date: '',
  });

  const [expenseFormData, setExpenseFormData] = useState({
    description: '',
    amount: 0,
    category: 'other',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    vendor: '',
    payment_method: '',
  });

  const [addonFormData, setAddonFormData] = useState({
    addon_id: '',
    custom_price: '',
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsFormOpen(true);
      setEditMode(false);
      resetForm();
      setSearchParams({});
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const [bookingsRes, clientsRes, packagesRes, teamRes, bookingTeamsRes, profileRes] = await Promise.all([
        supabase.from('bookings').select(`*, client:clients(name, email, phone), package:packages(name)`).order('event_date', { ascending: true }),
        supabase.from('clients').select('id, name'),
        supabase.from('packages').select('id, name, base_price').eq('is_active', true),
        supabase.from('team_members').select('*').eq('is_available', true),
        supabase.from('booking_team').select('booking_id, team_member_id'),
        supabase.from('profiles').select('studio_name, full_name, phone').single(),
      ]);

      if (bookingsRes.data) setBookings(bookingsRes.data as Booking[]);
      if (clientsRes.data) setClients(clientsRes.data);
      if (packagesRes.data) setPackages(packagesRes.data);
      if (teamRes.data) setTeamMembers(teamRes.data);
      if (bookingTeamsRes.data) setAllBookingTeams(bookingTeamsRes.data);
      if (profileRes.data) setProfile(profileRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingTeam = async (bookingId: string) => {
    const { data } = await supabase.from('booking_team').select(`id, team_member_id, team_member:team_members(name, member_type)`).eq('booking_id', bookingId);
    if (data) {
      setBookingTeamMembers(data as BookingTeam[]);
      setSelectedTeamIds(data.map((bt) => bt.team_member_id));
    }
  };

  const fetchBookingTasks = async (bookingId: string) => {
    const { data } = await supabase.from('booking_tasks').select('*').eq('booking_id', bookingId).order('scheduled_date', { ascending: true });
    setBookingTasks(data || []);
  };

  const fetchBookingExpenses = async (bookingId: string) => {
    const { data } = await supabase.from('expenses').select('id, description, amount, category, expense_date').eq('booking_id', bookingId).order('expense_date', { ascending: false });
    setBookingExpenses(data || []);
  };

  const fetchBookingAddons = async (bookingId: string) => {
    const { data } = await supabase.from('booking_addons').select('id, addon_id, custom_price, addon:package_addons(name, default_price)').eq('booking_id', bookingId);
    setBookingAddons((data as BookingAddon[]) || []);
  };

  const fetchAvailableAddons = async () => {
    const { data } = await supabase.from('package_addons').select('id, name, default_price').eq('is_active', true);
    setAvailableAddons(data || []);
  };

  const getTeamMembersWithStatus = () => {
    if (!selectedBooking) return teamMembers;
    const eventDate = parseISO(selectedBooking.event_date);
    return teamMembers.map((member) => {
      const assignedBookingsCount = allBookingTeams.filter((bt) => bt.team_member_id === member.id).length;
      const isAssigned = selectedTeamIds.includes(member.id);
      const conflictingBookingIds = allBookingTeams.filter((bt) => bt.team_member_id === member.id && bt.booking_id !== selectedBooking.id).map((bt) => bt.booking_id);
      const hasConflict = bookings.some((b) => conflictingBookingIds.includes(b.id) && isSameDay(parseISO(b.event_date), eventDate));
      return { ...member, assignedBookingsCount, isAssigned, hasConflict };
    });
  };

  const resetForm = () => {
    setFormData({ client_id: '', package_id: '', event_type: 'wedding', event_date: '', event_time: '', location: '', venue_details: '', status: 'inquiry', total_amount: 0, advance_amount: 0, notes: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const bookingData = {
        owner_id: user.id,
        client_id: formData.client_id || null,
        package_id: formData.package_id || null,
        event_type: formData.event_type,
        event_date: formData.event_date,
        event_time: formData.event_time || null,
        location: formData.location || null,
        venue_details: formData.venue_details || null,
        status: formData.status,
        total_amount: formData.total_amount,
        advance_amount: formData.advance_amount,
        balance_amount: formData.total_amount - formData.advance_amount,
        notes: formData.notes || null,
      };

      if (editMode && selectedBooking) {
        const { error } = await supabase.from('bookings').update(bookingData).eq('id', selectedBooking.id);
        if (error) throw error;
        toast.success('Booking updated');
      } else {
        const { data: newBooking, error } = await supabase.from('bookings').insert(bookingData).select().single();
        if (error) throw error;
        if (newBooking && formData.advance_amount > 0) {
          await supabase.from('payments').insert({
            owner_id: user.id, booking_id: newBooking.id, amount: formData.advance_amount,
            payment_type: 'advance', payment_date: new Date().toISOString().split('T')[0],
            notes: 'Auto-created with booking',
          });
        }
        toast.success('Booking created');
      }
      setIsFormOpen(false);
      setShowDetailPage(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBooking) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', selectedBooking.id);
      if (error) throw error;
      toast.success('Booking deleted');
      setShowDetailPage(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    if (selectedBooking) {
      setFormData({
        client_id: selectedBooking.client_id || '', package_id: selectedBooking.package_id || '',
        event_type: selectedBooking.event_type, event_date: selectedBooking.event_date,
        event_time: selectedBooking.event_time || '', location: selectedBooking.location || '',
        venue_details: selectedBooking.venue_details || '', status: selectedBooking.status,
        total_amount: Number(selectedBooking.total_amount) || 0,
        advance_amount: Number(selectedBooking.advance_amount) || 0,
        notes: selectedBooking.notes || '',
      });
      setEditMode(true);
      setShowDetailPage(false);
      setIsFormOpen(true);
    }
  };

  const openTeamModal = async () => {
    if (selectedBooking) {
      await fetchBookingTeam(selectedBooking.id);
      setIsTeamModalOpen(true);
    }
  };

  const handleTeamToggle = (memberId: string) => {
    setSelectedTeamIds((prev) => prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]);
  };

  const saveTeamAssignment = async () => {
    if (!selectedBooking) return;
    setIsSavingTeam(true);
    try {
      await supabase.from('booking_team').delete().eq('booking_id', selectedBooking.id);
      if (selectedTeamIds.length > 0) {
        const { error } = await supabase.from('booking_team').insert(
          selectedTeamIds.map((teamMemberId) => ({ booking_id: selectedBooking.id, team_member_id: teamMemberId }))
        );
        if (error) throw error;
      }
      toast.success('Team assigned');
      setIsTeamModalOpen(false);
      await fetchBookingTeam(selectedBooking.id);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign team');
    } finally {
      setIsSavingTeam(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBooking) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('booking_tasks').insert({
        owner_id: user.id, booking_id: selectedBooking.id,
        title: taskFormData.title.trim(), task_type: taskFormData.task_type,
        scheduled_date: taskFormData.scheduled_date || null, status: 'pending', progress: 0,
      });
      if (error) throw error;
      toast.success('Task added');
      setIsTaskFormOpen(false);
      setTaskFormData({ title: '', task_type: 'pre_shoot', scheduled_date: '' });
      fetchBookingTasks(selectedBooking.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    const progress = status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0;
    await supabase.from('booking_tasks').update({ status, progress }).eq('id', taskId);
    if (selectedBooking) fetchBookingTasks(selectedBooking.id);
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    await supabase.from('booking_tasks').delete().eq('id', taskId);
    if (selectedBooking) fetchBookingTasks(selectedBooking.id);
    toast.success('Task deleted');
  };

  // Post-completion toggles
  const toggleAlbumDelivered = async () => {
    if (!selectedBooking) return;
    const newVal = !selectedBooking.album_delivered;
    await supabase.from('bookings').update({ album_delivered: newVal }).eq('id', selectedBooking.id);
    setSelectedBooking({ ...selectedBooking, album_delivered: newVal });
    toast.success(newVal ? 'Album marked as delivered' : 'Album delivery unmarked');
    fetchData();
  };

  const toggleFinalPayment = async () => {
    if (!selectedBooking) return;
    const newVal = !selectedBooking.final_payment_received;
    const updates: any = { final_payment_received: newVal };
    if (newVal) updates.payment_status = 'paid';
    await supabase.from('bookings').update(updates).eq('id', selectedBooking.id);
    setSelectedBooking({ ...selectedBooking, final_payment_received: newVal, payment_status: newVal ? 'paid' : selectedBooking.payment_status });
    toast.success(newVal ? 'Final payment received' : 'Final payment unmarked');
    fetchData();
  };

  // Expense from booking
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBooking) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('expenses').insert({
        owner_id: user.id,
        booking_id: selectedBooking.id,
        description: expenseFormData.description.trim(),
        amount: expenseFormData.amount,
        category: expenseFormData.category,
        expense_date: expenseFormData.expense_date,
        vendor: expenseFormData.vendor.trim() || null,
        payment_method: expenseFormData.payment_method || null,
      });
      if (error) throw error;
      toast.success('Expense added & linked to booking');
      setIsExpenseFormOpen(false);
      setExpenseFormData({ description: '', amount: 0, category: 'other', expense_date: format(new Date(), 'yyyy-MM-dd'), vendor: '', payment_method: '' });
      fetchBookingExpenses(selectedBooking.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Addon management
  const handleAddAddon = async () => {
    if (!user || !selectedBooking || !addonFormData.addon_id) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('booking_addons').insert({
        booking_id: selectedBooking.id,
        addon_id: addonFormData.addon_id,
        custom_price: addonFormData.custom_price ? Number(addonFormData.custom_price) : null,
      });
      if (error) throw error;
      toast.success('Add-on added');
      setAddonFormData({ addon_id: '', custom_price: '' });
      fetchBookingAddons(selectedBooking.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add addon');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeAddon = async (addonId: string) => {
    await supabase.from('booking_addons').delete().eq('id', addonId);
    if (selectedBooking) fetchBookingAddons(selectedBooking.id);
    toast.success('Add-on removed');
  };

  const generateInvoicePDF = () => {
    if (!selectedBooking) return;
    setIsGeneratingInvoice(true);
    try {
      const doc = new jsPDF();
      const booking = selectedBooking;
      doc.setFontSize(22); doc.setFont('helvetica', 'bold');
      doc.text(profile?.studio_name || 'Photography Studio', 20, 25);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      if (profile?.phone) doc.text(`Phone: ${profile.phone}`, 20, 32);
      doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text('TAX INVOICE', 150, 25);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Invoice: INV-${Date.now().toString().slice(-8)}`, 150, 32);
      doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, 150, 38);
      doc.line(20, 44, 190, 44);
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('Bill To:', 20, 53);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      doc.text(booking.client?.name || 'Client', 20, 60);
      if (booking.client?.phone) doc.text(`Ph: ${booking.client.phone}`, 20, 66);
      if (booking.client?.email) doc.text(booking.client.email, 20, 72);
      doc.setFont('helvetica', 'bold');
      doc.text('Event:', 120, 53);
      doc.setFont('helvetica', 'normal');
      doc.text(booking.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 120, 60);
      doc.text(format(new Date(booking.event_date), 'dd MMM yyyy'), 120, 66);
      if (booking.location) doc.text(booking.location, 120, 72);

      const subtotal = Number(booking.total_amount || 0);
      const gstRate = 18;
      const gstAmount = (subtotal * gstRate) / (100 + gstRate);
      const baseAmount = subtotal - gstAmount;

      autoTable(doc, {
        startY: 80,
        head: [['Description', 'HSN', 'Amount']],
        body: [
          ['Photography & Videography Services', '998397', `Rs. ${baseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
          [`CGST (${gstRate / 2}%)`, '', `Rs. ${(gstAmount / 2).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
          [`SGST (${gstRate / 2}%)`, '', `Rs. ${(gstAmount / 2).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66], textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 4 },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Grand Total:', 130, finalY);
      doc.setFontSize(13);
      doc.text(`Rs. ${subtotal.toLocaleString()}`, 165, finalY);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Paid: Rs. ${Number(booking.advance_amount || 0).toLocaleString()}`, 20, finalY + 12);
      doc.text(`Balance: Rs. ${Number(booking.balance_amount || 0).toLocaleString()}`, 20, finalY + 18);
      doc.setFontSize(8); doc.setTextColor(128, 128, 128);
      doc.text('Thank you for your business! This is a computer-generated invoice.', 105, 275, { align: 'center' });
      doc.save(`Invoice-${booking.client?.name || 'Client'}-${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast.success('Invoice downloaded');
    } catch (error) {
      toast.error('Failed to generate invoice');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = booking.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || booking.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getBookingTeamCount = (bookingId: string) => allBookingTeams.filter((bt) => bt.booking_id === bookingId).length;

  const overallProgress = bookingTasks.length > 0
    ? Math.round(bookingTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / bookingTasks.length) : 0;

  const totalExpenseForBooking = bookingExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalAddonsAmount = bookingAddons.reduce((sum, a) => sum + Number(a.custom_price ?? a.addon?.default_price ?? 0), 0);

  // ========== INSIDE PAGE VIEW ==========
  if (showDetailPage && selectedBooking) {
    const isPostCompletion = selectedBooking.status === 'shoot_completed' || selectedBooking.status === 'delivered';

    return (
      <MainLayout title="Booking Details" subtitle={selectedBooking.client?.name || 'Booking'}>
        <div className="space-y-4 max-w-5xl mx-auto">
          {/* Back + Actions */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setShowDetailPage(false)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleEdit}><Edit3 className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              <Button variant="outline" size="sm" onClick={generateInvoicePDF} disabled={isGeneratingInvoice}>
                {isGeneratingInvoice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />} Invoice
              </Button>
              <Button variant="outline" size="sm" className="text-destructive" onClick={handleDelete} disabled={isDeleting}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Info Cards - larger */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="zoho-card p-4">
              <p className="text-xs text-muted-foreground">Client</p>
              <p className="font-semibold text-base truncate">{selectedBooking.client?.name || 'Walk-in'}</p>
              {selectedBooking.client?.phone && <p className="text-xs text-muted-foreground mt-1">{selectedBooking.client.phone}</p>}
            </div>
            <div className="zoho-card p-4">
              <p className="text-xs text-muted-foreground">Event</p>
              <p className="font-semibold text-base">{eventTypes.find(e => e.value === selectedBooking.event_type)?.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{format(new Date(selectedBooking.event_date), 'MMM dd, yyyy')}</p>
            </div>
            <div className="zoho-card p-4">
              <p className="text-xs text-muted-foreground">Total / Paid</p>
              <p className="font-semibold text-base">₹{Number(selectedBooking.total_amount).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Paid: ₹{Number(selectedBooking.advance_amount).toLocaleString()}</p>
            </div>
            <div className="zoho-card p-4">
              <p className="text-xs text-muted-foreground">Status</p>
              <StatusBadge status={selectedBooking.status} className="mt-1" />
              <StatusBadge status={selectedBooking.payment_status || 'pending'} className="mt-1 ml-1" />
            </div>
          </div>

          {/* Location & Package */}
          {(selectedBooking.location || selectedBooking.package?.name) && (
            <div className="zoho-card p-4 flex flex-wrap gap-4 text-sm">
              {selectedBooking.location && <span className="text-muted-foreground">📍 {selectedBooking.location}</span>}
              {selectedBooking.package?.name && <span className="text-muted-foreground">📦 {selectedBooking.package.name}</span>}
              {selectedBooking.notes && <span className="text-muted-foreground">📝 {selectedBooking.notes}</span>}
            </div>
          )}

          {/* Post-Completion Tracking */}
          {isPostCompletion && (
            <div className="zoho-card p-4 space-y-3 border-l-4 border-primary">
              <p className="text-sm font-semibold flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> Post-Completion Tracking</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="text-sm font-medium">Album Delivered</p>
                    <p className="text-xs text-muted-foreground">{selectedBooking.album_delivered ? 'Delivered ✓' : 'Not yet'}</p>
                  </div>
                  <Switch checked={selectedBooking.album_delivered || false} onCheckedChange={toggleAlbumDelivered} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="text-sm font-medium">Final Payment</p>
                    <p className="text-xs text-muted-foreground">{selectedBooking.final_payment_received ? 'Received ✓' : 'Pending'}</p>
                  </div>
                  <Switch checked={selectedBooking.final_payment_received || false} onCheckedChange={toggleFinalPayment} />
                </div>
              </div>
              {selectedBooking.delivery_notes && (
                <p className="text-xs text-muted-foreground">Notes: {selectedBooking.delivery_notes}</p>
              )}
            </div>
          )}

          {/* Team */}
          <div className="zoho-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Team ({bookingTeamMembers.length})</p>
              <Button size="sm" variant="ghost" onClick={openTeamModal}><Users className="h-3.5 w-3.5 mr-1" /> Manage</Button>
            </div>
            {bookingTeamMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No team assigned</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {bookingTeamMembers.map((bt) => (
                  <Badge key={bt.id} variant="secondary" className="text-xs">
                    <UserCheck className="h-3 w-3 mr-1" />{bt.team_member?.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Progress Overview */}
          <div className="zoho-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Progress</p>
              <span className="text-xs text-muted-foreground">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2.5" />
          </div>

          {/* Tasks with color dots */}
          <div className="zoho-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Tasks & Checklist</p>
                <div className="flex gap-1.5">
                  {taskTypes.map(t => (
                    <div key={t.value} className={`h-2 w-2 rounded-full ${t.color}`} title={t.label} />
                  ))}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setIsTaskFormOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>

            {bookingTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No tasks yet. Add tasks to track progress.</p>
            ) : (
              <div className="space-y-2">
                {taskTypes.map(type => {
                  const typeTasks = bookingTasks.filter(t => t.task_type === type.value);
                  if (typeTasks.length === 0) return null;
                  const Icon = type.icon;
                  return (
                    <div key={type.value}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`h-2.5 w-2.5 rounded-full ${type.color}`} />
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium">{type.label}</span>
                      </div>
                      {typeTasks.map(task => (
                        <div key={task.id} className="flex items-center gap-2 py-1.5 pl-5 group">
                          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                            task.status === 'completed' ? 'bg-success' : task.status === 'in_progress' ? 'bg-warning' : 'bg-muted-foreground/30'
                          }`} />
                          <span className={`text-sm flex-1 truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </span>
                          {task.scheduled_date && (
                            <span className="text-[10px] text-muted-foreground">{format(new Date(task.scheduled_date), 'MMM dd')}</span>
                          )}
                          <Select value={task.status} onValueChange={(v) => updateTaskStatus(task.id, v)}>
                            <SelectTrigger className="h-6 w-20 text-[10px] border-0 bg-transparent p-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Todo</SelectItem>
                              <SelectItem value="in_progress">WIP</SelectItem>
                              <SelectItem value="completed">Done</SelectItem>
                            </SelectContent>
                          </Select>
                          <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add-ons */}
          <div className="zoho-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium">Add-ons</p>
                {totalAddonsAmount > 0 && <p className="text-xs text-muted-foreground">Total: ₹{totalAddonsAmount.toLocaleString()}</p>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => { fetchAvailableAddons(); setIsAddonModalOpen(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            {bookingAddons.length === 0 ? (
              <p className="text-xs text-muted-foreground">No add-ons added</p>
            ) : (
              <div className="space-y-1.5">
                {bookingAddons.map((ba) => (
                  <div key={ba.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <PackageIcon className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm">{ba.addon?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">₹{Number(ba.custom_price ?? ba.addon?.default_price ?? 0).toLocaleString()}</span>
                      <button onClick={() => removeAddon(ba.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expenses linked to booking */}
          <div className="zoho-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium">Expenses</p>
                {totalExpenseForBooking > 0 && <p className="text-xs text-muted-foreground">Total: ₹{totalExpenseForBooking.toLocaleString()}</p>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => setIsExpenseFormOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            {bookingExpenses.length === 0 ? (
              <p className="text-xs text-muted-foreground">No expenses linked</p>
            ) : (
              <div className="space-y-1.5">
                {bookingExpenses.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-secondary/50">
                    <div>
                      <span className="text-sm">{exp.description}</span>
                      <span className="text-xs text-muted-foreground ml-2">{format(new Date(exp.expense_date), 'MMM dd')}</span>
                    </div>
                    <span className="text-sm font-medium text-destructive">₹{Number(exp.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Balance Info */}
          {Number(selectedBooking.balance_amount) > 0 && (
            <div className="zoho-card p-4 bg-warning/5 border-warning/20">
              <p className="text-sm font-medium text-warning">Balance Due: ₹{Number(selectedBooking.balance_amount).toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Team Assignment Modal */}
        <Dialog open={isTeamModalOpen} onOpenChange={setIsTeamModalOpen}>
          <DialogContent className="max-w-md mx-3">
            <DialogHeader><DialogTitle>Assign Team</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {getTeamMembersWithStatus().map((member) => (
                <div key={member.id} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                  member.hasConflict ? 'border-warning/50 bg-warning/5' : member.isAssigned ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                }`}>
                  <Checkbox id={member.id} checked={selectedTeamIds.includes(member.id)} onCheckedChange={() => handleTeamToggle(member.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{member.member_type.replace(/_/g, ' ')}</p>
                  </div>
                  {member.hasConflict && <AlertCircle className="h-4 w-4 text-warning" />}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsTeamModalOpen(false)}>Cancel</Button>
              <Button onClick={saveTeamAssignment} disabled={isSavingTeam} className="btn-fade">
                {isSavingTeam && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Task Form */}
        <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
          <DialogContent className="max-w-sm mx-3">
            <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
            <form onSubmit={handleAddTask} className="space-y-3">
              <Input value={taskFormData.title} onChange={e => setTaskFormData({ ...taskFormData, title: e.target.value })} placeholder="Task title" required />
              <Select value={taskFormData.task_type} onValueChange={v => setTaskFormData({ ...taskFormData, task_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {taskTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={taskFormData.scheduled_date} onChange={e => setTaskFormData({ ...taskFormData, scheduled_date: e.target.value })} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsTaskFormOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Expense Form */}
        <Dialog open={isExpenseFormOpen} onOpenChange={setIsExpenseFormOpen}>
          <DialogContent className="max-w-sm mx-3">
            <DialogHeader><DialogTitle>Add Expense for this Booking</DialogTitle></DialogHeader>
            <form onSubmit={handleAddExpense} className="space-y-3">
              <Input value={expenseFormData.description} onChange={e => setExpenseFormData({ ...expenseFormData, description: e.target.value })} placeholder="Description" required />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" value={expenseFormData.amount} onChange={e => setExpenseFormData({ ...expenseFormData, amount: Number(e.target.value) })} placeholder="Amount" min={0} required />
                <Input type="date" value={expenseFormData.expense_date} onChange={e => setExpenseFormData({ ...expenseFormData, expense_date: e.target.value })} required />
              </div>
              <Select value={expenseFormData.category} onValueChange={v => setExpenseFormData({ ...expenseFormData, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={expenseFormData.vendor} onChange={e => setExpenseFormData({ ...expenseFormData, vendor: e.target.value })} placeholder="Vendor (optional)" />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsExpenseFormOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add Expense</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add-on Modal */}
        <Dialog open={isAddonModalOpen} onOpenChange={setIsAddonModalOpen}>
          <DialogContent className="max-w-sm mx-3">
            <DialogHeader><DialogTitle>Add Add-on</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={addonFormData.addon_id} onValueChange={v => setAddonFormData({ ...addonFormData, addon_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select add-on" /></SelectTrigger>
                <SelectContent>
                  {availableAddons.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name} - ₹{Number(a.default_price || 0).toLocaleString()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={addonFormData.custom_price}
                onChange={e => setAddonFormData({ ...addonFormData, custom_price: e.target.value })}
                placeholder="Custom price (optional, overrides default)"
                min={0}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddonModalOpen(false)}>Cancel</Button>
                <Button onClick={handleAddAddon} disabled={!addonFormData.addon_id || isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </MainLayout>
    );
  }

  // ========== LIST VIEW ==========
  return (
    <MainLayout title="Bookings" subtitle="Manage your event bookings">
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search bookings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {bookingStatuses.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { resetForm(); setEditMode(false); setIsFormOpen(true); }} className="btn-fade w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" /> Add Booking
          </Button>
        </div>
      </div>

      {loading ? (
        <ShimmerList count={5} />
      ) : filteredBookings.length === 0 ? (
        <EmptyState icon={Calendar} title="No bookings found" description={searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first booking'}
          action={!searchQuery && statusFilter === 'all' ? { label: 'Add Booking', onClick: () => setIsFormOpen(true) } : undefined} />
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const teamCount = getBookingTeamCount(booking.id);
            return (
              <div key={booking.id} className="zoho-card p-3 sm:p-4 cursor-pointer hover:shadow-zoho-md transition-shadow"
                onClick={() => {
                  setSelectedBooking(booking);
                  fetchBookingTeam(booking.id);
                  fetchBookingTasks(booking.id);
                  fetchBookingExpenses(booking.id);
                  fetchBookingAddons(booking.id);
                  setShowDetailPage(true);
                }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2 sm:p-2.5 rounded-lg bg-primary/10 flex-shrink-0">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{booking.client?.name || 'Walk-in Client'}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {eventTypes.find((e) => e.value === booking.event_type)?.label} • {format(new Date(booking.event_date), 'MMM dd, yyyy')}
                        {booking.location && <span className="hidden sm:inline"> • {booking.location}</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {teamCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{teamCount}</span>
                          </div>
                        )}
                        {booking.album_delivered && <span className="text-xs text-success">📦 Delivered</span>}
                        {booking.final_payment_received && <span className="text-xs text-success">💰 Paid</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                    <div className="text-left sm:text-right">
                      <p className="font-medium text-foreground">Rs. {Number(booking.total_amount).toLocaleString()}</p>
                      {Number(booking.balance_amount) > 0 && (
                        <p className="text-xs text-muted-foreground">Bal: Rs. {Number(booking.balance_amount).toLocaleString()}</p>
                      )}
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-xl mx-3">
          <DialogHeader><DialogTitle>{editMode ? 'Edit Booking' : 'New Booking'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={formData.client_id || "none"} onValueChange={(v) => setFormData({ ...formData, client_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Walk-in Client</SelectItem>
                    {clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Package</Label>
                <Select value={formData.package_id || "none"} onValueChange={(v) => {
                  const pkg = packages.find((p) => p.id === v);
                  setFormData({ ...formData, package_id: v === "none" ? "" : v, total_amount: pkg?.base_price || formData.total_amount });
                }}>
                  <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Package</SelectItem>
                    {packages.map((pkg) => <SelectItem key={pkg.id} value={pkg.id}>{pkg.name} - Rs. {pkg.base_price.toLocaleString()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Type *</Label>
                <Select value={formData.event_type} onValueChange={(v) => setFormData({ ...formData, event_type: v as EventType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{eventTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as BookingStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{bookingStatuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Event Date *</Label><Input type="date" value={formData.event_date} onChange={(e) => setFormData({ ...formData, event_date: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Event Time</Label><Input type="time" value={formData.event_time} onChange={(e) => setFormData({ ...formData, event_time: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Location</Label><Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Venue address" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Total Amount (Rs.)</Label><Input type="number" value={formData.total_amount} onChange={(e) => setFormData({ ...formData, total_amount: Number(e.target.value) })} min={0} /></div>
              <div className="space-y-2"><Label>Advance Amount (Rs.)</Label><Input type="number" value={formData.advance_amount} onChange={(e) => setFormData({ ...formData, advance_amount: Number(e.target.value) })} min={0} max={formData.total_amount} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." rows={2} /></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="btn-fade">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editMode ? 'Update' : 'Create'} Booking
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
