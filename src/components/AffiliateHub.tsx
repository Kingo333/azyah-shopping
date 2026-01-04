import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Copy,
  ExternalLink,
  Edit,
  Trash2,
  Link,
  Calendar,
  Eye,
  EyeOff,
  Tag,
  ChevronDown,
  ChevronUp,
  Share2
} from 'lucide-react';
import { openExternalUrl } from '@/lib/openExternalUrl';

interface AffiliateLink {
  id: string;
  user_id: string;
  brand_name: string;
  description: string | null;
  affiliate_url: string;
  affiliate_code: string | null;
  expiry_date: string | null;
  is_public: boolean;
  clicks: number;
  orders: number;
  revenue_cents: number;
  commission_rate: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface AffiliateHubProps {
  showTitle?: boolean;
}

const AffiliateHub: React.FC<AffiliateHubProps> = ({ showTitle = true }) => {
  const { user } = useAuth();
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<AffiliateLink | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [formData, setFormData] = useState({
    brand_name: '',
    description: '',
    affiliate_url: '',
    affiliate_code: '',
    expiry_date: '',
    is_public: false
  });

  useEffect(() => {
    if (user) {
      fetchAffiliateLinks();
    }
  }, [user]);

  const fetchAffiliateLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_links')
        .select('*')
        .eq('user_id', user?.id)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Fetched affiliate links:', data);
      setLinks(data || []);
    } catch (error) {
      console.error('Error fetching affiliate links:', error);
      toast({
        title: "Error", 
        description: "Failed to fetch affiliate links",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const linkData = {
        user_id: user.id,
        brand_name: formData.brand_name,
        description: formData.description || null,
        affiliate_url: formData.affiliate_url,
        affiliate_code: formData.affiliate_code || null,
        expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : null,
        is_public: formData.is_public,
        active: true
      };

      let result;
      if (editingLink) {
        result = await supabase
          .from('affiliate_links')
          .update(linkData)
          .eq('id', editingLink.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('affiliate_links')
          .insert(linkData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      toast({
        title: editingLink ? "Link Updated" : "Link Created",
        description: `Affiliate link for ${formData.brand_name} has been ${editingLink ? 'updated' : 'created'}.`
      });

      setIsModalOpen(false);
      setEditingLink(null);
      setFormData({
        brand_name: '',
        description: '',
        affiliate_url: '',
        affiliate_code: '',
        expiry_date: '',
        is_public: false
      });
      fetchAffiliateLinks();
    } catch (error) {
      console.error('Error saving affiliate link:', error);
      toast({
        title: "Error",
        description: "Failed to save affiliate link",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (link: AffiliateLink) => {
    setEditingLink(link);
    setFormData({
      brand_name: link.brand_name,
      description: link.description || '',
      affiliate_url: link.affiliate_url,
      affiliate_code: link.affiliate_code || '',
      expiry_date: link.expiry_date ? new Date(link.expiry_date).toISOString().split('T')[0] : '',
      is_public: link.is_public
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('affiliate_links')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Link Deleted",
        description: "Affiliate link has been deleted."
      });
      fetchAffiliateLinks();
    } catch (error) {
      console.error('Error deleting affiliate link:', error);
      toast({
        title: "Error",
        description: "Failed to delete affiliate link",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied!",
      description: "Affiliate link copied to clipboard."
    });
  };

  const copyAffiliateCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Affiliate code copied to clipboard."
    });
  };

  const copyPublicPageLink = () => {
    const publicUrl = `${window.location.origin}/affiliate/${user?.id}`;
    navigator.clipboard.writeText(publicUrl);
    toast({
      title: "Copied!",
      description: "Public affiliate page link copied to clipboard."
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  if (!user) return null;

  const publicLinksCount = links.filter(link => link.is_public).length;

  return (
    <Card className="w-full">
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Affiliate Hub
              </div>
              <div className="flex items-center gap-2">
                {publicLinksCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyPublicPageLink();
                    }}
                    className="h-8 hidden sm:flex"
                  >
                    <Share2 className="h-3 w-3 mr-1" />
                    Share Page
                  </Button>
                )}
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-semibold font-playfair">My Affiliate Links</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your affiliate partnerships
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingLink(null)} size="sm" className="rounded-xl btn-cartier">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Link
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingLink ? 'Edit' : 'Add'} Affiliate Link
                      </DialogTitle>
                      <DialogDescription>
                        {editingLink ? 'Update your' : 'Create a new'} affiliate link details.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="brand_name">Brand Name</Label>
                        <Input
                          id="brand_name"
                          value={formData.brand_name}
                          onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Optional description"
                        />
                      </div>
                      <div>
                        <Label htmlFor="affiliate_url">Affiliate URL</Label>
                        <Input
                          id="affiliate_url"
                          type="url"
                          value={formData.affiliate_url}
                          onChange={(e) => setFormData({ ...formData, affiliate_url: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="affiliate_code">Affiliate Code</Label>
                        <Input
                          id="affiliate_code"
                          value={formData.affiliate_code}
                          onChange={(e) => setFormData({ ...formData, affiliate_code: e.target.value })}
                          placeholder="e.g., SAVE20, NEWUSER15"
                        />
                      </div>
                      <div>
                        <Label htmlFor="expiry_date">Expiry Date (Optional)</Label>
                        <Input
                          id="expiry_date"
                          type="date"
                          value={formData.expiry_date}
                          onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_public"
                          checked={formData.is_public}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                        />
                        <Label htmlFor="is_public">Make Public</Label>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" className="btn-cartier">
                          {editingLink ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                {publicLinksCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyPublicPageLink}
                    className="sm:hidden rounded-xl"
                  >
                    <Share2 className="h-3 w-3 mr-1" />
                    Share Page
                  </Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : links.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No affiliate links yet. Create your first one!
              </div>
            ) : (
              <div className="space-y-3">
                {links.map((link) => (
                  <Card key={link.id} className="p-4 rounded-xl border-0 shadow-md bg-gradient-to-br from-white to-gray-50">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h4 className="font-semibold truncate font-playfair">{link.brand_name}</h4>
                              <Badge variant={link.is_public ? "default" : "secondary"} className="rounded-full">
                                {link.is_public ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                                {link.is_public ? 'Public' : 'Private'}
                              </Badge>
                              {link.expiry_date && new Date(link.expiry_date) < new Date() && (
                                <Badge variant="destructive" className="rounded-full">Expired</Badge>
                              )}
                            </div>
                            {link.description && (
                              <p className="text-sm text-muted-foreground mb-2 break-words">{link.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(link.affiliate_url)}
                              className="h-8 w-8 p-0 rounded-lg"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openExternalUrl(link.affiliate_url)}
                              className="h-8 w-8 p-0 rounded-lg"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(link)}
                              className="h-8 w-8 p-0 rounded-lg"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(link.id)}
                              className="h-8 w-8 p-0 rounded-lg"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {link.affiliate_code && (
                          <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-red-50 to-pink-50 p-3 rounded-lg border border-[#A30000]/20">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Tag className="h-3 w-3 text-[#A30000] flex-shrink-0" />
                              <span className="text-sm font-mono bg-white px-2 py-1 rounded border-dashed border border-[#A30000]/30 truncate">
                                {link.affiliate_code}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[#A30000] hover:bg-[#A30000]/10 rounded-lg flex-shrink-0"
                              onClick={() => copyAffiliateCode(link.affiliate_code!)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span>Clicks: {link.clicks}</span>
                          <span>Orders: {link.orders}</span>
                          <span>Revenue: {formatCurrency(link.revenue_cents)}</span>
                          {link.expiry_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Expires: {new Date(link.expiry_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {publicLinksCount > 0 && (
              <div className="pt-4 border-t rounded-xl">
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-sm font-medium font-playfair">Your Public Affiliate Page</p>
                    <p className="text-xs text-muted-foreground">
                      Share this link on social media to promote your affiliate codes
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyPublicPageLink}
                      className="rounded-xl"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/affiliate/${user.id}`, '_blank')}
                      className="rounded-xl"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default AffiliateHub;
