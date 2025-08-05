
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Calendar, Tag, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AffiliateCodeCardProps {
  brand_name: string;
  description?: string | null;
  affiliate_code?: string | null;
  affiliate_url: string;
  expiry_date?: string | null;
  clicks: number;
  orders: number;
  onLinkClick: () => void;
}

const AffiliateCodeCard: React.FC<AffiliateCodeCardProps> = ({
  brand_name,
  description,
  affiliate_code,
  affiliate_url,
  expiry_date,
  clicks,
  orders,
  onLinkClick
}) => {
  const isExpired = expiry_date && new Date(expiry_date) < new Date();

  const copyCode = () => {
    if (affiliate_code) {
      navigator.clipboard.writeText(affiliate_code);
      toast({
        title: "Code Copied!",
        description: `${brand_name} affiliate code copied to clipboard.`
      });
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(affiliate_url);
    toast({
      title: "Link Copied!",
      description: `${brand_name} affiliate link copied to clipboard.`
    });
  };

  return (
    <Card className={`group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 shadow-md bg-gradient-to-br from-white to-gray-50 overflow-hidden ${
      isExpired ? 'opacity-60' : ''
    }`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-xl text-gray-900">{brand_name}</h3>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>
            {isExpired && (
              <Badge variant="destructive" className="mb-2">
                Expired
              </Badge>
            )}
          </div>
          <div className="text-right text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
            <div className="font-medium">{clicks} uses</div>
            <div>{orders} orders</div>
          </div>
        </div>
        
        {description && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {description}
          </p>
        )}

        {affiliate_code && (
          <div className="bg-gradient-to-r from-pink-100 to-purple-100 p-4 rounded-lg mb-4 border border-pink-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-pink-600" />
                  <span className="text-sm font-medium text-pink-800">Exclusive Discount Code</span>
                </div>
                <div className="text-2xl font-bold font-mono text-pink-800 tracking-wider bg-white px-3 py-1 rounded border-2 border-dashed border-pink-300">
                  {affiliate_code}
                </div>
              </div>
              <Button
                size="sm"
                onClick={copyCode}
                className="bg-pink-600 hover:bg-pink-700 text-white shrink-0 shadow-md"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Code
              </Button>
            </div>
          </div>
        )}
        
        {expiry_date && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 bg-yellow-50 p-2 rounded">
            <Calendar className="h-4 w-4 text-yellow-600" />
            <span className="text-yellow-700">Valid until {new Date(expiry_date).toLocaleDateString()}</span>
          </div>
        )}
        
        <div className="space-y-2">
          <Button 
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold py-3 shadow-lg"
            onClick={onLinkClick}
            disabled={isExpired}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Shop {brand_name} Now
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full hover:bg-gray-50"
            onClick={copyLink}
          >
            <Copy className="h-3 w-3 mr-2" />
            Share Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AffiliateCodeCard;
