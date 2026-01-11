import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TutorialTooltip } from '@/components/ui/tutorial-tooltip';
import { useSalonOffers, useSalonOfferMutations } from '@/hooks/useSalonOwner';
import { Plus, Edit, Trash2, Coins, Clock, Loader2, Gift, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SalonOffersManagerProps {
  salonId: string;
  currency?: string;
}

// Improved preset tiers with logical discount-to-points mapping
const OFFER_PRESETS = [
  { discount: 10, points: 150, label: 'Light' },
  { discount: 15, points: 250, label: 'Starter' },
  { discount: 20, points: 400, label: 'Standard', popular: true },
  { discount: 25, points: 600, label: 'Value' },
  { discount: 30, points: 850, label: 'Premium' },
];

// Calculate recommended points for a given discount percentage
const calculateRecommendedPoints = (discountPercent: number): number => {
  // Formula: roughly discount² × 0.6 with a minimum
  const calculated = Math.round(discountPercent * discountPercent * 0.6);
  return Math.max(50, Math.min(10000, calculated));
};

export const SalonOffersManager: React.FC<SalonOffersManagerProps> = ({ salonId, currency = 'AED' }) => {
  const { data: offers = [], isLoading } = useSalonOffers(salonId);
  const { createOffer, updateOffer, deleteOffer } = useSalonOfferMutations(salonId);
  const { toast } = useToast();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    discount_type: 'PERCENT',
    discount_value: 20,
    points_cost: 400,
    min_spend_aed: 0,
    cooldown_days: 7,
    monthly_cap: 0,
    is_active: true,
  });
  
  // Calculate recommended points based on current discount
  const recommendedPoints = useMemo(() => {
    return calculateRecommendedPoints(formData.discount_value);
  }, [formData.discount_value]);
  
  // Validation
  const validationError = useMemo(() => {
    if (formData.discount_value < 1 || formData.discount_value > 100) {
      return 'Discount must be between 1% and 100%';
    }
    if (formData.points_cost < 50) {
      return 'Points must be at least 50';
    }
    if (formData.points_cost > 10000) {
      return 'Points cannot exceed 10,000';
    }
    return null;
  }, [formData.discount_value, formData.points_cost]);
  
  const resetForm = () => {
    setFormData({
      discount_type: 'PERCENT',
      discount_value: 20,
      points_cost: 400,
      min_spend_aed: 0,
      cooldown_days: 7,
      monthly_cap: 0,
      is_active: true,
    });
    setEditingOffer(null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validationError) {
      toast({
        title: 'Validation Error',
        description: validationError,
        variant: 'destructive'
      });
      return;
    }
    
    const payload = {
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      points_cost: formData.points_cost,
      min_spend_aed: formData.min_spend_aed || undefined,
      cooldown_days: formData.cooldown_days,
      monthly_cap: formData.monthly_cap || undefined,
      is_active: formData.is_active,
    };
    
    if (editingOffer) {
      await updateOffer.mutateAsync({
        offerId: editingOffer.id,
        updates: payload,
      });
    } else {
      await createOffer.mutateAsync({
        salon_id: salonId,
        ...payload,
      });
    }
    
    setIsAddModalOpen(false);
    resetForm();
  };
  
  const handleEdit = (offer: any) => {
    setEditingOffer(offer);
    setFormData({
      discount_type: offer.discount_type || 'PERCENT',
      discount_value: offer.discount_value,
      points_cost: offer.points_cost,
      min_spend_aed: offer.min_spend_aed || 0,
      cooldown_days: offer.cooldown_days,
      monthly_cap: offer.monthly_cap || 0,
      is_active: offer.is_active,
    });
    setIsAddModalOpen(true);
  };
  
  const handleDelete = async (offerId: string) => {
    if (confirm('Are you sure you want to delete this offer?')) {
      await deleteOffer.mutateAsync(offerId);
    }
  };
  
  const applyPreset = (preset: typeof OFFER_PRESETS[0]) => {
    setFormData({
      ...formData,
      discount_value: preset.discount,
      points_cost: preset.points,
    });
  };
  
  const handleDiscountChange = (value: number) => {
    // Clamp value between 1 and 100
    const clampedValue = Math.max(1, Math.min(100, value || 1));
    setFormData({ ...formData, discount_value: clampedValue });
  };
  
  const formatPrice = (aed: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(aed);
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Reward Offers</CardTitle>
            <TutorialTooltip
              feature="salon-offers-tutorial"
              content={
                <div className="space-y-2">
                  <p className="font-medium">Create reward offers to attract Azyah members</p>
                  <p className="text-sm text-muted-foreground">
                    Set points cost (recommended: 450 for 25%, 1800 for 50%). Members earn points by using the app and redeem them at your salon.
                  </p>
                </div>
              }
            >
              <span className="text-muted-foreground cursor-help">ⓘ</span>
            </TutorialTooltip>
          </div>
          
          <Dialog open={isAddModalOpen} onOpenChange={(open) => {
            setIsAddModalOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Offer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingOffer ? 'Edit Offer' : 'Create Reward Offer'}</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Quick presets */}
                {!editingOffer && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Quick Presets
                      <span className="text-xs text-muted-foreground font-normal">(click to apply)</span>
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {OFFER_PRESETS.map((preset) => (
                        <Button
                          key={preset.discount}
                          type="button"
                          variant={formData.discount_value === preset.discount && formData.points_cost === preset.points ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => applyPreset(preset)}
                          className="relative"
                        >
                          {preset.discount}% off
                          <span className="text-xs opacity-70 ml-1">({preset.points} pts)</span>
                          {preset.popular && (
                            <Badge variant="secondary" className="absolute -top-2 -right-2 text-[10px] px-1 py-0 bg-primary text-primary-foreground">
                              <Sparkles className="h-2 w-2 mr-0.5" />
                              Popular
                            </Badge>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discount">Discount % *</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.discount_value}
                      onChange={(e) => handleDiscountChange(parseInt(e.target.value))}
                      required
                      className={validationError?.includes('Discount') ? 'border-destructive' : ''}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="points">Points Cost *</Label>
                    <Input
                      id="points"
                      type="number"
                      min="50"
                      max="10000"
                      value={formData.points_cost}
                      onChange={(e) => setFormData({ ...formData, points_cost: parseInt(e.target.value) || 50 })}
                      required
                      className={validationError?.includes('Points') ? 'border-destructive' : ''}
                    />
                    {formData.points_cost !== recommendedPoints && (
                      <p className="text-xs text-muted-foreground">
                        Recommended: ~{recommendedPoints} pts
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 ml-1 text-xs"
                          onClick={() => setFormData({ ...formData, points_cost: recommendedPoints })}
                        >
                          Apply
                        </Button>
                      </p>
                    )}
                  </div>
                </div>
                
                {validationError && (
                  <p className="text-sm text-destructive">{validationError}</p>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="min_spend">Minimum Spend (AED, optional)</Label>
                  <Input
                    id="min_spend"
                    type="number"
                    min="0"
                    value={formData.min_spend_aed}
                    onChange={(e) => setFormData({ ...formData, min_spend_aed: parseFloat(e.target.value || '0') })}
                    placeholder="0 = no minimum"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cooldown">Cooldown (days)</Label>
                    <Input
                      id="cooldown"
                      type="number"
                      min="0"
                      value={formData.cooldown_days}
                      onChange={(e) => setFormData({ ...formData, cooldown_days: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Days before same user can redeem again</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cap">Monthly Cap (optional)</Label>
                    <Input
                      id="cap"
                      type="number"
                      min="0"
                      value={formData.monthly_cap}
                      onChange={(e) => setFormData({ ...formData, monthly_cap: parseInt(e.target.value || '0') })}
                      placeholder="0 = unlimited"
                    />
                    <p className="text-xs text-muted-foreground">Max redemptions per month</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createOffer.isPending || updateOffer.isPending || !!validationError}>
                    {createOffer.isPending || updateOffer.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {editingOffer ? 'Update' : 'Create'} Offer
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {offers.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No offers yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create reward offers to attract Azyah members to your salon.
            </p>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Offer
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <Card key={offer.id} className="relative overflow-hidden">
                {!offer.is_active && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary">Inactive</Badge>
                  </div>
                )}
                
                <CardContent className="p-4">
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-primary">
                      {offer.discount_value}% OFF
                    </div>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <Coins className="h-4 w-4" />
                      <span>{offer.points_cost} points</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {offer.min_spend_aed && offer.min_spend_aed > 0 && (
                      <div className="flex items-center justify-between">
                        <span>Min spend:</span>
                        <span>{formatPrice(offer.min_spend_aed)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span>Cooldown:</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {offer.cooldown_days} days
                      </span>
                    </div>
                    {offer.monthly_cap && offer.monthly_cap > 0 && (
                      <div className="flex items-center justify-between">
                        <span>Monthly cap:</span>
                        <span>{offer.monthly_cap}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(offer)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(offer.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
