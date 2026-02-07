import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ShimmerList } from '@/components/ui/ShimmerLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DetailModal } from '@/components/ui/DetailModal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Link2,
  Plus,
  Search,
  Copy,
  Clock,
  Users,
  FolderOpen,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { format, formatDistanceToNow, addHours, isPast } from 'date-fns';

interface TemporaryAccess {
  id: string;
  access_token: string;
  access_password: string | null;
  expires_at: string;
  is_active: boolean | null;
  max_selections: number | null;
  watermark_enabled: boolean | null;
  download_disabled: boolean | null;
  client_name: string | null;
  client_email: string | null;
  last_accessed_at: string | null;
  created_at: string;
  folder: { id: string; name: string } | null;
  booking: { id: string; event_type: string; event_date: string } | null;
}

interface MediaFolder {
  id: string;
  name: string;
  booking_id: string | null;
}

interface Booking {
  id: string;
  event_type: string;
  event_date: string;
  client: { name: string } | null;
}

interface SelectionStats {
  total: number;
  selected: number;
}

export default function Selection() {
  const [loading, setLoading] = useState(true);
  const [accessLinks, setAccessLinks] = useState<TemporaryAccess[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState<TemporaryAccess | null>(null);
  const [selectionStats, setSelectionStats] = useState<SelectionStats | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    folder_id: '',
    booking_id: '',
    client_name: '',
    client_email: '',
    expiry_hours: 48,
    max_selections: 0,
    watermark_enabled: true,
    download_disabled: true,
    access_password: '',
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [accessRes, foldersRes, bookingsRes] = await Promise.all([
        supabase
          .from('temporary_access')
          .select(`
            *,
            folder:media_folders(id, name),
            booking:bookings(id, event_type, event_date)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('media_folders').select('id, name, booking_id'),
        supabase
          .from('bookings')
          .select(`id, event_type, event_date, client:clients(name)`)
          .order('event_date', { ascending: false }),
      ]);

      if (accessRes.data) setAccessLinks(accessRes.data as TemporaryAccess[]);
      if (foldersRes.data) setFolders(foldersRes.data);
      if (bookingsRes.data) setBookings(bookingsRes.data as Booking[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectionStats = async (folderId: string) => {
    const { data } = await supabase
      .from('media_files')
      .select('id, is_selected')
      .eq('folder_id', folderId);

    if (data) {
      setSelectionStats({
        total: data.length,
        selected: data.filter((f) => f.is_selected).length,
      });
    }
  };

  const generateAccessToken = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const accessToken = generateAccessToken();
      const expiresAt = addHours(new Date(), formData.expiry_hours);

      const { error } = await supabase.from('temporary_access').insert({
        owner_id: user.id,
        folder_id: formData.folder_id,
        booking_id: formData.booking_id || null,
        access_token: accessToken,
        access_password: formData.access_password || null,
        expires_at: expiresAt.toISOString(),
        max_selections: formData.max_selections > 0 ? formData.max_selections : null,
        watermark_enabled: formData.watermark_enabled,
        download_disabled: formData.download_disabled,
        client_name: formData.client_name || null,
        client_email: formData.client_email || null,
      });

      if (error) throw error;
      toast.success('Access link created successfully');
      setIsFormOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create access link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      folder_id: '',
      booking_id: '',
      client_name: '',
      client_email: '',
      expiry_hours: 48,
      max_selections: 0,
      watermark_enabled: true,
      download_disabled: true,
      access_password: '',
    });
  };

  const handleDelete = async () => {
    if (!selectedAccess) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('temporary_access')
        .delete()
        .eq('id', selectedAccess.id);

      if (error) throw error;
      toast.success('Access link deleted successfully');
      setIsDetailOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete access link');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleActive = async (access: TemporaryAccess) => {
    try {
      const { error } = await supabase
        .from('temporary_access')
        .update({ is_active: !access.is_active })
        .eq('id', access.id);

      if (error) throw error;
      toast.success(access.is_active ? 'Access link deactivated' : 'Access link activated');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update access link');
    }
  };

  const copyAccessLink = (token: string) => {
    const url = `${window.location.origin}/client-select/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Access link copied to clipboard');
  };

  const openDetail = async (access: TemporaryAccess) => {
    setSelectedAccess(access);
    setIsDetailOpen(true);
    if (access.folder?.id) {
      await fetchSelectionStats(access.folder.id);
    }
  };

  const getAccessStatus = (access: TemporaryAccess) => {
    if (!access.is_active) return 'inactive';
    if (isPast(new Date(access.expires_at))) return 'expired';
    return 'active';
  };

  const filteredLinks = accessLinks.filter(
    (link) =>
      link.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.folder?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout title="Client Selection" subtitle="Create temporary access links for clients">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client or folder..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { resetForm(); setIsFormOpen(true); }} className="btn-fade">
          <Plus className="h-4 w-4 mr-2" />
          Create Access Link
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <ShimmerList count={5} />
      ) : filteredLinks.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No access links yet"
          description="Create temporary access links for clients to select their photos"
          action={{ label: 'Create Access Link', onClick: () => setIsFormOpen(true) }}
        />
      ) : (
        <div className="space-y-3">
          {filteredLinks.map((access) => {
            const status = getAccessStatus(access);
            const isExpired = status === 'expired';
            const isInactive = status === 'inactive';

            return (
              <div
                key={access.id}
                className={`zoho-card p-4 cursor-pointer hover:shadow-zoho-md transition-shadow ${
                  isExpired || isInactive ? 'opacity-60' : ''
                }`}
                onClick={() => openDetail(access)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg ${
                      status === 'active' ? 'bg-success/10' : 'bg-muted'
                    }`}>
                      <Link2 className={`h-5 w-5 ${
                        status === 'active' ? 'text-success' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {access.client_name || 'Unnamed Client'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FolderOpen className="h-3 w-3" />
                        {access.folder?.name || 'Unknown Folder'}
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        {isExpired
                          ? 'Expired'
                          : `Expires ${formatDistanceToNow(new Date(access.expires_at), { addSuffix: true })}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge
                      status={status}
                      customLabels={{ active: 'Active', inactive: 'Inactive', expired: 'Expired' }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyAccessLink(access.access_token);
                      }}
                      disabled={isExpired || isInactive}
                      className="btn-fade"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <DetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title={selectedAccess?.client_name || 'Access Link Details'}
        description={selectedAccess?.folder?.name}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      >
        {selectedAccess && (
          <div className="space-y-6">
            {/* Status & Actions */}
            <div className="flex items-center justify-between">
              <StatusBadge
                status={getAccessStatus(selectedAccess)}
                customLabels={{ active: 'Active', inactive: 'Inactive', expired: 'Expired' }}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyAccessLink(selectedAccess.access_token)}
                  className="btn-fade"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleActive(selectedAccess)}
                  className="btn-fade"
                >
                  {selectedAccess.is_active ? (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Selection Progress */}
            {selectionStats && (
              <div className="zoho-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Selection Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {selectionStats.selected} / {selectionStats.total} selected
                  </span>
                </div>
                <Progress
                  value={
                    selectionStats.total > 0
                      ? (selectionStats.selected / selectionStats.total) * 100
                      : 0
                  }
                  className="h-2"
                />
                {selectedAccess.max_selections && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Max selections allowed: {selectedAccess.max_selections}
                  </p>
                )}
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Client Email</p>
                <p className="font-medium">{selectedAccess.client_email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {format(new Date(selectedAccess.created_at), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expires</p>
                <p className="font-medium">
                  {format(new Date(selectedAccess.expires_at), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Accessed</p>
                <p className="font-medium">
                  {selectedAccess.last_accessed_at
                    ? format(new Date(selectedAccess.last_accessed_at), 'MMM dd, yyyy HH:mm')
                    : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Watermark</p>
                <p className="font-medium">
                  {selectedAccess.watermark_enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Download</p>
                <p className="font-medium">
                  {selectedAccess.download_disabled ? 'Disabled' : 'Enabled'}
                </p>
              </div>
            </div>

            {/* Access Link */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Access Link</p>
              <div className="flex items-center gap-2">
                <Input
                  value={`${window.location.origin}/client-select/${selectedAccess.access_token}`}
                  readOnly
                  className="text-xs"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyAccessLink(selectedAccess.access_token)}
                  className="btn-fade"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {selectedAccess.access_password && (
                <p className="text-xs text-muted-foreground mt-2">
                  Password: <span className="font-mono">{selectedAccess.access_password}</span>
                </p>
              )}
            </div>
          </div>
        )}
      </DetailModal>

      {/* Create Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Temporary Access Link</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Select Folder *</Label>
              <Select
                value={formData.folder_id}
                onValueChange={(v) => setFormData({ ...formData, folder_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a folder" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Link to Booking (Optional)</Label>
              <Select
                value={formData.booking_id || "none"}
                onValueChange={(v) => setFormData({ ...formData, booking_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a booking" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {bookings.map((booking) => (
                    <SelectItem key={booking.id} value={booking.id}>
                      {booking.client?.name || 'Unknown'} -{' '}
                      {format(new Date(booking.event_date), 'MMM dd, yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Client Email</Label>
                <Input
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expires After (hours)</Label>
                <Select
                  value={formData.expiry_hours.toString()}
                  onValueChange={(v) => setFormData({ ...formData, expiry_hours: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                    <SelectItem value="72">72 hours</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Selections (0 = unlimited)</Label>
                <Input
                  type="number"
                  value={formData.max_selections}
                  onChange={(e) =>
                    setFormData({ ...formData, max_selections: parseInt(e.target.value) || 0 })
                  }
                  min={0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Access Password (Optional)</Label>
              <Input
                value={formData.access_password}
                onChange={(e) => setFormData({ ...formData, access_password: e.target.value })}
                placeholder="Leave blank for no password"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.watermark_enabled}
                  onCheckedChange={(v) => setFormData({ ...formData, watermark_enabled: v })}
                />
                <Label>Enable Watermark</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.download_disabled}
                  onCheckedChange={(v) => setFormData({ ...formData, download_disabled: v })}
                />
                <Label>Disable Download</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.folder_id} className="btn-fade">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Access Link
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
