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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Target, Plus, Search, Mail, Phone, Loader2, UserPlus, Calendar, MapPin, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Lead {
  id: string; name: string; email: string | null; phone: string | null;
  event_type: string | null; event_date: string | null; budget: string | null;
  location: string | null; message: string | null; source: string | null;
  status: string; priority: string | null; follow_up_date: string | null;
  notes: string | null; converted_client_id: string | null; created_at: string;
}

const leadStatuses = [
  { value: 'new', label: 'New' }, { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' }, { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'negotiation', label: 'Negotiation' }, { value: 'won', label: 'Won' }, { value: 'lost', label: 'Lost' },
];
const leadSources = [
  { value: 'manual', label: 'Manual' }, { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' }, { value: 'social_media', label: 'Social Media' },
  { value: 'google', label: 'Google' }, { value: 'other', label: 'Other' },
];
const priorities = [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }];
const eventTypes = [
  { value: 'wedding', label: 'Wedding' }, { value: 'engagement', label: 'Engagement' },
  { value: 'birthday', label: 'Birthday' }, { value: 'corporate', label: 'Corporate' },
  { value: 'reel', label: 'Reel' }, { value: 'other', label: 'Other' },
];

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    new: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    contacted: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
    qualified: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
    proposal_sent: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
    negotiation: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    won: 'bg-green-500/15 text-green-600 border-green-500/30',
    lost: 'bg-red-500/15 text-red-600 border-red-500/30',
  };
  return colors[status] || 'bg-muted text-muted-foreground';
};

