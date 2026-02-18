import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SmartImage } from '@/components/SmartImage';
import { PostProductCircles } from '@/components/PostProductCircles';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface UserPost {
  id: string;
  content?: string;
  user?: {
    id?: string;
    name?: string;
    avatar_url?: string;
  };
  images: { image_url: string }[];
  products: {
    image_url?: string | null;
    title?: string;
    product_id?: string | null;
    external_url?: string | null;
  }[];
}

interface UserPostBlockProps {
  posts: UserPost[];
}

export const UserPostBlock: React.FC<UserPostBlockProps> = ({ posts }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!posts || posts.length === 0) return null;

  const post = posts[currentIndex];
  const userName = post.user?.name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  const imageUrl = post.images?.[0]?.image_url;

  if (!imageUrl) return null;

  const hasPrev = posts.length > 1;
  const hasNext = posts.length > 1;

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % posts.length);
  };

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + posts.length) % posts.length);
  };

  return (
    <section className="col-span-full py-2 my-1">
      {/* User header */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <button onClick={() => post.user?.id && navigate(`/profile/${post.user.id}`)}>
          <Avatar className="h-7 w-7 border border-border">
            <AvatarImage src={post.user?.avatar_url} />
            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
              {userInitial}
            </AvatarFallback>
          </Avatar>
        </button>
        <button
          onClick={() => post.user?.id && navigate(`/profile/${post.user.id}`)}
          className="text-xs font-medium text-foreground hover:underline"
        >
          {userName}
        </button>
      </div>

      {/* Post image with navigation arrows and product circles */}
      <div className="relative rounded-xl overflow-hidden bg-muted border border-border shadow-sm">
        <div
          className="cursor-pointer"
          onClick={() => post.user?.id && navigate(`/profile/${post.user.id}`)}
        >
          <SmartImage
            src={imageUrl}
            alt={post.content || 'Post'}
            className="w-full h-auto object-cover max-h-[260px] lg:max-h-[340px]"
          />
        </div>

        {/* Navigation arrows */}
        {hasPrev && (
          <button
            onClick={goPrev}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={goNext}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Dot indicators */}
        {posts.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {posts.slice(0, 5).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentIndex % 5 ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}

        {post.products.length > 0 && (
          <PostProductCircles
            products={post.products}
            maxVisible={3}
            onProductClick={(product) => {
              if (product.product_id) {
                navigate(`/p/${product.product_id}`);
              }
            }}
          />
        )}
      </div>

      {/* Caption */}
      {post.content && (
        <p className="text-xs text-muted-foreground mt-2 px-1 line-clamp-2">
          <span className="font-medium text-foreground">{userName}</span>{' '}
          {post.content}
        </p>
      )}
    </section>
  );
};

export default UserPostBlock;
