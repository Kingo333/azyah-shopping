
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Calendar, Tag, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PublicAffiliateCardProps {
  brand_name: string;
  description?: string | null;
  affiliate_code?: string | null;
  affiliate_url: string;
  expiry_date?: string | null;
  onLinkClick: () => void;
}

const PublicAffiliateCard: React.FC<PublicAffiliateCardProps> = ({
  brand_name,
  description,
  affiliate_code,
  affiliate_url,
  expiry_date,
  onLinkClick
}) => {
  const isExpired = expiry_date && new Date(expiry_date) < new Date();

  const copyCode = () => {
    if (affiliate_code) {
      navigator.clipboard.writeText(affiliate_code);
      toast({
        title: "Code Copied!",
        description: `${affiliate_code} copied to clipboard.`
      });
    }
  };

  const handleShopNow = () => {
    onLinkClick();
    window.open(affiliate_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className={`group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 shadow-md bg-gradient-to-br from-white to-gray-50 overflow-hidden rounded-2xl ${
      isExpired ? 'opacity-60' : ''
    }`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="font-bold text-xl text-gray-900 font-playfair mb-1">{brand_name}</h3>
            {isExpired && (
              <Badge variant="destructive" className="mb-2 rounded-full">
                Expired
              </Badge>
            )}
          </div>
        </div>
        
        {description && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {description}
          </p>
        )}

        {affiliate_code && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-xl mb-4 border border-[#A30000]/20">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-[#A30000] flex-shrink-0" />
                  <span className="text-sm font-medium text-[#A30000]">Exclusive Code</span>
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold font-mono text-[#A30000] tracking-wider bg-white px-2 sm:px-3 py-1 rounded-lg border-2 border-dashed border-[#A30000]/30 break-all">
                  {affiliate_code}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyCode}
                className="ml-3 border-[#A30000]/30 text-[#A30000] hover:bg-[#A30000]/10 rounded-xl flex-shrink-0"
              >
                <Copy className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Copy Code</span>
                <span className="sm:hidden">Copy</span>
              </Button>
            </div>
          </div>
        )}
        
        {expiry_date && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 bg-yellow-50 p-2 rounded-xl">
            <Calendar className="h-4 w-4 text-yellow-600 flex-shrink-0" />
            <span className="text-yellow-700">Valid until {new Date(expiry_date).toLocaleDateString()}</span>
          </div>
        )}
        
        <Button 
          onClick={handleShopNow}
          disabled={isExpired}
          className="w-full bg-gradient-to-r from-[#A30000] to-red-600 hover:from-[#A30000]/90 hover:to-red-600/90 text-white font-semibold py-3 shadow-lg rounded-xl transition-all duration-200"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Shop {brand_name} Now
        </Button>
      </CardContent>
    </Card>
  );
};

export default PublicAffiliateCard;
