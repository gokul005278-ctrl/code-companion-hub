import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ShimmerCard } from '@/components/ui/ShimmerLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeadCaptureWidget } from '@/components/settings/LeadCaptureWidget';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { User, Building, Bell, Shield, Loader2, Save, Camera, Code, LogOut } from 'lucide-react';

interface Profile {
  id: string; user_id: string; full_name: string | null;
  studio_name: string | null; phone: string | null; avatar_url: string | null;
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const { user, signOut } = useAuth();

  const [profileData, setProfileData] = useState({ full_name: '', studio_name: '', phone: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [notificationSettings, setNotificationSettings] = useState({
    email_bookings: true, email_payments: true, email_selections: true, browser_notifications: false,
  });

  useEffect(() => { if (user) fetchProfile(); }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user?.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setProfile(data);
        setProfileData({ full_name: data.full_name || '', studio_name: data.studio_name || '', phone: data.phone || '' });
      }
    } catch (error) { console.error('Error fetching profile:', error); }
    finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (profile) {
        const { error } = await supabase.from('profiles').update({
          full_name: profileData.full_name.trim() || null,
          studio_name: profileData.studio_name.trim() || null,
          phone: profileData.phone.trim() || null,
        }).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('profiles').insert({
          user_id: user.id, full_name: profileData.full_name.trim() || null,
          studio_name: profileData.studio_name.trim() || null, phone: profileData.phone.trim() || null,
        });
        if (error) throw error;
      }
      toast.success('Profile updated'); fetchProfile();
    } catch (error: any) { toast.error(error.message || 'Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setSaving(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('user_id', user.id);
      if (updateError) throw updateError;
      toast.success('Avatar updated'); fetchProfile();
    } catch (error: any) { toast.error(error.message || 'Failed to upload avatar'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword) {
      toast.error('Current password is required'); return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters'); return;
    }
    setChangingPassword(true);
    try {
      // First verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.currentPassword,
      });
      if (signInError) {
        toast.error('Current password is incorrect');
        return;
      }
      // Then update password
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;
      toast.success('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) { toast.error(error.message || 'Failed to update password'); }
    finally { setChangingPassword(false); }
  };

  const handleSignOutAllDevices = async () => {
    setSigningOutAll(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      toast.success('Signed out from all devices');
    } catch (error: any) { toast.error(error.message || 'Failed to sign out'); }
    finally { setSigningOutAll(false); }
  };

  return (
    <MainLayout title="Settings" subtitle="Configure your studio preferences">
      {loading ? (
        <div className="max-w-3xl space-y-4"><ShimmerCard /><ShimmerCard /></div>
      ) : (
        <div className="max-w-3xl">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" /><span className="hidden sm:inline">Profile</span></TabsTrigger>
              <TabsTrigger value="studio" className="gap-2"><Building className="h-4 w-4" /><span className="hidden sm:inline">Studio</span></TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" /><span className="hidden sm:inline">Alerts</span></TabsTrigger>
              <TabsTrigger value="leads" className="gap-2"><Code className="h-4 w-4" /><span className="hidden sm:inline">Widget</span></TabsTrigger>
              <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /><span className="hidden sm:inline">Security</span></TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <div className="zoho-card p-6">
                <h3 className="text-lg font-semibold mb-6">Personal Information</h3>
                <div className="flex items-center gap-6 mb-6">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" /> : <User className="h-8 w-8 text-primary" />}
                    </div>
                    <label className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors">
                      <Camera className="h-4 w-4" />
                      <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} disabled={saving} />
                    </label>
                  </div>
                  <div>
                    <p className="font-medium">{profileData.full_name || 'Your Name'}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <div className="grid gap-4">
                  <div className="space-y-2"><Label>Full Name</Label><Input value={profileData.full_name} onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })} placeholder="Your full name" /></div>
                  <div className="space-y-2"><Label>Phone Number</Label><Input value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} placeholder="+91 98765 43210" /></div>
                  <div className="space-y-2"><Label>Email</Label><Input value={user?.email || ''} disabled className="bg-muted" /><p className="text-xs text-muted-foreground">Email cannot be changed from here</p></div>
                </div>
                <div className="flex justify-end mt-6">
                  <Button onClick={handleSaveProfile} disabled={saving} className="btn-fade">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save Changes</Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="studio" className="space-y-6">
              <div className="zoho-card p-6">
                <h3 className="text-lg font-semibold mb-6">Studio Details</h3>
                <div className="grid gap-4">
                  <div className="space-y-2"><Label>Studio Name</Label><Input value={profileData.studio_name} onChange={(e) => setProfileData({ ...profileData, studio_name: e.target.value })} placeholder="Your studio name" /></div>
                  <div className="space-y-2"><Label>Business Address</Label><Input placeholder="Street address" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>City</Label><Input placeholder="City" /></div>
                    <div className="space-y-2"><Label>PIN Code</Label><Input placeholder="123456" /></div>
                  </div>
                  <div className="space-y-2"><Label>GSTIN (Optional)</Label><Input placeholder="22AAAAA0000A1Z5" /><p className="text-xs text-muted-foreground">Required for GST-compliant invoices</p></div>
                  <div className="space-y-2"><Label>PAN Number</Label><Input placeholder="ABCDE1234F" /></div>
                  <div className="space-y-2"><Label>SAC Code</Label><Input placeholder="998397" defaultValue="998397" /><p className="text-xs text-muted-foreground">Photography services SAC code</p></div>
                </div>
                <div className="flex justify-end mt-6">
                  <Button onClick={handleSaveProfile} disabled={saving} className="btn-fade">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save Changes</Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <div className="zoho-card p-6">
                <h3 className="text-lg font-semibold mb-6">Email Notifications</h3>
                <div className="space-y-4">
                  {[
                    { key: 'email_bookings', title: 'Booking Updates', desc: 'New bookings and status changes' },
                    { key: 'email_payments', title: 'Payment Alerts', desc: 'Payment reminders and receipts' },
                    { key: 'email_selections', title: 'Client Selections', desc: 'When clients make photo selections' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.desc}</p></div>
                      <Switch checked={(notificationSettings as any)[item.key]} onCheckedChange={(v) => setNotificationSettings({ ...notificationSettings, [item.key]: v })} />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="leads" className="space-y-6">
              <div className="zoho-card p-6"><LeadCaptureWidget /></div>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <div className="zoho-card p-6">
                <h3 className="text-lg font-semibold mb-6">Change Password</h3>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Current Password *</Label>
                    <Input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} placeholder="••••••••" autoComplete="current-password" data-form-type="other" />
                  </div>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} placeholder="••••••••" autoComplete="new-password" data-form-type="other" />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm New Password</Label>
                    <Input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} placeholder="••••••••" autoComplete="new-password" data-form-type="other" />
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <Button onClick={handleChangePassword} disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword} className="btn-fade">
                    {changingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Update Password
                  </Button>
                </div>
              </div>

              <div className="zoho-card p-6">
                <h3 className="text-lg font-semibold mb-4">Sessions</h3>
                <p className="text-sm text-muted-foreground mb-4">Sign out from all devices including this one. You will need to log in again.</p>
                <Button variant="outline" onClick={handleSignOutAllDevices} disabled={signingOutAll} className="btn-fade">
                  {signingOutAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
                  Sign Out All Devices
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </MainLayout>
  );
}
