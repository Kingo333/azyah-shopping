import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Package, Store, UserPlus, UserMinus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SearchResult {
  id: string;
  type: 'product' | 'user' | 'brand';
  title: string;
  subtitle?: string;
  image?: string;
  isFollowing?: boolean;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('products');

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];

      // Search products
      const { data: products } = await supabase
        .from('products')
        .select('id, title, description, media_urls, brand:brands(name)')
        .ilike('title', `%${searchQuery}%`)
        .eq('status', 'active')
        .limit(10);

      if (products) {
        searchResults.push(...products.map(product => ({
          id: product.id,
          type: 'product' as const,
          title: product.title,
          subtitle: product.brand?.name,
          image: product.media_urls?.[0]
        })));
      }

      // Search users (shoppers)
      const { data: users } = await supabase
        .from('users')
        .select('id, name, email, avatar_url')
        .ilike('name', `%${searchQuery}%`)
        .eq('role', 'shopper')
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
          title: userData.name || userData.email.split('@')[0],
          subtitle: userData.email,
          image: userData.avatar_url,
          isFollowing: followingIds.has(userData.id)
        })));
      }

      // Search brands
      const { data: brands } = await supabase
        .from('brands')
        .select('id, name, bio, logo_url')
        .ilike('name', `%${searchQuery}%`)
        .limit(10);

      if (brands) {
        searchResults.push(...brands.map(brand => ({
          id: brand.id,
          type: 'brand' as const,
          title: brand.name,
          subtitle: brand.bio,
          image: brand.logo_url
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

  const filterResultsByType = (type: string) => {
    return results.filter(result => result.type === type);
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

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Products ({filterResultsByType('product').length})
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Shoppers ({filterResultsByType('user').length})
              </TabsTrigger>
              <TabsTrigger value="brands" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Brands ({filterResultsByType('brand').length})
              </TabsTrigger>
            </TabsList>

            <div className="max-h-96 overflow-y-auto">
              <TabsContent value="products" className="space-y-2">
                {filterResultsByType('product').map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    {result.image && (
                      <img src={result.image} alt={result.title} className="w-12 h-12 rounded-lg object-cover" />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium">{result.title}</h4>
                      {result.subtitle && (
                        <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                      )}
                    </div>
                    <Badge variant="outline">Product</Badge>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="users" className="space-y-2">
                {filterResultsByType('user').map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted"
                  >
                    <Avatar>
                      <AvatarImage src={result.image} />
                      <AvatarFallback>{result.title.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium">{result.title}</h4>
                      {result.subtitle && (
                        <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                      )}
                    </div>
                    <Button
                      variant={result.isFollowing ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleFollow(result.id, result.isFollowing || false)}
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
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="brands" className="space-y-2">
                {filterResultsByType('brand').map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    {result.image && (
                      <img src={result.image} alt={result.title} className="w-12 h-12 rounded-lg object-cover" />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium">{result.title}</h4>
                      {result.subtitle && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{result.subtitle}</p>
                      )}
                    </div>
                    <Badge variant="outline">Brand</Badge>
                  </div>
                ))}
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