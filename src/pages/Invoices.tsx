import { useEffect, useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ShimmerList } from '@/components/ui/ShimmerLoader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { DetailModal } from '@/components/ui/DetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Loader2,
  Calendar,
  Mail,
  Printer,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_type: string;
  payment_method: string | null;
  notes: string | null;
  booking_id: string;
  booking: {
    id: string;
    event_type: string;
    event_date: string;
    total_amount: number | null;
    advance_amount: number | null;
    balance_amount: number | null;
    location: string | null;
    client: { name: string; email: string | null; phone: string | null } | null;
  } | null;
}

interface Booking {
  id: string;
  event_type: string;
  event_date: string;
  total_amount: number | null;
  client: { name: string } | null;
}

interface Profile {
  studio_name: string | null;
  full_name: string | null;
  phone: string | null;
}

export default function Invoices() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [bookingFilter, setBookingFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    booking_id: '',
    amount: 0,
    payment_type: 'advance',
    payment_method: 'cash',
    notes: '',
  });

  const [invoiceSettings, setInvoiceSettings] = useState({
    includeGST: false,
    gstRate: 18,
    invoiceNumber: '',
    invoiceDate: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [paymentsRes, bookingsRes, profileRes] = await Promise.all([
        supabase
          .from('payments')
          .select(`
            *,
            booking:bookings(
              id,
              event_type,
              event_date,
              total_amount,
              advance_amount,
              balance_amount,
              location,
              client:clients(name, email, phone)
            )
          `)
          .order('payment_date', { ascending: false }),
        supabase
          .from('bookings')
          .select(`id, event_type, event_date, total_amount, client:clients(name)`)
          .order('event_date', { ascending: false }),
        supabase.from('profiles').select('studio_name, full_name, phone').single(),
      ]);

      if (paymentsRes.data) setPayments(paymentsRes.data as Payment[]);
      if (bookingsRes.data) setBookings(bookingsRes.data as Booking[]);
      if (profileRes.data) setProfile(profileRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate booking summary when a booking is selected in form or filter
  const getBookingSummary = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return null;
    const bookingPayments = payments.filter(p => p.booking_id === bookingId);
    const totalPaid = bookingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalAmount = Number(booking.total_amount || 0);
    const pendingAmount = Math.max(0, totalAmount - totalPaid);
    return { booking, totalPaid, totalAmount, pendingAmount, paymentsCount: bookingPayments.length };
  };

  const selectedBookingSummary = useMemo(() => {
    if (formData.booking_id) return getBookingSummary(formData.booking_id);
    return null;
  }, [formData.booking_id, payments, bookings]);

  const filterBookingSummary = useMemo(() => {
    if (bookingFilter !== 'all') return getBookingSummary(bookingFilter);
    return null;
  }, [bookingFilter, payments, bookings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate against pending amount
    if (selectedBookingSummary && formData.amount > selectedBookingSummary.pendingAmount) {
      toast.error(`Amount cannot exceed pending amount of Rs. ${selectedBookingSummary.pendingAmount.toLocaleString()}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: paymentError } = await supabase.from('payments').insert({
        owner_id: user.id,
        booking_id: formData.booking_id,
        amount: formData.amount,
        payment_type: formData.payment_type,
        payment_method: formData.payment_method,
        notes: formData.notes || null,
      });

      if (paymentError) throw paymentError;

      // Update booking amounts
      const booking = bookings.find((b) => b.id === formData.booking_id);
      if (booking) {
        const { data: existingPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('booking_id', formData.booking_id);

        const totalPaid = (existingPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0);
        const balance = (Number(booking.total_amount) || 0) - totalPaid;

        await supabase
          .from('bookings')
          .update({
            advance_amount: totalPaid,
            balance_amount: Math.max(0, balance),
            payment_status: balance <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'pending',
          })
          .eq('id', formData.booking_id);
      }

      toast.success('Payment recorded successfully');
      setIsFormOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      booking_id: '',
      amount: 0,
      payment_type: 'advance',
      payment_method: 'cash',
      notes: '',
    });
  };

  const handleDelete = async () => {
    if (!selectedPayment) return;

    setIsDeleting(true);
    try {
      const bookingId = selectedPayment.booking_id;

      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', selectedPayment.id);

      if (error) throw error;

      // Recalculate booking amounts after delete
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        const { data: remainingPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('booking_id', bookingId);

        const totalPaid = remainingPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        const balance = Math.max(0, (Number(booking.total_amount) || 0) - totalPaid);

        await supabase
          .from('bookings')
          .update({
            advance_amount: totalPaid,
            balance_amount: balance,
            payment_status: balance <= 0 && totalPaid > 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'pending',
          })
          .eq('id', bookingId);
      }

      toast.success('Payment deleted successfully');
      setIsDetailOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete payment');
    } finally {
      setIsDeleting(false);
    }
  };

  const generateInvoicePDF = (payment: Payment) => {
    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const booking = payment.booking;

      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(profile?.studio_name || 'Photography Studio', 20, 25);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (profile?.phone) {
        doc.text(`Phone: ${profile.phone}`, 20, 32);
      }

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', 150, 25);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Invoice No: ${invoiceSettings.invoiceNumber || `INV-${Date.now().toString().slice(-8)}`}`, 150, 32);
      doc.text(`Date: ${format(new Date(invoiceSettings.invoiceDate), 'dd MMM yyyy')}`, 150, 38);

      doc.setDrawColor(200, 200, 200);
      doc.line(20, 45, 190, 45);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Bill To:', 20, 55);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(booking?.client?.name || 'Client', 20, 62);
      if (booking?.client?.phone) {
        doc.text(`Phone: ${booking.client.phone}`, 20, 68);
      }
      if (booking?.client?.email) {
        doc.text(`Email: ${booking.client.email}`, 20, 74);
      }

      doc.setFont('helvetica', 'bold');
      doc.text('Event Details:', 120, 55);

      doc.setFont('helvetica', 'normal');
      doc.text(`Type: ${booking?.event_type?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}`, 120, 62);
      doc.text(`Date: ${booking?.event_date ? format(new Date(booking.event_date), 'dd MMM yyyy') : '-'}`, 120, 68);
      if (booking?.location) {
        doc.text(`Location: ${booking.location}`, 120, 74);
      }

      const subtotal = Number(booking?.total_amount || 0);
      const gstAmount = invoiceSettings.includeGST ? (subtotal * invoiceSettings.gstRate) / 100 : 0;
      const grandTotal = subtotal + gstAmount;

      const tableData = [
        ['Photography Services', '1', `Rs. ${subtotal.toLocaleString()}`, `Rs. ${subtotal.toLocaleString()}`],
      ];

      if (invoiceSettings.includeGST) {
        tableData.push([`GST (${invoiceSettings.gstRate}%)`, '', '', `Rs. ${gstAmount.toLocaleString()}`]);
      }

      autoTable(doc, {
        startY: 85,
        head: [['Description', 'Qty', 'Rate', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [66, 66, 66],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 10,
          cellPadding: 5,
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 40, halign: 'right' },
          3: { cellWidth: 40, halign: 'right' },
        },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;

      // Recalculate paid/balance from actual payments
      const bookingPayments = payments.filter(p => p.booking_id === booking?.id);
      const totalPaid = bookingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const balanceDue = Math.max(0, grandTotal - totalPaid);

      doc.setFont('helvetica', 'bold');
      doc.text('Grand Total:', 130, finalY);
      doc.setFontSize(14);
      doc.text(`Rs. ${grandTotal.toLocaleString()}`, 165, finalY);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Amount Paid: Rs. ${totalPaid.toLocaleString()}`, 20, finalY + 15);
      doc.text(`Balance Due: Rs. ${balanceDue.toLocaleString()}`, 20, finalY + 22);

      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Thank you for your business!', 105, 270, { align: 'center' });
      doc.text('This is a computer-generated invoice.', 105, 275, { align: 'center' });

      doc.save(`Invoice-${booking?.client?.name || 'Client'}-${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setIsGenerating(false);
      setIsInvoiceDialogOpen(false);
    }
  };

  const openInvoiceDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setInvoiceSettings({
      includeGST: false,
      gstRate: 18,
      invoiceNumber: `INV-${Date.now().toString().slice(-8)}`,
      invoiceDate: format(new Date(), 'yyyy-MM-dd'),
    });
    setIsInvoiceDialogOpen(true);
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.booking?.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || payment.payment_type === typeFilter;
    const matchesBooking = bookingFilter === 'all' || payment.booking_id === bookingFilter;
    return matchesSearch && matchesType && matchesBooking;
  });

  const paymentTypes = [
    { value: 'advance', label: 'Advance' },
    { value: 'partial', label: 'Partial' },
    { value: 'final', label: 'Final' },
    { value: 'refund', label: 'Refund' },
  ];

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'card', label: 'Card' },
    { value: 'cheque', label: 'Cheque' },
  ];

  const totalReceived = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const thisMonthPayments = payments.filter((p) => {
    const paymentDate = new Date(p.payment_date);
    const now = new Date();
    return (
      paymentDate.getMonth() === now.getMonth() &&
      paymentDate.getFullYear() === now.getFullYear()
    );
  });
  const thisMonthTotal = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <MainLayout title="Payments" subtitle="Manage payments and generate invoices">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="zoho-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-success/10">
              <FileText className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Received</p>
              <p className="text-xl font-bold text-foreground">
                Rs. {totalReceived.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="zoho-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-xl font-bold text-foreground">
                Rs. {thisMonthTotal.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="zoho-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-info/10">
              <FileText className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Payments</p>
              <p className="text-xl font-bold text-foreground">{payments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Summary when filtered */}
      {filterBookingSummary && (
        <div className="zoho-card p-4 mb-6 border-l-4 border-primary">
          <p className="text-sm font-semibold mb-2">Booking Summary: {filterBookingSummary.booking.client?.name || 'Unknown'}</p>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div><p className="text-muted-foreground">Total</p><p className="font-bold">Rs. {filterBookingSummary.totalAmount.toLocaleString()}</p></div>
            <div><p className="text-muted-foreground">Paid</p><p className="font-bold text-success">Rs. {filterBookingSummary.totalPaid.toLocaleString()}</p></div>
            <div><p className="text-muted-foreground">Pending</p><p className="font-bold text-warning">Rs. {filterBookingSummary.pendingAmount.toLocaleString()}</p></div>
            <div><p className="text-muted-foreground">Payments</p><p className="font-bold">{filterBookingSummary.paymentsCount}</p></div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={bookingFilter} onValueChange={setBookingFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="All Bookings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bookings</SelectItem>
            {bookings.map((booking) => (
              <SelectItem key={booking.id} value={booking.id}>
                {booking.client?.name || 'Unknown'} - {format(new Date(booking.event_date), 'MMM dd')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {paymentTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => { resetForm(); setIsFormOpen(true); }} className="btn-fade">
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <ShimmerList count={5} />
      ) : filteredPayments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No payments found"
          description={
            searchQuery || typeFilter !== 'all' || bookingFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Record your first payment to get started'
          }
          action={
            !searchQuery && typeFilter === 'all'
              ? { label: 'Record Payment', onClick: () => setIsFormOpen(true) }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((payment) => (
            <div
              key={payment.id}
              className="zoho-card p-4 cursor-pointer hover:shadow-zoho-md transition-shadow"
              onClick={() => {
                setSelectedPayment(payment);
                setIsDetailOpen(true);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-success/10">
                    <FileText className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {payment.booking?.client?.name || 'Unknown Client'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {payment.booking?.event_type?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} •{' '}
                      {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-success">
                      Rs. {Number(payment.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {payment.payment_method?.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <StatusBadge
                    status={payment.payment_type}
                    customLabels={{
                      advance: 'Advance',
                      partial: 'Partial',
                      final: 'Final',
                      refund: 'Refund',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <DetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Payment Details"
        onDelete={handleDelete}
        isDeleting={isDeleting}
      >
        {selectedPayment && (() => {
          const summary = getBookingSummary(selectedPayment.booking_id);
          return (
            <div className="space-y-6">
              <div className="text-center py-4 border-b border-border">
                <p className="text-4xl font-bold text-success">
                  Rs. {Number(selectedPayment.amount).toLocaleString()}
                </p>
                <p className="text-muted-foreground mt-1 capitalize">
                  {selectedPayment.payment_type} Payment
                </p>
              </div>

              {/* Booking Payment Summary */}
              {summary && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Booking Payment Summary</p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div><p className="text-muted-foreground">Total</p><p className="font-bold">Rs. {summary.totalAmount.toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Paid</p><p className="font-bold text-success">Rs. {summary.totalPaid.toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Pending</p><p className="font-bold text-warning">Rs. {summary.pendingAmount.toLocaleString()}</p></div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">
                    {selectedPayment.booking?.client?.name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedPayment.payment_date), 'MMMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium capitalize">
                    {selectedPayment.payment_method?.replace(/_/g, ' ') || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Event Type</p>
                  <p className="font-medium capitalize">
                    {selectedPayment.booking?.event_type?.replace(/_/g, ' ') || '-'}
                  </p>
                </div>
              </div>

              {selectedPayment.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedPayment.notes}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  className="flex-1 btn-fade"
                  variant="outline"
                  onClick={() => openInvoiceDialog(selectedPayment)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generate Invoice
                </Button>
              </div>
            </div>
          );
        })()}
      </DetailModal>

      {/* Invoice Generation Dialog */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input
                  value={invoiceSettings.invoiceNumber}
                  onChange={(e) =>
                    setInvoiceSettings({ ...invoiceSettings, invoiceNumber: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice Date</Label>
                <Input
                  type="date"
                  value={invoiceSettings.invoiceDate}
                  onChange={(e) =>
                    setInvoiceSettings({ ...invoiceSettings, invoiceDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <Checkbox
                id="includeGST"
                checked={invoiceSettings.includeGST}
                onCheckedChange={(checked) =>
                  setInvoiceSettings({ ...invoiceSettings, includeGST: checked as boolean })
                }
              />
              <div className="flex-1">
                <Label htmlFor="includeGST" className="cursor-pointer">
                  Include GST
                </Label>
                <p className="text-xs text-muted-foreground">
                  Add GST to the invoice total
                </p>
              </div>
            </div>

            {invoiceSettings.includeGST && (
              <div className="space-y-2">
                <Label>GST Rate (%)</Label>
                <Select
                  value={invoiceSettings.gstRate.toString()}
                  onValueChange={(v) =>
                    setInvoiceSettings({ ...invoiceSettings, gstRate: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInvoiceDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedPayment && generateInvoicePDF(selectedPayment)}
                disabled={isGenerating}
                className="btn-fade"
              >
                {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Booking *</Label>
              <Select
                value={formData.booking_id}
                onValueChange={(v) => setFormData({ ...formData, booking_id: v, amount: 0 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select booking" />
                </SelectTrigger>
                <SelectContent>
                  {bookings.map((booking) => (
                    <SelectItem key={booking.id} value={booking.id}>
                      {booking.client?.name || 'Unknown'} -{' '}
                      {format(new Date(booking.event_date), 'MMM dd, yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Booking summary when selected */}
            {selectedBookingSummary && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <div><p className="text-xs text-muted-foreground">Total</p><p className="font-bold">Rs. {selectedBookingSummary.totalAmount.toLocaleString()}</p></div>
                  <div><p className="text-xs text-muted-foreground">Paid</p><p className="font-bold text-success">Rs. {selectedBookingSummary.totalPaid.toLocaleString()}</p></div>
                  <div><p className="text-xs text-muted-foreground">Pending</p><p className="font-bold text-warning">Rs. {selectedBookingSummary.pendingAmount.toLocaleString()}</p></div>
                </div>
                {selectedBookingSummary.pendingAmount <= 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" /> Fully paid – no pending amount
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Amount (Rs.) *</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                min={0}
                max={selectedBookingSummary?.pendingAmount || undefined}
                required
              />
              {selectedBookingSummary && selectedBookingSummary.pendingAmount > 0 && (
                <p className="text-xs text-muted-foreground">Max: Rs. {selectedBookingSummary.pendingAmount.toLocaleString()}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select
                  value={formData.payment_type}
                  onValueChange={(v) => setFormData({ ...formData, payment_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
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
                    <SelectValue />
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
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional payment notes..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.booking_id || (selectedBookingSummary ? selectedBookingSummary.pendingAmount <= 0 : false)} className="btn-fade">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Record Payment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}