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
  EyeOff
} from 'lucide-react';

interface AffiliateLink {
  id: string;
  user_id: string;
  brand_name: string;
  description: string | null;
  affiliate_url: string;
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
  const [formData, setFormData] = useState({
    brand_name: '',
    description: '',
    affiliate_url: '',
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
        .order('created_at', { ascending: false });

      if (error) throw error;
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
        expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : null,
        is_public: formData.is_public
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
      expiry_date: link.expiry_date ? new Date(link.expiry_date).toISOString().split('T')[0] : '',
      is_public: link.is_public
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('affiliate_links')
        .delete()
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

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  if (!user) return null;

  return (
    <Card className="w-full">
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Affiliate Hub
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">My Affiliate Links</h3>
            <p className="text-sm text-muted-foreground">
              Manage your affiliate partnerships
            </p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingLink(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
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
                  <Button type="submit">
                    {editingLink ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
              <Card key={link.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{link.brand_name}</h4>
                      <Badge variant={link.is_public ? "default" : "secondary"}>
                        {link.is_public ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                        {link.is_public ? 'Public' : 'Private'}
                      </Badge>
                      {link.expiry_date && new Date(link.expiry_date) < new Date() && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>
                    {link.description && (
                      <p className="text-sm text-muted-foreground mb-2">{link.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(link.affiliate_url)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(link.affiliate_url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(link)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(link.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Public affiliate page: 
            <span className="font-mono bg-muted px-1 rounded ml-1">
              /affiliate/{user.id}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AffiliateHub;