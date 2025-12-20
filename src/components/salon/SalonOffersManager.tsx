import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TutorialTooltip } from '@/components/ui/tutorial-tooltip';
import { useSalonOffers, useSalonOfferMutations } from '@/hooks/useSalonOwner';
import { Plus, Edit, Trash2, Percent, Coins, Clock, Loader2, Gift } from 'lucide-react';

interface SalonOffersManagerProps {
  salonId: string;
}

const RECOMMENDED_OFFERS = [
  { discount: 25, points: 450, label: 'Starter' },
  { discount: 50, points: 1800, label: 'Popular' },
  { discount: 60, points: 3000, label: 'Premium' },
];

export const SalonOffersManager: React.FC<SalonOffersManagerProps> = ({ salonId }) => {
  const { data: offers = [], isLoading } = useSalonOffers(salonId);
  const { createOffer, updateOffer, deleteOffer } = useSalonOfferMutations(salonId);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    discount_percent: 25,
    points_cost: 450,
    min_spend_cents: 0,
    cooldown_days: 7,
    monthly_cap: 0,
    is_active: true,
  });
  
  const resetForm = () => {
    setFormData({
      discount_percent: 25,
      points_cost: 450,
      min_spend_cents: 0,
      cooldown_days: 7,
      monthly_cap: 0,
      is_active: true,
    });
    setEditingOffer(null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      min_spend_cents: formData.min_spend_cents || null,
      monthly_cap: formData.monthly_cap || null,
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
      discount_percent: offer.discount_percent,
      points_cost: offer.points_cost,
      min_spend_cents: offer.min_spend_cents || 0,
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
  
  const applyRecommended = (rec: typeof RECOMMENDED_OFFERS[0]) => {
    setFormData({
      ...formData,
      discount_percent: rec.discount,
      points_cost: rec.points,
    });
  };
  
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(cents / 100);
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
                    <Label>Quick Presets</Label>
                    <div className="flex gap-2">
                      {RECOMMENDED_OFFERS.map((rec) => (
                        <Button
                          key={rec.discount}
                          type="button"
                          variant={formData.discount_percent === rec.discount ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => applyRecommended(rec)}
                        >
                          {rec.discount}% off
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {rec.label}
                          </Badge>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discount">Discount %</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({ ...formData, discount_percent: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="points">Points Cost</Label>
                    <Input
                      id="points"
                      type="number"
                      min="1"
                      value={formData.points_cost}
                      onChange={(e) => setFormData({ ...formData, points_cost: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="min_spend">Minimum Spend (AED, optional)</Label>
                  <Input
                    id="min_spend"
                    type="number"
                    min="0"
                    value={formData.min_spend_cents / 100}
                    onChange={(e) => setFormData({ ...formData, min_spend_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
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
                  <Button type="submit" disabled={createOffer.isPending || updateOffer.isPending}>
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
                      {offer.discount_percent}% OFF
                    </div>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <Coins className="h-4 w-4" />
                      <span>{offer.points_cost} points</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {offer.min_spend_cents && offer.min_spend_cents > 0 && (
                      <div className="flex items-center justify-between">
                        <span>Min spend:</span>
                        <span>{formatPrice(offer.min_spend_cents)}</span>
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
