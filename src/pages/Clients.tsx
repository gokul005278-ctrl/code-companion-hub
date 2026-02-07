import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Users, Plus, Search, Mail, Phone, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  special_instructions: string | null;
  created_at: string;
}

export default function Clients() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    special_instructions: '',
  });

  useEffect(() => {
    if (user) fetchClients();
  }, [user]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsFormOpen(true);
      setEditMode(false);
      resetForm();
      setSearchParams({});
    }
  }, [searchParams]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      notes: '',
      special_instructions: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const clientData = {
        owner_id: user.id,
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        notes: formData.notes.trim() || null,
        special_instructions: formData.special_instructions.trim() || null,
      };

      if (editMode && selectedClient) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', selectedClient.id);
        if (error) throw error;
        toast.success('Client updated successfully');
      } else {
        const { error } = await supabase.from('clients').insert(clientData);
        if (error) throw error;
        toast.success('Client created successfully');
      }

      setIsFormOpen(false);
      setIsDetailOpen(false);
      fetchClients();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', selectedClient.id);
      if (error) throw error;
      toast.success('Client deleted successfully');
      setIsDetailOpen(false);
      fetchClients();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete client');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    if (selectedClient) {
      setFormData({
        name: selectedClient.name,
        phone: selectedClient.phone || '',
        email: selectedClient.email || '',
        notes: selectedClient.notes || '',
        special_instructions: selectedClient.special_instructions || '',
      });
      setEditMode(true);
      setIsDetailOpen(false);
      setIsFormOpen(true);
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone?.includes(searchQuery)
  );

  return (
    <MainLayout title="Clients" subtitle="Manage your client database">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { resetForm(); setEditMode(false); setIsFormOpen(true); }} className="btn-fade">
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <ShimmerList count={5} />
      ) : filteredClients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients found"
          description={searchQuery ? 'Try adjusting your search' : 'Add your first client to get started'}
          action={!searchQuery ? { label: 'Add Client', onClick: () => setIsFormOpen(true) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="zoho-card p-4 cursor-pointer hover:shadow-zoho-md transition-shadow"
              onClick={() => { setSelectedClient(client); setIsDetailOpen(true); }}
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{client.name}</p>
                  {client.email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" />
                      {client.email}
                    </p>
                  )}
                  {client.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {client.phone}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Added {format(new Date(client.created_at), 'MMM dd, yyyy')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <DetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title={selectedClient?.name || 'Client Details'}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      >
        {selectedClient && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{selectedClient.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{selectedClient.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Added On</p>
                <p className="font-medium">{format(new Date(selectedClient.created_at), 'MMMM dd, yyyy')}</p>
              </div>
            </div>
            {selectedClient.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-sm">{selectedClient.notes}</p>
              </div>
            )}
            {selectedClient.special_instructions && (
              <div>
                <p className="text-sm text-muted-foreground">Special Instructions</p>
                <p className="text-sm">{selectedClient.special_instructions}</p>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Client' : 'New Client'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Client name"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="General notes about the client..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Special Instructions</Label>
              <Textarea
                value={formData.special_instructions}
                onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                placeholder="Any special requests or preferences..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="btn-fade">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editMode ? 'Update' : 'Create'} Client
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
