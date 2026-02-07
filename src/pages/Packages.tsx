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
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Package, Plus, Search, Camera, Video, Plane, Loader2 } from 'lucide-react';

interface PackageData {
  id: string;
  name: string;
  description: string | null;
  photos_count: number | null;
  videos_count: number | null;
  reels_count: number | null;
  drone_included: boolean | null;
  album_size: string | null;
  base_price: number;
  is_active: boolean | null;
  created_at: string;
}

export default function Packages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    photos_count: 0,
    videos_count: 0,
    reels_count: 0,
    drone_included: false,
    album_size: '',
    base_price: 0,
    is_active: true,
  });

  useEffect(() => {
    if (user) fetchPackages();
  }, [user]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsFormOpen(true);
      setEditMode(false);
      resetForm();
      setSearchParams({});
    }
  }, [searchParams]);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      photos_count: 0,
      videos_count: 0,
      reels_count: 0,
      drone_included: false,
      album_size: '',
      base_price: 0,
      is_active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const packageData = {
        owner_id: user.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        photos_count: formData.photos_count,
        videos_count: formData.videos_count,
        reels_count: formData.reels_count,
        drone_included: formData.drone_included,
        album_size: formData.album_size.trim() || null,
        base_price: formData.base_price,
        is_active: formData.is_active,
      };

      if (editMode && selectedPackage) {
        const { error } = await supabase
          .from('packages')
          .update(packageData)
          .eq('id', selectedPackage.id);
        if (error) throw error;
        toast.success('Package updated successfully');
      } else {
        const { error } = await supabase.from('packages').insert(packageData);
        if (error) throw error;
        toast.success('Package created successfully');
      }

      setIsFormOpen(false);
      setIsDetailOpen(false);
      fetchPackages();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save package');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPackage) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', selectedPackage.id);
      if (error) throw error;
      toast.success('Package deleted successfully');
      setIsDetailOpen(false);
      fetchPackages();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete package');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    if (selectedPackage) {
      setFormData({
        name: selectedPackage.name,
        description: selectedPackage.description || '',
        photos_count: selectedPackage.photos_count || 0,
        videos_count: selectedPackage.videos_count || 0,
        reels_count: selectedPackage.reels_count || 0,
        drone_included: selectedPackage.drone_included || false,
        album_size: selectedPackage.album_size || '',
        base_price: Number(selectedPackage.base_price),
        is_active: selectedPackage.is_active ?? true,
      });
      setEditMode(true);
      setIsDetailOpen(false);
      setIsFormOpen(true);
    }
  };

  const filteredPackages = packages.filter((pkg) =>
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout title="Packages" subtitle="Manage your service packages">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { resetForm(); setEditMode(false); setIsFormOpen(true); }} className="btn-fade">
          <Plus className="h-4 w-4 mr-2" />
          Add Package
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <ShimmerList count={5} />
      ) : filteredPackages.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No packages found"
          description={searchQuery ? 'Try adjusting your search' : 'Create your first package to get started'}
          action={!searchQuery ? { label: 'Add Package', onClick: () => setIsFormOpen(true) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="zoho-card p-5 cursor-pointer hover:shadow-zoho-md transition-shadow"
              onClick={() => { setSelectedPackage(pkg); setIsDetailOpen(true); }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${pkg.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {pkg.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h3 className="font-semibold text-foreground mb-1">{pkg.name}</h3>
              {pkg.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{pkg.description}</p>
              )}
              <div className="flex flex-wrap gap-2 mb-3">
                {(pkg.photos_count ?? 0) > 0 && (
                  <span className="text-xs px-2 py-1 bg-secondary rounded flex items-center gap-1">
                    <Camera className="h-3 w-3" />
                    {pkg.photos_count} photos
                  </span>
                )}
                {(pkg.videos_count ?? 0) > 0 && (
                  <span className="text-xs px-2 py-1 bg-secondary rounded flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    {pkg.videos_count} videos
                  </span>
                )}
                {pkg.drone_included && (
                  <span className="text-xs px-2 py-1 bg-secondary rounded flex items-center gap-1">
                    <Plane className="h-3 w-3" />
                    Drone
                  </span>
                )}
              </div>
              <p className="text-xl font-bold text-primary">
                ₹{Number(pkg.base_price).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <DetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title={selectedPackage?.name || 'Package Details'}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      >
        {selectedPackage && (
          <div className="space-y-4">
            <div className="text-3xl font-bold text-primary">
              ₹{Number(selectedPackage.base_price).toLocaleString()}
            </div>
            {selectedPackage.description && (
              <p className="text-muted-foreground">{selectedPackage.description}</p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Photos</p>
                <p className="font-medium">{selectedPackage.photos_count || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Videos</p>
                <p className="font-medium">{selectedPackage.videos_count || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reels</p>
                <p className="font-medium">{selectedPackage.reels_count || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Drone</p>
                <p className="font-medium">{selectedPackage.drone_included ? 'Included' : 'Not included'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Album Size</p>
                <p className="font-medium">{selectedPackage.album_size || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">{selectedPackage.is_active ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
          </div>
        )}
      </DetailModal>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Package' : 'New Package'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Package Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Premium Wedding Package"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Package details..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Base Price (₹) *</Label>
              <Input
                type="number"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                min={0}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Photos</Label>
                <Input
                  type="number"
                  value={formData.photos_count}
                  onChange={(e) => setFormData({ ...formData, photos_count: Number(e.target.value) })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>Videos</Label>
                <Input
                  type="number"
                  value={formData.videos_count}
                  onChange={(e) => setFormData({ ...formData, videos_count: Number(e.target.value) })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>Reels</Label>
                <Input
                  type="number"
                  value={formData.reels_count}
                  onChange={(e) => setFormData({ ...formData, reels_count: Number(e.target.value) })}
                  min={0}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Album Size</Label>
              <Input
                value={formData.album_size}
                onChange={(e) => setFormData({ ...formData, album_size: e.target.value })}
                placeholder="e.g., 12x36 inches, 40 pages"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.drone_included}
                  onCheckedChange={(v) => setFormData({ ...formData, drone_included: v })}
                />
                <Label>Drone Included</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
                <Label>Active</Label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="btn-fade">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editMode ? 'Update' : 'Create'} Package
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
