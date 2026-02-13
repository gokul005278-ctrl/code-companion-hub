import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ShimmerList } from '@/components/ui/ShimmerLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DetailModal } from '@/components/ui/DetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { FileText, Plus, Search, Filter, Loader2, Calendar, IndianRupee } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: string | null;
  vendor: string | null;
  receipt_url: string | null;
  booking_id: string | null;
  notes: string | null;
  created_at: string;
}

const expenseCategories = [
  { value: 'equipment', label: 'Equipment' },
  { value: 'travel', label: 'Travel' },
  { value: 'software', label: 'Software' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'cheque', label: 'Cheque' },
];

const dateFilters = [
  { value: 'all', label: 'All Time' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

export default function Expenses() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bookings, setBookings] = useState<{ id: string; event_type: string; client_name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    category: 'other',
    description: '',
    amount: 0,
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: '',
    vendor: '',
    booking_id: '',
    notes: '',
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [expensesRes, bookingsRes] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .order('expense_date', { ascending: false }),
        supabase
          .from('bookings')
          .select('id, event_type, client:clients(name)')
          .order('event_date', { ascending: false })
          .limit(50),
      ]);

      if (expensesRes.data) setExpenses(expensesRes.data);
      if (bookingsRes.data) {
        setBookings(
          bookingsRes.data.map((b: any) => ({
            id: b.id,
            event_type: b.event_type,
            client_name: b.client?.name || 'Walk-in',
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      category: 'other',
      description: '',
      amount: 0,
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: '',
      vendor: '',
      booking_id: '',
      notes: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const expenseData = {
        owner_id: user.id,
        category: formData.category,
        description: formData.description.trim(),
        amount: formData.amount,
        expense_date: formData.expense_date,
        payment_method: formData.payment_method || null,
        vendor: formData.vendor.trim() || null,
        booking_id: formData.booking_id || null,
        notes: formData.notes.trim() || null,
      };

      if (editMode && selectedExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', selectedExpense.id);
        if (error) throw error;
        toast.success('Expense updated successfully');
      } else {
        const { error } = await supabase.from('expenses').insert(expenseData);
        if (error) throw error;
        toast.success('Expense created successfully');
      }

      setIsFormOpen(false);
      setIsDetailOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedExpense) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', selectedExpense.id);
      if (error) throw error;
      toast.success('Expense deleted successfully');
      setIsDetailOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete expense');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    if (selectedExpense) {
      setFormData({
        category: selectedExpense.category,
        description: selectedExpense.description,
        amount: Number(selectedExpense.amount),
        expense_date: selectedExpense.expense_date,
        payment_method: selectedExpense.payment_method || '',
        vendor: selectedExpense.vendor || '',
        booking_id: selectedExpense.booking_id || '',
        notes: selectedExpense.notes || '',
      });
      setEditMode(true);
      setIsDetailOpen(false);
      setIsFormOpen(true);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'this_month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month': return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case 'last_3_months': return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case 'this_year': return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom':
        return customStartDate && customEndDate
          ? { start: new Date(customStartDate), end: new Date(customEndDate) }
          : null;
      default: return null;
    }
  };

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.vendor?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;

    const dateRange = getDateRange();
    const matchesDate = !dateRange || (
      new Date(expense.expense_date) >= dateRange.start &&
      new Date(expense.expense_date) <= dateRange.end
    );

    return matchesSearch && matchesCategory && matchesDate;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const currentMonthExpenses = expenses
    .filter((e) => {
      const date = new Date(e.expense_date);
      return date >= startOfMonth(new Date()) && date <= endOfMonth(new Date());
    })
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      equipment: 'bg-blue-500/10 text-blue-600',
      travel: 'bg-green-500/10 text-green-600',
      software: 'bg-purple-500/10 text-purple-600',
      marketing: 'bg-pink-500/10 text-pink-600',
      rent: 'bg-orange-500/10 text-orange-600',
      utilities: 'bg-yellow-500/10 text-yellow-600',
      salaries: 'bg-red-500/10 text-red-600',
      other: 'bg-gray-500/10 text-gray-600',
    };
    return colors[category] || colors.other;
  };

  return (
    <MainLayout title="Expenses" subtitle="Track your business expenses">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="zoho-card p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">This Month</p>
          <p className="text-lg sm:text-xl font-bold text-foreground">
            Rs. {currentMonthExpenses.toLocaleString()}
          </p>
        </div>
        <div className="zoho-card p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">Filtered Total</p>
          <p className="text-lg sm:text-xl font-bold text-foreground">
            Rs. {totalExpenses.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {expenseCategories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              {dateFilters.map((df) => (
                <SelectItem key={df.value} value={df.value}>
                  {df.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => { resetForm(); setEditMode(false); setIsFormOpen(true); }} className="btn-fade">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>
        {dateFilter === 'custom' && (
          <div className="flex gap-3">
            <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-40" />
            <span className="text-muted-foreground self-center">to</span>
            <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-40" />
          </div>
        )}
      </div>

      {/* Content - Grid View */}
      {loading ? (
        <ShimmerList count={5} />
      ) : filteredExpenses.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No expenses found"
          description={searchQuery || categoryFilter !== 'all' || dateFilter !== 'all' ? 'Try adjusting your filters' : 'Add your first expense'}
          action={!searchQuery && categoryFilter === 'all' ? { label: 'Add Expense', onClick: () => setIsFormOpen(true) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExpenses.map((expense) => (
            <div
              key={expense.id}
              className="zoho-card p-4 cursor-pointer hover:shadow-zoho-md transition-shadow"
              onClick={() => { setSelectedExpense(expense); setIsDetailOpen(true); }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${getCategoryColor(expense.category)}`}>
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{expense.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {expenseCategories.find(c => c.value === expense.category)?.label}
                      {expense.vendor && ` • ${expense.vendor}`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-muted-foreground">
                  {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                </p>
                <p className="font-semibold text-foreground">Rs. {Number(expense.amount).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <DetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title={selectedExpense?.description || 'Expense Details'}
        description={selectedExpense ? expenseCategories.find(c => c.value === selectedExpense.category)?.label : undefined}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      >
        {selectedExpense && (
          <div className="space-y-4">
            <div className="text-2xl font-bold text-foreground">
              Rs. {Number(selectedExpense.amount).toLocaleString()}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{format(new Date(selectedExpense.expense_date), 'MMMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-medium">
                  {paymentMethods.find(m => m.value === selectedExpense.payment_method)?.label || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendor</p>
                <p className="font-medium">{selectedExpense.vendor || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">
                  {expenseCategories.find(c => c.value === selectedExpense.category)?.label}
                </p>
              </div>
            </div>
            {selectedExpense.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-sm">{selectedExpense.notes}</p>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto mx-3">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Expense' : 'New Expense'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What was this expense for?"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (Rs.) *</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  min={0}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(v) => setFormData({ ...formData, payment_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Input
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                placeholder="Vendor or supplier name"
              />
            </div>
            <div className="space-y-2">
              <Label>Link to Booking (Optional)</Label>
              <Select
                value={formData.booking_id}
                onValueChange={(v) => setFormData({ ...formData, booking_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select booking" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No booking</SelectItem>
                  {bookings.map((booking) => (
                    <SelectItem key={booking.id} value={booking.id}>
                      {booking.client_name} - {booking.event_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="btn-fade">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editMode ? 'Update' : 'Create'} Expense
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}