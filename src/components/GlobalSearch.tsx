import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Package, Store, UserPlus, UserMinus, ImageOff } from 'lucide-react';
import { SmartImage } from '@/components/SmartImage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';

interface SearchResult {
  id: string;
  type: 'product' | 'user' | 'brand';
  title: string;
  subtitle?: string;
  image?: string;
  isFollowing?: boolean;
  slug?: string; // For brands
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialTab?: 'products' | 'users' | 'brands';
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ 
  isOpen, 
  onClose, 
  initialQuery = '',
  initialTab = 'products'
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync with initialQuery when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setActiveTab(initialTab);
    }
  }, [isOpen, initialQuery, initialTab]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];

      // Search products - get full product data for proper image handling
      const { data: products } = await supabase
        .from('products')
        .select('id, title, description, media_urls, image_url, brand:brands(name)')
        .ilike('title', `%${searchQuery}%`)
        .eq('status', 'active')
        .limit(10);

      if (products) {
        searchResults.push(...products.map(product => ({
          id: product.id,
          type: 'product' as const,
          title: product.title,
          subtitle: product.brand?.name,
          image: getPrimaryImageUrl(product) // Use consistent image helper
        })));
      }

      // Search users (shoppers) using public profiles
      const { data: users } = await supabase
        .from('public_profiles')
        .select('id, name, avatar_url')
        .ilike('name', `%${searchQuery}%`)
        .limit(10);

      if (users && user) {
        // Check follow status for each user
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .in('following_id', users.map(u => u.id));

        const followingIds = new Set(follows?.map(f => f.following_id) || []);

        searchResults.push(...users.map(userData => ({
          id: userData.id,
          type: 'user' as const,
          title: userData.name || 'Anonymous User',
          subtitle: 'Fashion Enthusiast',
          image: userData.avatar_url || undefined,
          isFollowing: followingIds.has(userData.id)
        })));
      } else if (users) {
        // For non-logged in users, still show user results
        searchResults.push(...users.map(userData => ({
          id: userData.id,
          type: 'user' as const,
          title: userData.name || 'Anonymous User',
          subtitle: 'Fashion Enthusiast',
          image: userData.avatar_url || undefined,
          isFollowing: false
        })));
      }

      // Search brands
      const { data: brands } = await supabase
        .from('brands')
        .select('id, name, bio, logo_url, slug')
        .ilike('name', `%${searchQuery}%`)
        .limit(10);

      if (brands) {
        searchResults.push(...brands.map(brand => ({
          id: brand.id,
          type: 'brand' as const,
          title: brand.name,
          subtitle: brand.bio,
          image: brand.logo_url || undefined,
          slug: brand.slug
        })));
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [query]);

  const handleFollow = async (userId: string, isCurrentlyFollowing: boolean) => {
    if (!user) return;

    try {
      if (isCurrentlyFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: userId });
      }

      // Update local state
      setResults(prev => prev.map(result => 
        result.id === userId && result.type === 'user'
          ? { ...result, isFollowing: !isCurrentlyFollowing }
          : result
      ));

      toast({
        description: isCurrentlyFollowing ? 'Unfollowed user' : 'Following user'
      });
    } catch (error) {
      toast({
        description: 'Failed to update follow status',
        variant: 'destructive'
      });
    }
  };

  // Save search state to sessionStorage before navigating
  const saveSearchState = () => {
    sessionStorage.setItem('globalSearchState', JSON.stringify({
      query,
      tab: activeTab,
      returnToDashboard: true
    }));
  };

  const handleProductClick = (productId: string) => {
    saveSearchState();
    onClose();
    navigate(`/p/${productId}`);
  };

  const handleBrandClick = (brandSlug: string) => {
    saveSearchState();
    onClose();
    navigate(`/brand/${brandSlug}`);
  };

  const handleUserClick = (userId: string) => {
    saveSearchState();
    onClose();
    navigate(`/profile/${userId}`);
  };

  const filterResultsByType = (type: string) => {
    return results.filter(result => result.type === type);
  };

  // Helper to render image with fallback
  const renderResultImage = (result: SearchResult, size: string = 'w-12 h-12') => {
    if (result.image && result.image !== '/placeholder.svg') {
      return (
        <SmartImage 
          src={result.image} 
          alt={result.title} 
          className={`${size} rounded-lg object-cover`} 
          sizes="48px" 
        />
      );
    }
    
    // Show placeholder with icon based on type
    return (
      <div className={`${size} rounded-lg bg-muted flex items-center justify-center`}>
        {result.type === 'product' && <ImageOff className="h-5 w-5 text-muted-foreground" />}
        {result.type === 'brand' && <Store className="h-5 w-5 text-muted-foreground" />}
        {result.type === 'user' && <Users className="h-5 w-5 text-muted-foreground" />}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Global Search
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products, users, brands..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'products' | 'users' | 'brands')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Products
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Shoppers
              </TabsTrigger>
              <TabsTrigger value="brands" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Brands
              </TabsTrigger>
            </TabsList>

            <div className="max-h-96 overflow-y-auto">
              <TabsContent value="products" className="space-y-2">
                {filterResultsByType('product').map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => handleProductClick(result.id)}
                  >
                    {renderResultImage(result)}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{result.title}</h4>
                      {result.subtitle && (
                        <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <Badge variant="outline">Product</Badge>
                  </div>
                ))}
                {!loading && query && filterResultsByType('product').length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No products found
                  </div>
                )}
              </TabsContent>

              <TabsContent value="users" className="space-y-2">
                {filterResultsByType('user').map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted"
                  >
                    <Avatar 
                      className="cursor-pointer" 
                      onClick={() => handleUserClick(result.id)}
                    >
                      <AvatarImage src={result.image} />
                      <AvatarFallback>{result.title.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div 
                      className="flex-1 cursor-pointer min-w-0" 
                      onClick={() => handleUserClick(result.id)}
                    >
                      <h4 className="font-medium truncate">{result.title}</h4>
                      {result.subtitle && (
                        <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                    {user && (
                      <Button
                        variant={result.isFollowing ? "outline" : "default"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollow(result.id, result.isFollowing || false);
                        }}
                      >
                        {result.isFollowing ? (
                          <>
                            <UserMinus className="h-4 w-4 mr-1" />
                            Unfollow
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Follow
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ))}
                {!loading && query && filterResultsByType('user').length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No shoppers found
                  </div>
                )}
              </TabsContent>

              <TabsContent value="brands" className="space-y-2">
                {filterResultsByType('brand').map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => handleBrandClick(result.slug || result.id)}
                  >
                    {result.image ? (
                      <SmartImage 
                        src={result.image} 
                        alt={result.title} 
                        className="w-12 h-12 rounded-lg object-cover" 
                        sizes="48px" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <Store className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{result.title}</h4>
                      {result.subtitle && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{result.subtitle}</p>
                      )}
                    </div>
                    <Badge variant="outline">Brand</Badge>
                  </div>
                ))}
                {!loading && query && filterResultsByType('brand').length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No brands found
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>

          {loading && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No results found for "{query}"
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;
