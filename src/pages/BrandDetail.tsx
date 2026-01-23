import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Package, Heart, Star, ShoppingBag, User, Image, Briefcase, Globe, Instagram, Twitter } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { SmartImage } from '@/components/SmartImage';
import { getPrimaryImageUrl, hasMultipleImages, getImageCount } from '@/utils/imageHelpers';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import { useToast } from '@/hooks/use-toast';
import { useProductHasOutfit } from '@/hooks/useProductOutfits';
import { useGuestGate } from '@/hooks/useGuestGate';
import { GuestActionPrompt } from '@/components/GuestActionPrompt';
import ProductTryOnModal from '@/components/ProductTryOnModal';
import { PortfolioGallery } from '@/components/brand/PortfolioGallery';

// ProductCard component for seamless grid display
const BrandProductCard: React.FC<{
  product: any;
  onProductClick: (id: string) => void;
  onLike: (product: any) => void;
  formatPrice: (cents: number, currency?: string) => string;
  user: any;
  requireAuth: (action: string, callback: () => void) => void;
}> = ({ product, onProductClick, onLike, formatPrice, user, requireAuth }) => {
  const { addToWishlist, isLoading: wishlistLoading } = useWishlist(product.id);
  const { data: hasOutfit } = useProductHasOutfit(product.id);
  const [tryOnModalOpen, setTryOnModalOpen] = useState(false);
  const { toast } = useToast();

  const handleAddToWishlist = async () => {
    requireAuth('add to wishlist', async () => {
      if (!user) return;
      try {
        await addToWishlist(product.id);
        toast({ description: `${product.title} added to your wishlist!` });
      } catch (error) {
        toast({ title: "Error", description: "Failed to add to wishlist.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="group relative bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
      <div 
        className="w-full aspect-[3/4] bg-muted rounded-xl overflow-hidden relative cursor-pointer"
        onClick={() => onProductClick(product.id)}
      >
        <SmartImage
          src={getPrimaryImageUrl(product)}
          alt={product.title}
          className="w-full h-full object-cover"
          sizes="(max-width: 768px) 33vw, 25vw"
        />
        
        {/* Multiple images indicator */}
        {hasMultipleImages(product) && (
          <div className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 opacity-90">
            <Image className="h-2.5 w-2.5" />
            {getImageCount(product)}
          </div>
        )}

        {/* Try On label */}
        {hasOutfit && (
          <div 
            className="absolute top-7 left-1.5 bg-accent text-white text-[9px] px-1.5 py-0.5 rounded-full opacity-90 cursor-pointer hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); setTryOnModalOpen(true); }}
          >
            Try On
          </div>
        )}
        
        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Top-right action buttons */}
        <div className="absolute top-1 right-1 flex flex-col space-y-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm"
            onClick={(e) => { e.stopPropagation(); onLike(product); }}
          >
            <Heart className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm"
            onClick={(e) => { e.stopPropagation(); handleAddToWishlist(); }}
            disabled={wishlistLoading}
          >
            <ShoppingBag className="h-4 w-4" />
          </Button>
          {hasOutfit && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 rounded-full bg-accent/90 hover:bg-accent backdrop-blur-sm"
              onClick={(e) => { e.stopPropagation(); setTryOnModalOpen(true); }}
            >
              <User className="h-4 w-4 text-white" />
            </Button>
          )}
        </div>
        
        {/* Product Info Overlay */}
        <div className="absolute bottom-2 left-2 right-2 bg-white/60 backdrop-blur-sm rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="text-[10px] font-medium line-clamp-1 mb-0.5">{product.title}</div>
          <div className="text-[10px] font-semibold text-primary">
            {formatPrice(product.price_cents, product.currency)}
          </div>
        </div>
      </div>
      
      <ProductTryOnModal
        isOpen={tryOnModalOpen}
        onClose={() => setTryOnModalOpen(false)}
        product={product}
      />
    </div>
  );
};

const BrandDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { requireAuth, showPrompt, setShowPrompt, promptAction } = useGuestGate();

  const { data: brand, isLoading: brandLoading } = useQuery({
    queryKey: ['brand', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Determine brand type
  const isSalonOrAgency = brand?.category === 'salon' || brand?.category === 'agency' || brand?.category === 'studio';
  const isFashionBrand = brand?.category === 'fashion_brand' || !brand?.category;

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['brand-products', brand?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`*, brands!inner(name)`)
        .eq('brand_id', brand.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!brand?.id && !isSalonOrAgency,
  });

  const formatPrice = (cents: number, currency: string = 'USD') => {
    const brandCurrency = brand?.currency || currency;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: brandCurrency
    }).format(cents / 100);
  };

  const handleLike = useCallback(async (product: any) => {
    requireAuth('save likes', async () => {
      if (!user) return;
      try {
        const { error } = await supabase.from('likes').insert([{
          user_id: user.id,
          product_id: product.id
        }]);

        if (error) {
          if (error.code === '23505') {
            await supabase
              .from('likes')
              .update({ created_at: new Date().toISOString() })
              .eq('user_id', user.id)
              .eq('product_id', product.id);
            toast({ description: `${product.title} moved to top of likes!` });
          } else {
            throw error;
          }
        } else {
          toast({ description: `${product.title} added to your likes!` });
        }
        queryClient.invalidateQueries({ queryKey: ['likes'] });
        queryClient.invalidateQueries({ queryKey: ['liked-products'] });
      } catch (error) {
        toast({ title: "Error", description: "Failed to like product.", variant: "destructive" });
      }
    });
  }, [user, toast, queryClient, requireAuth]);

  if (brandLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 w-32 bg-muted rounded mb-8"></div>
            <div className="h-32 bg-muted rounded mb-8"></div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-muted rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container max-w-6xl mx-auto">
          <Button onClick={() => navigate(-1)} variant="ghost" className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-muted-foreground">Brand not found</h1>
            <p className="text-muted-foreground mt-2">The brand you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={`${brand.name} - Luxury Fashion Brand`}
        description={brand.bio || `Discover premium fashion from ${brand.name}. Explore the latest collections and trending styles.`}
      />

      <div className="container max-w-6xl mx-auto p-4">
        <Button onClick={() => navigate(-1)} variant="ghost" className="mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Explore
        </Button>

        {/* Brand Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={brand.logo_url} />
                <AvatarFallback className="text-2xl">{brand.name[0]}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{brand.name}</h1>
                  <Badge variant="secondary">
                    <Star className="h-3 w-3 mr-1" />
                    Featured Brand
                  </Badge>
                </div>
                
                {brand.bio && (
                  <p className="text-muted-foreground mb-4">{brand.bio}</p>
                )}
                
                <div className="flex flex-wrap items-center gap-3">
                  {/* Website Link */}
                  {brand.website && (
                    <Button variant="outline" size="sm" asChild className="gap-2">
                      <a href={brand.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4" />
                        Website
                      </a>
                    </Button>
                  )}
                  
                  {/* Social Links from socials JSONB field */}
                  {(brand.socials as any)?.instagram && (
                    <Button variant="ghost" size="sm" asChild className="h-9 w-9 p-0 rounded-full">
                      <a 
                        href={`https://instagram.com/${(brand.socials as any).instagram}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="Instagram"
                      >
                        <Instagram className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  
                  {(brand.socials as any)?.tiktok && (
                    <Button variant="ghost" size="sm" asChild className="h-9 w-9 p-0 rounded-full">
                      <a 
                        href={`https://tiktok.com/@${(brand.socials as any).tiktok}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="TikTok"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                        </svg>
                      </a>
                    </Button>
                  )}
                  
                  {(brand.socials as any)?.twitter && (
                    <Button variant="ghost" size="sm" asChild className="h-9 w-9 p-0 rounded-full">
                      <a 
                        href={`https://twitter.com/${(brand.socials as any).twitter}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="Twitter"
                      >
                        <Twitter className="h-4 w-4" />
                      </a>
                    </Button>
                  )}

                  {/* Divider if there are social links and product count */}
                  {(brand.website || (brand.socials as any)?.instagram || (brand.socials as any)?.tiktok || (brand.socials as any)?.twitter) && (isFashionBrand || isSalonOrAgency) && (
                    <div className="h-5 w-px bg-border mx-1" />
                  )}
                  
                  {isFashionBrand && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      {products?.length || 0} products
                    </div>
                  )}
                  {isSalonOrAgency && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      {brand.category === 'salon' ? 'Salon & Spa' : 'Marketing Agency'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid - Only for Fashion Brands */}
        {isFashionBrand && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">All Products</h2>
            
            {productsLoading ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl aspect-[3/4]" />
                ))}
              </div>
            ) : products && products.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
                {products.map((product) => (
                  <BrandProductCard
                    key={product.id}
                    product={product}
                    onProductClick={(id) => navigate(`/p/${id}`)}
                    onLike={handleLike}
                    formatPrice={formatPrice}
                    user={user}
                    requireAuth={requireAuth}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Products Yet</h3>
                <p className="text-muted-foreground">This brand hasn't added any products yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Portfolio Gallery - For Salons & Marketing Agencies */}
        {isSalonOrAgency && brand?.id && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Past Work</h2>
            <PortfolioGallery brandId={brand.id} showEmptyState={false} />
          </div>
        )}
      </div>

      <GuestActionPrompt 
        open={showPrompt} 
        onOpenChange={setShowPrompt} 
        action={promptAction} 
      />
    </div>
  );
};

export default BrandDetail;