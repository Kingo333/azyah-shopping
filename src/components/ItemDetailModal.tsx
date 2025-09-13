import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Edit3, Palette, ExternalLink, Heart } from 'lucide-react';
import { EnhancedClosetItem, useUpdateClosetItem } from '@/hooks/useEnhancedClosets';
import { useRemoveFromCloset } from '@/hooks/useClosets';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ItemDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: EnhancedClosetItem | null;
  onAddToOutfit?: (item: EnhancedClosetItem) => void;
}

const CATEGORIES = [
  'tops',
  'bottoms',
  'dresses',
  'outerwear',
  'shoes',
  'accessories',
  'bags',
  'jewelry',
  'activewear',
  'lingerie',
  'swimwear'
];

const COLORS = [
  'black',
  'white',
  'gray',
  'brown',
  'beige',
  'red',
  'pink',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'multicolor'
];

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  open,
  onOpenChange,
  item,
  onAddToOutfit
}) => {
  const updateItemMutation = useUpdateClosetItem();
  const removeItemMutation = useRemoveFromCloset();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    brand: '',
    category: '',
    color: '',
    price_cents: '',
    currency: 'USD'
  });

  React.useEffect(() => {
    if (item) {
      setEditData({
        title: item.title || '',
        brand: item.brand || '',
        category: item.category || '',
        color: item.color || '',
        price_cents: item.price_cents?.toString() || '',
        currency: item.currency || 'USD'
      });
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;

    try {
      await updateItemMutation.mutateAsync({
        itemId: item.id,
        updates: {
          title: editData.title,
          brand: editData.brand || null,
          category: editData.category || null,
          color: editData.color || null,
          price_cents: editData.price_cents ? parseInt(editData.price_cents) : null,
          currency: editData.currency
        }
      });

      setIsEditing(false);
      toast({
        title: "Item updated",
        description: "Your item has been updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item"
      });
    }
  };

  const handleRemove = async () => {
    if (!item) return;

    if (confirm('Are you sure you want to remove this item from your wardrobe?')) {
      try {
        await removeItemMutation.mutateAsync(item.id);
        onOpenChange(false);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to remove item"
        });
      }
    }
  };

  const handleAddToOutfit = () => {
    if (item && onAddToOutfit) {
      onAddToOutfit(item);
      onOpenChange(false);
      toast({
        title: "Added to outfit",
        description: "Item has been added to your current outfit"
      });
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(cents / 100);
  };

  if (!item) return null;

  const externalUrl = item.attrs?.external_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Item Details
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="gap-2"
              >
                <Edit3 className="h-4 w-4" />
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                className="gap-2"
                disabled={removeItemMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="space-y-4">
            <div className="aspect-[3/4] relative overflow-hidden rounded-lg border">
              <img
                src={item.image_url || '/placeholder.svg'}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Actions */}
            <div className="space-y-2">
              {onAddToOutfit && (
                <Button onClick={handleAddToOutfit} className="w-full gap-2">
                  <Palette className="h-4 w-4" />
                  Add to Current Outfit
                </Button>
              )}
              
              {externalUrl && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => window.open(externalUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  View Original
                </Button>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            {isEditing ? (
              /* Edit Form */
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Item Name</Label>
                  <Input
                    id="edit-title"
                    value={editData.title}
                    onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-brand">Brand</Label>
                  <Input
                    id="edit-brand"
                    value={editData.brand}
                    onChange={(e) => setEditData(prev => ({ ...prev, brand: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Select value={editData.category} onValueChange={(value) => setEditData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-color">Color</Label>
                    <Select value={editData.color} onValueChange={(value) => setEditData(prev => ({ ...prev, color: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        {COLORS.map((color) => (
                          <SelectItem key={color} value={color}>
                            {color.charAt(0).toUpperCase() + color.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="edit-price">Price</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      value={editData.price_cents}
                      onChange={(e) => setEditData(prev => ({ ...prev, price_cents: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-currency">Currency</Label>
                    <Select value={editData.currency} onValueChange={(value) => setEditData(prev => ({ ...prev, currency: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full" disabled={updateItemMutation.isPending}>
                  {updateItemMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            ) : (
              /* View Mode */
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  {item.brand && (
                    <p className="text-muted-foreground">{item.brand}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.category && (
                    <Badge variant="secondary" className="capitalize">
                      {item.category.replace('_', ' ')}
                    </Badge>
                  )}
                  {item.color && (
                    <Badge variant="outline" className="capitalize">
                      {item.color}
                    </Badge>
                  )}
                </div>

                {item.price_cents && (
                  <div className="text-lg font-semibold">
                    {formatPrice(item.price_cents, item.currency || 'USD')}
                  </div>
                )}

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Added: {new Date(item.added_at).toLocaleDateString()}</p>
                      {item.products && (
                        <p className="text-xs">Linked to product catalog</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};