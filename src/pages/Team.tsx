import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ShimmerList } from '@/components/ui/ShimmerLoader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { DetailModal } from '@/components/ui/DetailModal';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { UserCog, Plus, Search, Mail, Phone, Loader2, Calendar, Clock, History } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { format, isPast, isFuture } from 'date-fns';

type TeamMember = Database['public']['Tables']['team_members']['Row'];
type MemberType = Database['public']['Enums']['team_member_type'];
type EmploymentType = Database['public']['Enums']['employment_type'];

interface BookingHistory {
  id: string;
  event_type: string;
  event_date: string;
  status: string;
  client_name: string | null;
}

const memberTypes: { value: MemberType; label: string }[] = [
  { value: 'photographer', label: 'Photographer' },
  { value: 'videographer', label: 'Videographer' },
  { value: 'editor', label: 'Editor' },
  { value: 'drone_operator', label: 'Drone Operator' },
  { value: 'other', label: 'Other' },
];

const employmentTypes: { value: EmploymentType; label: string }[] = [
  { value: 'in_house', label: 'In-House' },
  { value: 'freelance', label: 'Freelance' },
];

export default function Team() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberBookings, setMemberBookings] = useState<BookingHistory[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    member_type: 'photographer' as MemberType,
    employment_type: 'in_house' as EmploymentType,
    is_available: true,
  });

  useEffect(() => {
    if (user) fetchTeamMembers();
  }, [user]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsFormOpen(true);
      setEditMode(false);
      resetForm();
      setSearchParams({});
    }
  }, [searchParams]);

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberBookings = async (memberId: string) => {
    setLoadingBookings(true);
    try {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('booking_team')
        .select('booking_id')
        .eq('team_member_id', memberId);

      if (assignmentsError) throw assignmentsError;

      if (assignments && assignments.length > 0) {
        const bookingIds = assignments.map((a) => a.booking_id);
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            event_type,
            event_date,
            status,
            client:clients(name)
          `)
          .in('id', bookingIds)
          .order('event_date', { ascending: false });

        if (bookingsError) throw bookingsError;

        setMemberBookings(
          (bookings || []).map((b: any) => ({
            id: b.id,
            event_type: b.event_type,
            event_date: b.event_date,
            status: b.status,
            client_name: b.client?.name || null,
          }))
        );
      } else {
        setMemberBookings([]);
      }
    } catch (error) {
      console.error('Error fetching member bookings:', error);
      setMemberBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      member_type: 'photographer',
      employment_type: 'in_house',
      is_available: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const memberData = {
        owner_id: user.id,
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        member_type: formData.member_type,
        employment_type: formData.employment_type,
        is_available: formData.is_available,
      };

      if (editMode && selectedMember) {
        const { error } = await supabase
          .from('team_members')
          .update(memberData)
          .eq('id', selectedMember.id);
        if (error) throw error;
        toast.success('Team member updated successfully');
      } else {
        const { error } = await supabase.from('team_members').insert(memberData);
        if (error) throw error;
        toast.success('Team member added successfully');
      }

      setIsFormOpen(false);
      setIsDetailOpen(false);
      fetchTeamMembers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save team member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMember) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', selectedMember.id);
      if (error) throw error;
      toast.success('Team member removed successfully');
      setIsDetailOpen(false);
      fetchTeamMembers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete team member');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    if (selectedMember) {
      setFormData({
        name: selectedMember.name,
        phone: selectedMember.phone || '',
        email: selectedMember.email || '',
        member_type: selectedMember.member_type,
        employment_type: selectedMember.employment_type,
        is_available: selectedMember.is_available ?? true,
      });
      setEditMode(true);
      setIsDetailOpen(false);
      setIsFormOpen(true);
    }
  };

  const openDetail = async (member: TeamMember) => {
    setSelectedMember(member);
    setIsDetailOpen(true);
    await fetchMemberBookings(member.id);
  };

  const filteredMembers = teamMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const upcomingBookings = memberBookings.filter((b) => isFuture(new Date(b.event_date)));
  const pastBookings = memberBookings.filter((b) => isPast(new Date(b.event_date)));

  return (
    <MainLayout title="Team" subtitle="Manage your team members">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { resetForm(); setEditMode(false); setIsFormOpen(true); }} className="btn-fade">
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <ShimmerList count={5} />
      ) : filteredMembers.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No team members found"
          description={searchQuery ? 'Try adjusting your search' : 'Add your first team member'}
          action={!searchQuery ? { label: 'Add Member', onClick: () => setIsFormOpen(true) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="zoho-card p-4 cursor-pointer hover:shadow-zoho-md transition-shadow"
              onClick={() => openDetail(member)}
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-full bg-primary/10">
                  <UserCog className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">{member.name}</p>
                    <span className={`w-2 h-2 rounded-full ${member.is_available ? 'bg-success' : 'bg-muted-foreground'}`} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {memberTypes.find((t) => t.value === member.member_type)?.label}
                  </p>
                  {member.email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className={`text-xs px-2 py-1 rounded ${member.employment_type === 'in_house' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}`}>
                  {employmentTypes.find((t) => t.value === member.employment_type)?.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <DetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title={selectedMember?.name || 'Team Member Details'}
        description={selectedMember ? memberTypes.find((t) => t.value === selectedMember.member_type)?.label : ''}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      >
        {selectedMember && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{selectedMember.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{selectedMember.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employment</p>
                <p className="font-medium">{employmentTypes.find((t) => t.value === selectedMember.employment_type)?.label}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Availability</p>
                <p className="font-medium">{selectedMember.is_available ? 'Available' : 'Unavailable'}</p>
              </div>
            </div>

            {/* Booking History */}
            <div className="border-t border-border pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Booking Schedule
              </h4>

              {loadingBookings ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : memberBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookings assigned yet</p>
              ) : (
                <div className="space-y-4">
                  {/* Upcoming */}
                  {upcomingBookings.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Upcoming ({upcomingBookings.length})
                      </h5>
                      <div className="space-y-2">
                        {upcomingBookings.slice(0, 5).map((booking) => (
                          <div
                            key={booking.id}
                            className="p-2 rounded-lg bg-primary/5 border border-primary/10"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">
                                  {booking.client_name || 'Walk-in Client'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {booking.event_type.replace(/_/g, ' ')} • {format(new Date(booking.event_date), 'MMM dd, yyyy')}
                                </p>
                              </div>
                              <StatusBadge status={booking.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Past */}
                  {pastBookings.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <History className="h-3 w-3" />
                        History ({pastBookings.length})
                      </h5>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {pastBookings.slice(0, 10).map((booking) => (
                          <div
                            key={booking.id}
                            className="p-2 rounded-lg bg-secondary/50"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">
                                  {booking.client_name || 'Walk-in Client'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {booking.event_type.replace(/_/g, ' ')} • {format(new Date(booking.event_date), 'MMM dd, yyyy')}
                                </p>
                              </div>
                              <StatusBadge status={booking.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </DetailModal>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Team Member' : 'New Team Member'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Team member name"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select
                  value={formData.member_type}
                  onValueChange={(v) => setFormData({ ...formData, member_type: v as MemberType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {memberTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.employment_type}
                  onValueChange={(v) => setFormData({ ...formData, employment_type: v as EmploymentType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {employmentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_available}
                onCheckedChange={(v) => setFormData({ ...formData, is_available: v })}
              />
              <Label>Available for assignments</Label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="btn-fade">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editMode ? 'Update' : 'Add'} Member
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
