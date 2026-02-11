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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Package, Plus, Search, Camera, Video, Plane, Loader2, Heart, Film, Users, Book, Trash2, Edit3, Puzzle } from 'lucide-react';

interface PackageData {
  id: string;
  name: string;
  description: string | null;
  photos_count: number | null;
  videos_count: number | null;
  reels_count: number | null;
  drone_included: boolean | null;
  candid_included: boolean | null;
  traditional_included: boolean | null;
  pre_wedding_included: boolean | null;
  album_size: string | null;
  album_pages: number | null;
  delivery_days: number | null;
  base_price: number;
  is_active: boolean | null;
  highlights: string[] | null;
  inclusions: string[] | null;
  exclusions: string[] | null;
  created_at: string;
}

interface AddonData {
  id: string;
  name: string;
  description: string | null;
  default_price: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

export default function Packages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [addons, setAddons] = useState<AddonData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddonFormOpen, setIsAddonFormOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(null);
  const [selectedAddon, setSelectedAddon] = useState<AddonData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [addonEditMode, setAddonEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('packages');
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '', description: '', photos_count: 0, videos_count: 0, reels_count: 0,
    drone_included: false, candid_included: true, traditional_included: true,
    pre_wedding_included: false, album_size: '', album_pages: 0, delivery_days: 30,
    base_price: 0, is_active: true, highlights: '', inclusions: '', exclusions: '',
  });

  const [addonFormData, setAddonFormData] = useState({
    name: '', description: '', default_price: 0, is_active: true,
  });

  useEffect(() => {
    if (user) { fetchPackages(); fetchAddons(); }
  }, [user]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsFormOpen(true); setEditMode(false); resetForm(); setSearchParams({});
    }
  }, [searchParams]);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase.from('packages').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setPackages(data || []);
    } catch (error) { console.error('Error fetching packages:', error); }
    finally { setLoading(false); }
  };

  const fetchAddons = async () => {
    const { data } = await supabase.from('package_addons').select('*').order('created_at', { ascending: false });
    setAddons(data || []);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', photos_count: 0, videos_count: 0, reels_count: 0, drone_included: false, candid_included: true, traditional_included: true, pre_wedding_included: false, album_size: '', album_pages: 0, delivery_days: 30, base_price: 0, is_active: true, highlights: '', inclusions: '', exclusions: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const packageData = {
        owner_id: user.id, name: formData.name.trim(), description: formData.description.trim() || null,
        photos_count: formData.photos_count, videos_count: formData.videos_count, reels_count: formData.reels_count,
        drone_included: formData.drone_included, candid_included: formData.candid_included,
        traditional_included: formData.traditional_included, pre_wedding_included: formData.pre_wedding_included,
        album_size: formData.album_size.trim() || null, album_pages: formData.album_pages,
        delivery_days: formData.delivery_days, base_price: formData.base_price, is_active: formData.is_active,
        highlights: formData.highlights ? formData.highlights.split('\n').filter(Boolean) : null,
        inclusions: formData.inclusions ? formData.inclusions.split('\n').filter(Boolean) : null,
        exclusions: formData.exclusions ? formData.exclusions.split('\n').filter(Boolean) : null,
      };

      if (editMode && selectedPackage) {
        const { error } = await supabase.from('packages').update(packageData).eq('id', selectedPackage.id);
        if (error) throw error;
        toast.success('Package updated');
      } else {
        const { error } = await supabase.from('packages').insert(packageData);
        if (error) throw error;
        toast.success('Package created');
      }
      setIsFormOpen(false); setIsDetailOpen(false); fetchPackages();
    } catch (error: any) { toast.error(error.message || 'Failed to save package'); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedPackage) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('packages').delete().eq('id', selectedPackage.id);
      if (error) throw error;
      toast.success('Package deleted'); setIsDetailOpen(false); fetchPackages();
    } catch (error: any) { toast.error(error.message || 'Failed to delete package'); }
    finally { setIsDeleting(false); }
  };

  const handleEdit = () => {
    if (selectedPackage) {
      setFormData({
        name: selectedPackage.name, description: selectedPackage.description || '',
        photos_count: selectedPackage.photos_count || 0, videos_count: selectedPackage.videos_count || 0,
        reels_count: selectedPackage.reels_count || 0, drone_included: selectedPackage.drone_included || false,
        candid_included: selectedPackage.candid_included ?? true, traditional_included: selectedPackage.traditional_included ?? true,
        pre_wedding_included: selectedPackage.pre_wedding_included || false, album_size: selectedPackage.album_size || '',
        album_pages: selectedPackage.album_pages || 0, delivery_days: selectedPackage.delivery_days || 30,
        base_price: Number(selectedPackage.base_price), is_active: selectedPackage.is_active ?? true,
        highlights: selectedPackage.highlights?.join('\n') || '', inclusions: selectedPackage.inclusions?.join('\n') || '',
        exclusions: selectedPackage.exclusions?.join('\n') || '',
      });
      setEditMode(true); setIsDetailOpen(false); setIsFormOpen(true);
    }
  };

  // Addon CRUD
  const handleAddonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const data = {
        owner_id: user.id,
        name: addonFormData.name.trim(),
        description: addonFormData.description.trim() || null,
        default_price: addonFormData.default_price,
        is_active: addonFormData.is_active,
      };
      if (addonEditMode && selectedAddon) {
        const { error } = await supabase.from('package_addons').update(data).eq('id', selectedAddon.id);
        if (error) throw error;
        toast.success('Add-on updated');
      } else {
        const { error } = await supabase.from('package_addons').insert(data);
        if (error) throw error;
        toast.success('Add-on created');
      }
      setIsAddonFormOpen(false); fetchAddons();
    } catch (error: any) { toast.error(error.message || 'Failed to save add-on'); }
    finally { setIsSubmitting(false); }
  };

  const deleteAddon = async (id: string) => {
    if (!confirm('Delete this add-on?')) return;
    const { error } = await supabase.from('package_addons').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Add-on deleted'); fetchAddons();
  };

  const filteredPackages = packages.filter((pkg) => pkg.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredAddons = addons.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <MainLayout title="Packages & Add-ons" subtitle="Manage your service packages and add-ons">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList>
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="addons">Add-ons</TabsTrigger>
          </TabsList>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            {activeTab === 'packages' ? (
              <Button onClick={() => { resetForm(); setEditMode(false); setIsFormOpen(true); }} className="btn-fade">
                <Plus className="h-4 w-4 mr-2" /> Add Package
              </Button>
            ) : (
              <Button onClick={() => { setAddonFormData({ name: '', description: '', default_price: 0, is_active: true }); setAddonEditMode(false); setIsAddonFormOpen(true); }} className="btn-fade">
                <Plus className="h-4 w-4 mr-2" /> Add Add-on
              </Button>
            )}
          </div>
        </div>

        {/* Packages Tab */}
        <TabsContent value="packages">
          {loading ? (
            <ShimmerList count={5} />
          ) : filteredPackages.length === 0 ? (
            <EmptyState icon={Package} title="No packages found"
              description={searchQuery ? 'Try adjusting your search' : 'Create your first package'}
              action={!searchQuery ? { label: 'Add Package', onClick: () => setIsFormOpen(true) } : undefined} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPackages.map((pkg) => (
                <div key={pkg.id} className="zoho-card p-5 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setSelectedPackage(pkg); setIsDetailOpen(true); }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-primary/10"><Package className="h-5 w-5 text-primary" /></div>
                    <span className={`text-xs px-2 py-1 rounded-full ${pkg.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{pkg.name}</h3>
                  {pkg.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{pkg.description}</p>}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(pkg.photos_count ?? 0) > 0 && (
                      <span className="text-xs px-2 py-1 bg-secondary rounded flex items-center gap-1"><Camera className="h-3 w-3" />{pkg.photos_count} photos</span>
                    )}
                    {(pkg.videos_count ?? 0) > 0 && (
                      <span className="text-xs px-2 py-1 bg-secondary rounded flex items-center gap-1"><Video className="h-3 w-3" />{pkg.videos_count} videos</span>
                    )}
                    {pkg.drone_included && (
                      <span className="text-xs px-2 py-1 bg-secondary rounded flex items-center gap-1"><Plane className="h-3 w-3" />Drone</span>
                    )}
                    {pkg.pre_wedding_included && (
                      <span className="text-xs px-2 py-1 bg-pink-500/10 text-pink-600 rounded flex items-center gap-1"><Heart className="h-3 w-3" />Pre-Wed</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-bold text-primary">₹{Number(pkg.base_price).toLocaleString()}</p>
                    {pkg.delivery_days && <span className="text-xs text-muted-foreground">{pkg.delivery_days} days delivery</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Add-ons Tab */}
        <TabsContent value="addons">
          {filteredAddons.length === 0 ? (
            <EmptyState icon={Puzzle} title="No add-ons found"
              description="Create reusable add-ons that can be attached to bookings"
              action={{ label: 'Add Add-on', onClick: () => setIsAddonFormOpen(true) }} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAddons.map((addon) => (
                <div key={addon.id} className="zoho-card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-info/10"><Puzzle className="h-5 w-5 text-info" /></div>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${addon.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {addon.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{addon.name}</h3>
                  {addon.description && <p className="text-sm text-muted-foreground mb-3">{addon.description}</p>}
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-primary">₹{Number(addon.default_price || 0).toLocaleString()}</p>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                        setSelectedAddon(addon);
                        setAddonFormData({ name: addon.name, description: addon.description || '', default_price: Number(addon.default_price || 0), is_active: addon.is_active ?? true });
                        setAddonEditMode(true); setIsAddonFormOpen(true);
                      }}><Edit3 className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteAddon(addon.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Package Detail Modal */}
      <DetailModal open={isDetailOpen} onOpenChange={setIsDetailOpen} title={selectedPackage?.name || 'Package Details'}
        onEdit={handleEdit} onDelete={handleDelete} isDeleting={isDeleting}>
        {selectedPackage && (
          <div className="space-y-4">
            <div className="text-3xl font-bold text-primary">₹{Number(selectedPackage.base_price).toLocaleString()}</div>
            {selectedPackage.description && <p className="text-muted-foreground">{selectedPackage.description}</p>}
            <div className="flex flex-wrap gap-2">
              {selectedPackage.candid_included && <span className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full">Candid</span>}
              {selectedPackage.traditional_included && <span className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full">Traditional</span>}
              {selectedPackage.pre_wedding_included && <span className="text-xs px-3 py-1.5 bg-pink-500/10 text-pink-600 rounded-full">Pre-Wedding</span>}
              {selectedPackage.drone_included && <span className="text-xs px-3 py-1.5 bg-cyan-500/10 text-cyan-600 rounded-full">Drone</span>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-muted-foreground">Photos</p><p className="font-medium">{selectedPackage.photos_count || 0}</p></div>
              <div><p className="text-sm text-muted-foreground">Videos</p><p className="font-medium">{selectedPackage.videos_count || 0}</p></div>
              <div><p className="text-sm text-muted-foreground">Reels</p><p className="font-medium">{selectedPackage.reels_count || 0}</p></div>
              <div><p className="text-sm text-muted-foreground">Delivery</p><p className="font-medium">{selectedPackage.delivery_days || 30} days</p></div>
              <div><p className="text-sm text-muted-foreground">Album Size</p><p className="font-medium">{selectedPackage.album_size || '-'}</p></div>
              <div><p className="text-sm text-muted-foreground">Album Pages</p><p className="font-medium">{selectedPackage.album_pages || 0}</p></div>
            </div>
            {selectedPackage.highlights && selectedPackage.highlights.length > 0 && (
              <div><p className="text-sm font-medium mb-2">Highlights</p><ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">{selectedPackage.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul></div>
            )}
            {selectedPackage.inclusions && selectedPackage.inclusions.length > 0 && (
              <div><p className="text-sm font-medium mb-2 text-success">Inclusions</p><ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">{selectedPackage.inclusions.map((inc, i) => <li key={i}>{inc}</li>)}</ul></div>
            )}
            {selectedPackage.exclusions && selectedPackage.exclusions.length > 0 && (
              <div><p className="text-sm font-medium mb-2 text-destructive">Exclusions</p><ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">{selectedPackage.exclusions.map((exc, i) => <li key={i}>{exc}</li>)}</ul></div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Package Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editMode ? 'Edit Package' : 'New Package'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Package Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Premium Wedding Package" required /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Package details..." rows={2} /></div>
            <div className="space-y-2"><Label>Base Price (₹) *</Label><Input type="number" value={formData.base_price} onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })} min={0} required /></div>
            <div className="space-y-3 p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">Photography Services</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2"><Switch checked={formData.candid_included} onCheckedChange={(v) => setFormData({ ...formData, candid_included: v })} /><Label className="text-sm">Candid</Label></div>
                <div className="flex items-center gap-2"><Switch checked={formData.traditional_included} onCheckedChange={(v) => setFormData({ ...formData, traditional_included: v })} /><Label className="text-sm">Traditional</Label></div>
                <div className="flex items-center gap-2"><Switch checked={formData.drone_included} onCheckedChange={(v) => setFormData({ ...formData, drone_included: v })} /><Label className="text-sm">Drone</Label></div>
                <div className="flex items-center gap-2"><Switch checked={formData.pre_wedding_included} onCheckedChange={(v) => setFormData({ ...formData, pre_wedding_included: v })} /><Label className="text-sm">Pre-Wedding</Label></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Photos</Label><Input type="number" value={formData.photos_count} onChange={(e) => setFormData({ ...formData, photos_count: Number(e.target.value) })} min={0} /></div>
              <div className="space-y-2"><Label>Videos</Label><Input type="number" value={formData.videos_count} onChange={(e) => setFormData({ ...formData, videos_count: Number(e.target.value) })} min={0} /></div>
              <div className="space-y-2"><Label>Reels</Label><Input type="number" value={formData.reels_count} onChange={(e) => setFormData({ ...formData, reels_count: Number(e.target.value) })} min={0} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Album Size</Label><Input value={formData.album_size} onChange={(e) => setFormData({ ...formData, album_size: e.target.value })} placeholder="12x36" /></div>
              <div className="space-y-2"><Label>Album Pages</Label><Input type="number" value={formData.album_pages} onChange={(e) => setFormData({ ...formData, album_pages: Number(e.target.value) })} min={0} /></div>
              <div className="space-y-2"><Label>Delivery Days</Label><Input type="number" value={formData.delivery_days} onChange={(e) => setFormData({ ...formData, delivery_days: Number(e.target.value) })} min={1} /></div>
            </div>
            <div className="space-y-2"><Label>Highlights (one per line)</Label><Textarea value={formData.highlights} onChange={(e) => setFormData({ ...formData, highlights: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Inclusions (one per line)</Label><Textarea value={formData.inclusions} onChange={(e) => setFormData({ ...formData, inclusions: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Exclusions (one per line)</Label><Textarea value={formData.exclusions} onChange={(e) => setFormData({ ...formData, exclusions: e.target.value })} rows={2} /></div>
            <div className="flex items-center gap-2"><Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} /><Label>Active</Label></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="btn-fade">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editMode ? 'Update' : 'Create'} Package
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add-on Form Dialog */}
      <Dialog open={isAddonFormOpen} onOpenChange={setIsAddonFormOpen}>
        <DialogContent className="max-w-sm mx-3">
          <DialogHeader><DialogTitle>{addonEditMode ? 'Edit Add-on' : 'New Add-on'}</DialogTitle></DialogHeader>
          <form onSubmit={handleAddonSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={addonFormData.name} onChange={(e) => setAddonFormData({ ...addonFormData, name: e.target.value })} placeholder="e.g., Extra Reel" required /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={addonFormData.description} onChange={(e) => setAddonFormData({ ...addonFormData, description: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Default Price (₹)</Label><Input type="number" value={addonFormData.default_price} onChange={(e) => setAddonFormData({ ...addonFormData, default_price: Number(e.target.value) })} min={0} /></div>
            <div className="flex items-center gap-2"><Switch checked={addonFormData.is_active} onCheckedChange={(v) => setAddonFormData({ ...addonFormData, is_active: v })} /><Label>Active</Label></div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsAddonFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{addonEditMode ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
