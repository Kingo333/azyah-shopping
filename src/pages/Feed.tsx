import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { BackButton } from '@/components/ui/back-button';
import { useToast } from '@/hooks/use-toast';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  Search, 
  Filter,
  Bookmark,
  TrendingUp,
  ShoppingBag,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface FeedPost {
  id: string;
  user: {
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
  images: string[];
  likes: number;
  comments: number;
  tags: string[];
  timestamp: string;
  products?: {
    id: string;
    title: string;
    price: number;
    brand: string;
    image: string;
  }[];
}

const Feed: React.FC = () => {
  const { signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Mock feed data
  const feedPosts: FeedPost[] = [
    {
      id: '1',
      user: {
        name: 'Sarah Al-Zahra',
        username: '@sarah_style',
        avatar: '/placeholder.svg'
      },
      content: 'Just got this amazing kaftan from @elegantabayas! Perfect for the upcoming Eid celebrations ✨',
      images: ['/placeholder.svg'],
      likes: 245,
      comments: 18,
      tags: ['#eid', '#kaftan', '#modest', '#style'],
      timestamp: '2h ago',
      products: [
        {
          id: '1',
          title: 'Embroidered Silk Kaftan',
          price: 29900,
          brand: 'Elegant Abayas',
          image: '/placeholder.svg'
        }
      ]
    },
    {
      id: '2',
      user: {
        name: 'Layla Fashion',
        username: '@layla_fashion',
        avatar: '/placeholder.svg'
      },
      content: 'Styling tip: Layer your statement jewelry for a bold look! What do you think? 💎',
      images: ['/placeholder.svg', '/placeholder.svg'],
      likes: 189,
      comments: 32,
      tags: ['#jewelry', '#styling', '#gold', '#layering'],
      timestamp: '4h ago'
    },
    {
      id: '3',
      user: {
        name: 'Fatima Style',
        username: '@fatima_chic',
        avatar: '/placeholder.svg'
      },
      content: 'Found the perfect hijab to match my new abaya! Love this color combination 🌸',
      images: ['/placeholder.svg'],
      likes: 156,
      comments: 24,
      tags: ['#hijab', '#abaya', '#pink', '#coordination'],
      timestamp: '6h ago',
      products: [
        {
          id: '2',
          title: 'Premium Chiffon Hijab',
          price: 4900,
          brand: 'Modest Elegance',
          image: '/placeholder.svg'
        },
        {
          id: '3',
          title: 'Classic Black Abaya',
          price: 15900,
          brand: 'Modest Elegance',
          image: '/placeholder.svg'
        }
      ]
    }
  ];

  const handleLike = (postId: string) => {
    const newLikedPosts = new Set(likedPosts);
    if (likedPosts.has(postId)) {
      newLikedPosts.delete(postId);
    } else {
      newLikedPosts.add(postId);
    }
    setLikedPosts(newLikedPosts);
    toast({
      description: likedPosts.has(postId) ? "Removed from likes" : "Added to likes"
    });
  };

  const handleSave = (postId: string) => {
    const newSavedPosts = new Set(savedPosts);
    if (savedPosts.has(postId)) {
      newSavedPosts.delete(postId);
    } else {
      newSavedPosts.add(postId);
    }
    setSavedPosts(newSavedPosts);
    toast({
      description: savedPosts.has(postId) ? "Removed from saved" : "Saved to collection"
    });
  };

  const handleShare = (postId: string) => {
    toast({ description: "Link copied to clipboard!" });
  };

  const formatPrice = (cents: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const filteredPosts = feedPosts.filter(post =>
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    post.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl p-4">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BackButton />
              <h1 className="text-2xl font-bold">Fashion Feed</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Trending
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => signOut()}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts, tags, or users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Feed Posts */}
        <div className="space-y-6">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={post.user.avatar} />
                    <AvatarFallback>{post.user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{post.user.name}</h3>
                      <span className="text-sm text-muted-foreground">{post.user.username}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{post.timestamp}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Bookmark className={`h-4 w-4 ${savedPosts.has(post.id) ? 'fill-current' : ''}`} 
                      onClick={() => handleSave(post.id)} />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Post Content */}
                <p className="text-sm leading-relaxed">{post.content}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Images */}
                <div className={`grid gap-2 ${post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {post.images.map((image, index) => (
                    <div key={index} className="aspect-square bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={image} 
                        alt={`Post image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>

                {/* Tagged Products */}
                {post.products && post.products.length > 0 && (
                  <div className="border rounded-lg p-3 bg-muted/50">
                    <h4 className="text-sm font-medium mb-3">Shop the Look</h4>
                    <div className="grid gap-3">
                      {post.products.map((product) => (
                        <div key={product.id} className="flex items-center gap-3">
                          <div className="w-16 h-16 bg-background rounded-lg overflow-hidden">
                            <img 
                              src={product.image} 
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.title}</p>
                            <p className="text-xs text-muted-foreground">{product.brand}</p>
                            <p className="text-sm font-semibold">{formatPrice(product.price)}</p>
                          </div>
                          <Button size="sm" variant="outline">
                            <ShoppingBag className="h-3 w-3 mr-1" />
                            Shop
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleLike(post.id)}
                      className="gap-2"
                    >
                      <Heart className={`h-4 w-4 ${likedPosts.has(post.id) ? 'fill-current text-red-500' : ''}`} />
                      {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <MessageCircle className="h-4 w-4" />
                      {post.comments}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleShare(post.id)}
                    >
                      <Share className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts found matching your search.</p>
            <Button variant="outline" className="mt-4" onClick={() => setSearchQuery('')}>
              Clear Search
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;