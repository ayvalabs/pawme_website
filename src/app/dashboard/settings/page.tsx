'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';
import { Trash2, UserPlus, Shield, X } from 'lucide-react';
import { getAppSettings, type AppSettings, type ReferralTier } from '@/app/actions/settings';
import { saveAppSettings } from '@/app/services/adminService';

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [localVipSpots, setLocalVipSpots] = useState(100);
  const [localReferralTiers, setLocalReferralTiers] = useState<ReferralTier[]>([]);
  const [admins, setAdmins] = useState<{ email: string; addedAt: string; addedBy: string }[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (user && profile) {
      fetchSettings();
      fetchAdmins();
    }
  }, [user, profile]);

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const appSettings = await getAppSettings();
      setSettings(appSettings);

      if (appSettings) {
        setLocalVipSpots(appSettings.vipConfig?.totalSpots || 100);
        setLocalReferralTiers(appSettings.referralTiers || []);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings.');
    }
    setLoadingSettings(false);
  };

  const handleSaveSettings = async (settingsToSave: Partial<AppSettings>) => {
    setSavingSettings(true);
    try {
      await saveAppSettings(settingsToSave);
      toast.success("Settings saved successfully!");
      await fetchSettings();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const { getAdmins } = await import('@/app/actions/admin');
      const adminList = await getAdmins();
      setAdmins(adminList);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
    setLoadingAdmins(false);
  };

  const handleInviteAdmin = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const { addAdmin } = await import('@/app/actions/admin');
      const result = await addAdmin(user?.email || '', inviteEmail.trim());
      if (result.success) {
        toast.success(`${inviteEmail.trim()} added as admin`);
        setInviteEmail('');
        await fetchAdmins();
      } else {
        toast.error(result.error || 'Failed to add admin');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add admin');
    }
    setInviting(false);
  };

  const handleRemoveAdmin = async (email: string) => {
    try {
      const { removeAdmin } = await import('@/app/actions/admin');
      const result = await removeAdmin(user?.email || '', email);
      if (result.success) {
        toast.success(`${email} removed from admins`);
        await fetchAdmins();
      } else {
        toast.error(result.error || 'Failed to remove admin');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove admin');
    }
  };

  const handleReferralTierChange = (index: number, field: keyof ReferralTier, value: string | number) => {
    const newTiers = [...localReferralTiers];
    (newTiers[index] as any)[field] = field === 'count' ? Number(value) : value;
    setLocalReferralTiers(newTiers);
  };

  const handleAddReferralTier = () => {
    setLocalReferralTiers([...localReferralTiers, { count: 0, icon: '🎉', reward: '', tier: '' }]);
  };

  const handleRemoveReferralTier = (index: number) => {
    setLocalReferralTiers(localReferralTiers.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Application Settings</h1>
        <p className="text-muted-foreground">Manage VIP configuration and referral tiers</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>Manage VIP spots and referral tiers. Changes will be live immediately.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {loadingSettings ? <Skeleton className="h-64 w-full" /> : (
            <>
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold text-lg">VIP Settings</h3>
                <div className="flex items-center gap-4">
                  <Label htmlFor="vip-spots">Total VIP Spots</Label>
                  <Input id="vip-spots" type="number" value={localVipSpots} onChange={(e) => setLocalVipSpots(Number(e.target.value))} className="w-24" />
                  <Button onClick={() => handleSaveSettings({ vipConfig: { totalSpots: localVipSpots } })} disabled={savingSettings}>
                    {savingSettings ? 'Saving...' : 'Save VIP Spots'}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold text-lg">Referral Tiers (by referral count)</h3>
                <div className="space-y-2">
                  {localReferralTiers.map((tier, index) => (
                    <div key={index} className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center">
                      <Input value={tier.icon} onChange={(e) => handleReferralTierChange(index, 'icon', e.target.value)} className="w-16 text-center" placeholder="Icon"/>
                      <Input type="number" value={tier.count} onChange={(e) => handleReferralTierChange(index, 'count', e.target.value)} placeholder="Count"/>
                      <Input value={tier.tier} onChange={(e) => handleReferralTierChange(index, 'tier', e.target.value)} placeholder="Tier Name (e.g., Bronze)"/>
                      <Input value={tier.reward} onChange={(e) => handleReferralTierChange(index, 'reward', e.target.value)} placeholder="Reward Description"/>
                      <Button size="icon" variant="ghost" onClick={() => handleRemoveReferralTier(index)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleAddReferralTier}>Add Referral Tier</Button>
                  <Button onClick={() => handleSaveSettings({ referralTiers: localReferralTiers })} disabled={savingSettings}>
                    {savingSettings ? 'Saving...' : 'Save Referral Tiers'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Admin Management
          </CardTitle>
          <CardDescription>Manage who has access to this dashboard. Invite team members by email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingAdmins ? <Skeleton className="h-32 w-full" /> : (
            <>
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div key={admin.email} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{admin.email}</p>
                        {admin.addedBy && admin.addedBy !== 'system' && (
                          <p className="text-xs text-muted-foreground">Added by {admin.addedBy}</p>
                        )}
                        {admin.addedBy === 'system' && (
                          <p className="text-xs text-muted-foreground">Super Admin</p>
                        )}
                      </div>
                    </div>
                    {admin.addedBy !== 'system' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveAdmin(admin.email)}
                        title="Remove admin"
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email to invite as admin"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInviteAdmin()}
                />
                <Button onClick={handleInviteAdmin} disabled={inviting || !inviteEmail.trim()} className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  {inviting ? 'Adding...' : 'Invite'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
