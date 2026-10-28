import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { BackButton } from '@/components/ui/back-button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  Heart,
  ArrowRight,
  Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Money } from '@/components/ui/Money';
import { useDesignV3 } from '@/hooks/useDesignV3';
import { groupCartBySeller } from '@/lib/cartGroups';
import { openExternalUrl } from '@/lib/openExternalUrl';

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  size_variant?: string;
  color_variant?: string;
  created_at: string;
  product?: {
    id: string;
    title: string;
    price_cents: number;
    currency: string;
    media_urls: any; // JSON type from Supabase
    external_url?: string | null;
    merchant_name?: string | null;
    brand?: {
      id?: string;
      name: string;
    };
  };
}

const ShoppingCart: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const v3 = useDesignV3();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchCartItems();
    }
  }, [user]);

  const fetchCartItems = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products (
            id,
            title,
            price_cents,
            currency,
            media_urls,
            external_url,
            merchant_name,
            brand:brands (
              id,
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCartItems(data || []);
    } catch (error) {
      console.error('Error fetching cart items:', error);
      toast({
        description: "Failed to load cart items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(itemId);
      return;
    }

    setUpdating(itemId);
    
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);

      if (error) throw error;

      setCartItems(items => 
        items.map(item => 
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );

      toast({ description: "Quantity updated" });
    } catch (error) {
      toast({
        description: "Failed to update quantity",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setUpdating(itemId);

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setCartItems(items => items.filter(item => item.id !== itemId));
      toast({ description: "Item removed from cart" });
    } catch (error) {
      toast({
        description: "Failed to remove item",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  const moveToWishlist = async (item: CartItem) => {
    if (!user || !item.product) return;

    try {
      // Get or create user's default wishlist
      let { data: wishlist } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (!wishlist) {
        const { data: newWishlist, error: wishlistError } = await supabase
          .from('wishlists')
          .insert({
            user_id: user.id,
            title: 'My Wishlist'
          })
          .select('id')
          .single();

        if (wishlistError) throw wishlistError;
        wishlist = newWishlist;
      }

      // Add to wishlist
      const { error: wishlistItemError } = await supabase
        .from('wishlist_items')
        .insert({
          wishlist_id: wishlist.id,
          product_id: item.product_id
        });

      if (wishlistItemError) throw wishlistItemError;

      // Remove from cart
      await removeItem(item.id);
      
      toast({ description: "Moved to wishlist" });
    } catch (error) {
      toast({
        description: "Failed to move to wishlist",
        variant: "destructive"
      });
    }
  };

  const formatPrice = (cents: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      if (item.product) {
        return total + (item.product.price_cents * item.quantity);
      }
      return total;
    }, 0);
  };

  const calculateItemCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-4xl p-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p>Loading your cart...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Design v3: items grouped by where they're sold, one "Buy on [seller]" per
  // group. No in-app checkout (decision D1), so no checkout button.
  if (v3) {
    const lines = cartItems.filter((i): i is CartItem & { product: NonNullable<CartItem['product']> } => !!i.product);
    const groups = groupCartBySeller(lines);
    const count = calculateItemCount();
    return (
      <div className="min-h-screen bg-ground pb-24" style={{ paddingTop: 'calc(var(--safe-top, 0px) + 8px)' }}>
        <div className="mx-auto max-w-2xl px-4">
          <BackButton />
          <h1 className="mt-1 text-[26px] font-semibold leading-tight text-ink">Bag</h1>
          <p className="text-[13px] text-ink-2 tabular-nums">{count} item{count !== 1 ? 's' : ''}</p>

          {groups.length === 0 ? (
            <div className="mt-4 rounded-[20px] border border-dashed border-line-strong p-6 text-center">
              <p className="text-[15px] text-ink">Your bag is empty.</p>
              <Button className="mt-4" onClick={() => navigate('/swipe')}>Go to Feed</Button>
            </div>
          ) : (
            <>
              {groups.map((group) => (
                <section key={group.key} className="mt-4 rounded-[20px] bg-card p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="truncate text-[15px] font-semibold text-ink">{group.seller}</h2>
                    <Money
                      cents={group.subtotalCents}
                      currency={group.items[0].product.currency || 'USD'}
                      className="shrink-0 text-[15px] font-semibold text-ink tabular-nums"
                    />
                  </div>
                  <ul className="mt-2">
                    {group.items.map((item, i) => (
                      <li key={item.id} className={`flex gap-3 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-fill">
                          {item.product.media_urls?.[0] ? (
                            <img src={item.product.media_urls[0]} alt={item.product.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-6 w-6 text-ink-3" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between gap-2">
                            <p className="truncate text-[15px] text-ink">{item.product.title}</p>
                            <Money
                              cents={item.product.price_cents * item.quantity}
                              currency={item.product.currency || 'USD'}
                              className="shrink-0 text-[15px] text-ink tabular-nums"
                            />
                          </div>
                          <p className="truncate text-[13px] text-ink-2">
                            {[item.product.brand?.name, item.size_variant && `Size ${item.size_variant}`, item.color_variant].filter(Boolean).join(' · ')}
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            <button
                              type="button"
                              aria-label="One less"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={updating === item.id}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-fill text-ink disabled:opacity-50"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-4 text-center text-[13px] text-ink tabular-nums">{item.quantity}</span>
                            <button
                              type="button"
                              aria-label="One more"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={updating === item.id}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-fill text-ink disabled:opacity-50"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              disabled={updating === item.id}
                              className="ml-auto text-[13px] text-ink-2 disabled:opacity-50"
                            >
                              Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => moveToWishlist(item)}
                              disabled={updating === item.id}
                              className="text-[13px] text-ink-2 disabled:opacity-50"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {group.buyUrl ? (
                    <Button variant="buy" className="mt-1 h-12 w-full text-[15px] font-semibold" onClick={() => openExternalUrl(group.buyUrl!)}>
                      Buy on {group.seller}
                    </Button>
                  ) : (
                    <p className="mt-1 text-[13px] text-ink-2">These aren't sold online yet. We'll keep them here.</p>
                  )}
                </section>
              ))}
              <p className="mt-4 px-1 text-[13px] text-ink-2">Each brand sells on its own site. Your bag remembers what you picked.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BackButton />
            <ShoppingBag className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Shopping Cart</h1>
              <p className="text-muted-foreground">
                {calculateItemCount()} item{calculateItemCount() !== 1 ? 's' : ''} in your cart
              </p>
            </div>
          </div>
        </div>

        {cartItems.length === 0 ? (
          /* Empty Cart */
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">
              Start shopping to add items to your cart
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => window.location.href = '/explore'}>
                <Package className="h-4 w-4 mr-2" />
                Browse Products
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/swipe'}>
                <Heart className="h-4 w-4 mr-2" />
                Swipe Deck
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {item.product?.media_urls && item.product.media_urls.length > 0 ? (
                          <img 
                            src={item.product.media_urls[0]} 
                            alt={item.product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">{item.product?.title || 'Product'}</h3>
                            <p className="text-sm text-muted-foreground">
                              {item.product?.brand?.name || 'Brand'}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            disabled={updating === item.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Variants */}
                        <div className="flex gap-2 mb-3">
                          {item.size_variant && (
                            <Badge variant="outline" className="text-xs">
                              Size: {item.size_variant}
                            </Badge>
                          )}
                          {item.color_variant && (
                            <Badge variant="outline" className="text-xs">
                              Color: {item.color_variant}
                            </Badge>
                          )}
                        </div>

                        {/* Price and Quantity */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={updating === item.id}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="font-medium w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={updating === item.id}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {item.product && formatPrice(item.product.price_cents * item.quantity, item.product.currency)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.product && formatPrice(item.product.price_cents, item.product.currency)} each
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveToWishlist(item)}
                            className="text-xs"
                          >
                            <Heart className="h-3 w-3 mr-1" />
                            Move to Wishlist
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal ({calculateItemCount()} items)</span>
                      <span>{formatPrice(calculateTotal())}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping</span>
                      <span className="text-green-600">Free</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Taxes</span>
                      <span>Calculated at checkout</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(calculateTotal())}</span>
                  </div>

                  <Button className="w-full" size="lg">
                    Proceed to Checkout
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>

                  <Button variant="outline" className="w-full">
                    <Heart className="h-4 w-4 mr-2" />
                    Save for Later
                  </Button>

                  <div className="text-xs text-muted-foreground text-center pt-2">
                    🔒 Secure checkout with 256-bit SSL encryption
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingCart;