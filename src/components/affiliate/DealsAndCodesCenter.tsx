import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Tag, Plus, Calendar, Link2, Copy, Trash2, Edit2, 
  ChevronDown, ChevronUp, Upload, Sparkles, Palette,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useMyPromos,
  useMyOutfitsWithPromoStatus,
  useCreatePromo,
  useUpdatePromo,
  useDeletePromo,
  useAttachPromoToOutfits,
  type AffiliatePromo,
} from '@/hooks/useAffiliatePromos';
import { PromoAttachModal } from './PromoAttachModal';

export function DealsAndCodesCenter() {
  const navigate = useNavigate();
  const { data: promos, isLoading: promosLoading } = useMyPromos();
  const { data: outfits } = useMyOutfitsWithPromoStatus();
  const createPromo = useCreatePromo();
  const updatePromo = useUpdatePromo();
  const deletePromo = useDeletePromo();
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<AffiliatePromo | null>(null);
  const [attachModalPromo, setAttachModalPromo] = useState<AffiliatePromo | null>(null);
  
  // Form state
  const [promoName, setPromoName] = useState('');
  const [affiliateCode, setAffiliateCode] = useState('');
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const publicOutfits = outfits?.filter(o => o.is_public) || [];
  const hasPublicOutfits = publicOutfits.length > 0;

  const resetForm = () => {
    setPromoName('');
    setAffiliateCode('');
    setAffiliateUrl('');
    setExpiresAt('');
    setShowCreateForm(false);
    setEditingPromo(null);
  };

  const handleCreatePromo = async () => {
    if (!affiliateCode && !affiliateUrl) {
      toast.error('Please provide a code or URL');
      return;
    }
    
    await createPromo.mutateAsync({
      promo_name: promoName || undefined,
      affiliate_code: affiliateCode || undefined,
      affiliate_url: affiliateUrl || undefined,
      expires_at: expiresAt || undefined,
    });
    resetForm();
  };

  const handleUpdatePromo = async () => {
    if (!editingPromo) return;
    
    await updatePromo.mutateAsync({
      promo_id: editingPromo.promo_id,
      promo_name: promoName || undefined,
      affiliate_code: affiliateCode || undefined,
      affiliate_url: affiliateUrl || undefined,
      expires_at: expiresAt || null,
    });
    resetForm();
  };

  const handleEditClick = (promo: AffiliatePromo) => {
    setEditingPromo(promo);
    setPromoName(promo.promo_name || '');
    setAffiliateCode(promo.affiliate_code || '');
    setAffiliateUrl(promo.affiliate_url || '');
    setExpiresAt(promo.expires_at ? promo.expires_at.split('T')[0] : '');
    setShowCreateForm(true);
  };

  const handleToggleActive = async (promo: AffiliatePromo) => {
    await updatePromo.mutateAsync({
      promo_id: promo.promo_id,
      is_active: !promo.is_active,
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  const getDaysLeftText = (daysLeft: number | null) => {
    if (daysLeft === null) return 'No expiry';
    if (daysLeft === 0) return 'Expires today';
    if (daysLeft === 1) return '1 day left';
    return `${daysLeft} days left`;
  };

  // Onboarding card for users with no public outfits
  const OnboardingCard = () => (
    <Card className="border-dashed border-2 border-[hsl(var(--azyah-maroon))]/30 bg-gradient-to-br from-[hsl(var(--azyah-maroon))]/5 to-transparent">
      <CardContent className="p-4 space-y-4">
        <div className="text-center">
          <Tag className="h-8 w-8 mx-auto mb-2 text-[hsl(var(--azyah-maroon))]" />
          <h4 className="font-semibold text-sm">Create Your First Public Outfit</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Before adding deals, you need at least one public outfit to attach them to.
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
            <div className="w-6 h-6 rounded-full bg-[hsl(var(--azyah-maroon))]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-[hsl(var(--azyah-maroon))]">1</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">Add items to your closet</p>
              <p className="text-[10px] text-muted-foreground">Upload your own or save from Discover</p>
              <div className="flex gap-2 mt-1.5">
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => navigate('/dress-me/wardrobe')}>
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => navigate('/swipe')}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Discover
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
            <div className="w-6 h-6 rounded-full bg-[hsl(var(--azyah-maroon))]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-[hsl(var(--azyah-maroon))]">2</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">Create an outfit</p>
              <p className="text-[10px] text-muted-foreground">Open Canvas and build your look</p>
              <Button size="sm" variant="outline" className="h-6 text-[10px] mt-1.5" onClick={() => navigate('/dress-me/canvas')}>
                <Palette className="h-3 w-3 mr-1" />
                Open Canvas
              </Button>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
            <div className="w-6 h-6 rounded-full bg-[hsl(var(--azyah-maroon))]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-[hsl(var(--azyah-maroon))]">3</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">Make it public</p>
              <p className="text-[10px] text-muted-foreground">Toggle "Public" so it appears on your Style Link</p>
            </div>
          </div>
        </div>
        
        <Button 
          className="w-full bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90" 
          size="sm"
          onClick={() => navigate('/dress-me')}
        >
          Get Started
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <Card className="border-[hsl(var(--azyah-maroon))]/20">
      <CardHeader 
        className="py-3 px-4 cursor-pointer flex-row items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-[hsl(var(--azyah-maroon))]" />
          <CardTitle className="text-sm">Deals & Codes</CardTitle>
          {promos && promos.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{promos.length}</Badge>
          )}
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </CardHeader>

      {isExpanded && (
        <CardContent className="px-4 pb-4 pt-0 space-y-4">
          {/* Show onboarding if no public outfits */}
          {!hasPublicOutfits && !promosLoading ? (
            <OnboardingCard />
          ) : (
            <>
              {/* Create/Edit Form */}
              {showCreateForm ? (
                <Card className="p-3 bg-muted/30">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Promo Name (optional)</Label>
                      <Input
                        placeholder="e.g., Summer Sale"
                        value={promoName}
                        onChange={(e) => setPromoName(e.target.value)}
                        className="h-8 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Discount Code</Label>
                      <Input
                        placeholder="e.g., SAVE20"
                        value={affiliateCode}
                        onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
                        className="h-8 text-sm mt-1 font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Affiliate URL (optional)</Label>
                      <Input
                        placeholder="https://shop.example.com?ref=you"
                        value={affiliateUrl}
                        onChange={(e) => setAffiliateUrl(e.target.value)}
                        className="h-8 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Expires On (optional)</Label>
                      <Input
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className="h-8 text-sm mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={editingPromo ? handleUpdatePromo : handleCreatePromo}
                        disabled={createPromo.isPending || updatePromo.isPending}
                        className="flex-1 bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90"
                      >
                        {editingPromo ? 'Update' : 'Create'} Promo
                      </Button>
                      <Button size="sm" variant="outline" onClick={resetForm}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  onClick={() => setShowCreateForm(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create New Promo
                </Button>
              )}

              {/* Promos List */}
              {promosLoading ? (
                <div className="text-center text-xs text-muted-foreground py-4">Loading...</div>
              ) : promos && promos.length > 0 ? (
                <div className="space-y-2">
                  {promos.map((promo) => (
                    <Card key={promo.promo_id} className={`p-3 ${!promo.is_active ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">
                              {promo.promo_name || promo.affiliate_code || 'Unnamed Promo'}
                            </p>
                            {!promo.is_active && (
                              <Badge variant="secondary" className="text-[9px]">Inactive</Badge>
                            )}
                          </div>
                          
                          {promo.affiliate_code && (
                            <div className="flex items-center gap-1 mt-1">
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                {promo.affiliate_code}
                              </code>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-5 w-5 p-0"
                                onClick={() => copyCode(promo.affiliate_code!)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {getDaysLeftText(promo.days_left)}
                            </span>
                            <span>{promo.outfit_count} outfit{promo.outfit_count !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-[10px]"
                            onClick={() => setAttachModalPromo(promo)}
                          >
                            <Link2 className="h-3 w-3 mr-1" />
                            Attach
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0"
                            onClick={() => handleEditClick(promo)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => deletePromo.mutate(promo.promo_id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {promo.affiliate_url && (
                        <a 
                          href={promo.affiliate_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 mt-2 text-[10px] text-[hsl(var(--azyah-maroon))] hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Shop Link
                        </a>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No promos yet. Create one to attach to your outfits!
                </p>
              )}
            </>
          )}
        </CardContent>
      )}

      {/* Attach Modal */}
      {attachModalPromo && (
        <PromoAttachModal
          promo={attachModalPromo}
          isOpen={!!attachModalPromo}
          onClose={() => setAttachModalPromo(null)}
        />
      )}
    </Card>
  );
}
