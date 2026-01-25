'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { getAppSettings, type AppSettings, type ReferralTier } from '@/app/actions/settings';
import { saveAppSettings } from '@/app/services/adminService';

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [localVipSpots, setLocalVipSpots] = useState(100);
  const [localReferralTiers, setLocalReferralTiers] = useState<ReferralTier[]>([]);

  useEffect(() => {
    if (user && profile?.email === 'pawme@ayvalabs.com') {
      fetchSettings();
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
    </div>
  );
}