export default function Leads() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', event_type: '', event_date: '', budget: '',
    location: '', message: '', source: 'manual', status: 'new', priority: 'medium',
    follow_up_date: '', notes: '',
  });

  useEffect(() => { if (user) fetchLeads(); }, [user]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch (error) { console.error('Error fetching leads:', error); }
    finally { setLoading(false); }
  };

  const resetForm = () => setFormData({ name: '', email: '', phone: '', event_type: '', event_date: '', budget: '', location: '', message: '', source: 'manual', status: 'new', priority: 'medium', follow_up_date: '', notes: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) return;
    setIsSubmitting(true);
    try {
      const leadData = {
        owner_id: user.id, name: formData.name.trim(), email: formData.email.trim() || null,
        phone: formData.phone.trim() || null, event_type: formData.event_type || null,
        event_date: formData.event_date || null, budget: formData.budget.trim() || null,
        location: formData.location.trim() || null, message: formData.message.trim() || null,
        source: formData.source, status: formData.status, priority: formData.priority,
        follow_up_date: formData.follow_up_date || null, notes: formData.notes.trim() || null,
      };
      if (editMode && selectedLead) {
        const { error } = await supabase.from('leads').update(leadData).eq('id', selectedLead.id);
        if (error) throw error;
        toast.success('Lead updated');
      } else {
        const { error } = await supabase.from('leads').insert(leadData);
        if (error) throw error;
        toast.success('Lead created');
      }
      setIsFormOpen(false); setIsDetailOpen(false); fetchLeads();
    } catch (error: any) { toast.error(error.message || 'Failed to save lead'); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedLead) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('leads').delete().eq('id', selectedLead.id);
      if (error) throw error;
      toast.success('Lead deleted'); setIsDetailOpen(false); fetchLeads();
    } catch (error: any) { toast.error(error.message || 'Failed to delete'); }
    finally { setIsDeleting(false); }
  };

  const handleEdit = () => {
    if (selectedLead) {
      setFormData({
        name: selectedLead.name, email: selectedLead.email || '', phone: selectedLead.phone || '',
        event_type: selectedLead.event_type || '', event_date: selectedLead.event_date || '',
        budget: selectedLead.budget || '', location: selectedLead.location || '',
        message: selectedLead.message || '', source: selectedLead.source || 'manual',
        status: selectedLead.status, priority: selectedLead.priority || 'medium',
        follow_up_date: selectedLead.follow_up_date || '', notes: selectedLead.notes || '',
      });
      setEditMode(true); setIsDetailOpen(false); setIsFormOpen(true);
    }
  };

  const convertToClient = async () => {
    if (!selectedLead || !user) return;
    setIsConverting(true);
    try {
      const { data: newClient, error: clientError } = await supabase.from('clients').insert({
        owner_id: user.id, name: selectedLead.name, email: selectedLead.email,
        phone: selectedLead.phone, notes: `Converted from lead. ${selectedLead.message || ''}`,
      }).select().single();
      if (clientError) throw clientError;
      await supabase.from('leads').update({ status: 'won', converted_client_id: newClient.id, converted_at: new Date().toISOString() }).eq('id', selectedLead.id);
      toast.success('Lead converted to client');
      setIsDetailOpen(false); fetchLeads();
    } catch (error: any) { toast.error(error.message || 'Failed to convert'); }
    finally { setIsConverting(false); }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) || lead.phone?.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getPriorityColor = (priority: string | null) => {
    switch (priority) { case 'high': return 'text-destructive'; case 'medium': return 'text-warning'; default: return 'text-muted-foreground'; }
  };

  return (
    <MainLayout title="Leads" subtitle="Manage your sales pipeline">
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search leads..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {leadStatuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { resetForm(); setEditMode(false); setIsFormOpen(true); }} className="btn-fade">
            <Plus className="h-4 w-4 mr-2" /> Add Lead
          </Button>
        </div>
      </div>

      {loading ? <ShimmerList count={5} /> : filteredLeads.length === 0 ? (
        <EmptyState icon={Target} title="No leads found" description={searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Add your first lead'}
          action={!searchQuery && statusFilter === 'all' ? { label: 'Add Lead', onClick: () => setIsFormOpen(true) } : undefined} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <div key={lead.id} className="zoho-card p-4 cursor-pointer hover:shadow-zoho-md transition-shadow"
              onClick={() => { setSelectedLead(lead); setIsDetailOpen(true); }}>
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-full bg-primary/10 flex-shrink-0 ${getPriorityColor(lead.priority)}`}>
                  <Target className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground truncate">{lead.name}</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', getStatusColor(lead.status))}>
                      {leadStatuses.find(s => s.value === lead.status)?.label || lead.status}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    {lead.email && <p className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{lead.email}</p>}
                    {lead.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</p>}
                    {lead.event_type && (
                      <p>{eventTypes.find(e => e.value === lead.event_type)?.label || lead.event_type}
                        {lead.event_date && ` • ${format(new Date(lead.event_date), 'MMM dd, yyyy')}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="text-muted-foreground">{format(new Date(lead.created_at), 'MMM dd')}</span>
                {lead.priority && (
                  <span className={`px-2 py-0.5 rounded ${lead.priority === 'high' ? 'bg-destructive/10 text-destructive' : lead.priority === 'medium' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
                    {lead.priority}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <DetailModal open={isDetailOpen} onOpenChange={setIsDetailOpen} title={selectedLead?.name || 'Lead'} description={selectedLead?.source ? `Source: ${leadSources.find(s => s.value === selectedLead.source)?.label}` : undefined} onEdit={handleEdit} onDelete={handleDelete} isDeleting={isDeleting}>
        {selectedLead && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-xs px-2.5 py-1 rounded-full border font-medium', getStatusColor(selectedLead.status))}>
                {leadStatuses.find(s => s.value === selectedLead.status)?.label || selectedLead.status}
              </span>
              {selectedLead.priority && <span className={`text-xs px-2 py-1 rounded ${selectedLead.priority === 'high' ? 'bg-destructive/10 text-destructive' : selectedLead.priority === 'medium' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>{priorities.find(p => p.value === selectedLead.priority)?.label} Priority</span>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{selectedLead.email || '-'}</p></div>
              <div><p className="text-sm text-muted-foreground">Phone</p><p className="font-medium">{selectedLead.phone || '-'}</p></div>
              <div><p className="text-sm text-muted-foreground">Event Type</p><p className="font-medium">{eventTypes.find(e => e.value === selectedLead.event_type)?.label || '-'}</p></div>
              <div><p className="text-sm text-muted-foreground">Event Date</p><p className="font-medium">{selectedLead.event_date ? format(new Date(selectedLead.event_date), 'MMM dd, yyyy') : '-'}</p></div>
              <div><p className="text-sm text-muted-foreground">Budget</p><p className="font-medium">{selectedLead.budget || '-'}</p></div>
              <div><p className="text-sm text-muted-foreground">Location</p><p className="font-medium">{selectedLead.location || '-'}</p></div>
            </div>
            {selectedLead.message && <div><p className="text-sm text-muted-foreground">Message</p><p className="text-sm">{selectedLead.message}</p></div>}
            {selectedLead.notes && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground font-medium mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{selectedLead.notes}</p>
              </div>
            )}
            {selectedLead.follow_up_date && <div className="p-3 bg-warning/10 rounded-lg"><p className="text-sm font-medium text-warning flex items-center gap-2"><Calendar className="h-4 w-4" />Follow-up: {format(new Date(selectedLead.follow_up_date), 'MMMM dd, yyyy')}</p></div>}
            {!selectedLead.converted_client_id && selectedLead.status !== 'lost' && (
              <Button onClick={convertToClient} disabled={isConverting} className="w-full btn-fade">
                {isConverting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}Convert to Client
              </Button>
            )}
            {selectedLead.converted_client_id && <div className="p-3 bg-success/10 rounded-lg"><p className="text-sm font-medium text-success flex items-center gap-2"><UserPlus className="h-4 w-4" />Converted to client</p></div>}
          </div>
        )}
      </DetailModal>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-3">
          <DialogHeader><DialogTitle>{editMode ? 'Edit Lead' : 'New Lead'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2"><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Lead name" required /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Event Type</Label><Select value={formData.event_type} onValueChange={(v) => setFormData({ ...formData, event_type: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{eventTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Event Date</Label><Input type="date" value={formData.event_date} onChange={(e) => setFormData({ ...formData, event_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Budget</Label><Input value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} /></div>
              <div className="space-y-2"><Label>Location</Label><Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
              <div className="space-y-2"><Label>Source</Label><Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{leadSources.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Status</Label><Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{leadStatuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Priority</Label><Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{priorities.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Follow-up</Label><Input type="date" value={formData.follow_up_date} onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Message</Label><Textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} /></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="btn-fade">{isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editMode ? 'Update' : 'Create'} Lead</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}