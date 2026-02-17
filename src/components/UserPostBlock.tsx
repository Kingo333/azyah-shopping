import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SmartImage } from '@/components/SmartImage';
import { PostProductCircles } from '@/components/PostProductCircles';

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
  post: UserPost;
}

export const UserPostBlock: React.FC<UserPostBlockProps> = ({ post }) => {
  const navigate = useNavigate();
  const userName = post.user?.name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  const imageUrl = post.images?.[0]?.image_url;

  if (!imageUrl) return null;

  return (
    <section className="col-span-full py-3 my-1">
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

      {/* Post image with product circles */}
      <div className="relative rounded-xl overflow-hidden bg-muted border border-border shadow-sm">
        <SmartImage
          src={imageUrl}
          alt={post.content || 'Post'}
          className="w-full h-auto object-cover max-h-[400px]"
        />
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
