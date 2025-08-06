import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Plus, Edit, Trash2, ExternalLink, Copy, Eye, TrendingUp, Users, MousePointer } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AffiliateCodeCard from '@/components/AffiliateCodeCard';

interface AffiliateLink {
  id: string;
  brand_name: string;
  description: string | null;
  affiliate_url: string;
  affiliate_code: string | null;
  expiry_date: string | null;
  is_public: boolean;
  active: boolean;
  clicks: number;
  orders: number;
  created_at: string;
}

const AffiliateHub: React.FC = () => {
  const { user } = useAuth();
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLink, setEditingLink] = useState<AffiliateLink | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    brand_name: '',
    description: '',
    affiliate_url: '',
    affiliate_code: '',
    expiry_date: undefined as Date | undefined,
    is_public: true,
    active: true
  });

  useEffect(() => {
    if (user) {
      loadAffiliateLinks();
    }
  }, [user]);

  const loadAffiliateLinks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('affiliate_links')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error loading affiliate links:', error);
      toast({
        title: "Error",
        description: "Failed to load affiliate links",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: string) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSwitchChange = (checked: boolean, field: string) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    setFormData(prev => ({ ...prev, expiry_date: date }));
  };

  const resetForm = () => {
    setFormData({
      brand_name: '',
      description: '',
      affiliate_url: '',
      affiliate_code: '',
      expiry_date: undefined,
      is_public: true,
      active: true
    });
    setEditingLink(null);
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
        expiry_date: formData.expiry_date ? formData.expiry_date.toISOString() : null,
        is_public: formData.is_public,
        active: formData.active
      };

      if (editingLink) {
        const { error } = await supabase
          .from('affiliate_links')
          .update(linkData)
          .eq('id', editingLink.id);

        if (error) throw error;
        toast({
          title: "Link Updated",
          description: "Your affiliate link has been updated successfully."
        });
      } else {
        const { error } = await supabase
          .from('affiliate_links')
          .insert([linkData]);

        if (error) throw error;
        toast({
          title: "Link Added",
          description: "Your new affiliate link has been added successfully."
        });
      }

      resetForm();
      setShowAddForm(false);
      loadAffiliateLinks();
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
      expiry_date: link.expiry_date ? new Date(link.expiry_date) : undefined,
      is_public: link.is_public,
      active: link.active
    });
    setShowAddForm(true);
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
        description: "Your affiliate link has been deleted."
      });
      loadAffiliateLinks();
    } catch (error) {
      console.error('Error deleting affiliate link:', error);
      toast({
        title: "Error",
        description: "Failed to delete affiliate link",
        variant: "destructive"
      });
    }
  };

  const copyPublicLink = (userId: string) => {
    const publicUrl = `${window.location.origin}/affiliate/${userId}`;
    navigator.clipboard.writeText(publicUrl);
    toast({
      title: "Link Copied!",
      description: "Your public affiliate page link has been copied to clipboard."
    });
  };

  const handleLinkClick = async (linkId: string, url: string) => {
    try {
      const currentLink = links.find(l => l.id === linkId);
      const { error } = await supabase
        .from('affiliate_links')
        .update({ clicks: (currentLink?.clicks || 0) + 1 })
        .eq('id', linkId);
        
      if (error) {
        console.error('Error tracking click:', error);
      }
      
      // Update local state
      setLinks(prev => prev.map(link => 
        link.id === linkId 
          ? { ...link, clicks: link.clicks + 1 }
          : link
      ));
      
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
  const totalOrders = links.reduce((sum, link) => sum + link.orders, 0);
  const activeLinks = links.filter(link => link.active).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-playfair bg-gradient-to-r from-accent-cartier to-red-600 bg-clip-text text-transparent">
            Affiliate Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your affiliate links and track performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => copyPublicLink(user?.id || '')}
            className="border-accent-cartier/30 text-accent-cartier hover:bg-accent-cartier/10"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Share Public Page
          </Button>
          <Button 
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-accent-cartier to-red-600 hover:from-accent-cartier/90 hover:to-red-600/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Link
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-accent-cartier/20">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MousePointer className="h-4 w-4 text-accent-cartier" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clicks</p>
                <p className="text-2xl font-bold text-accent-cartier">{totalClicks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-accent-cartier/20">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold text-green-600">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-accent-cartier/20">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Links</p>
                <p className="text-2xl font-bold text-blue-600">{activeLinks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="border-accent-cartier/20">
          <CardHeader>
            <CardTitle className="text-accent-cartier">
              {editingLink ? 'Edit Affiliate Link' : 'Add New Affiliate Link'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="brand_name">Brand Name</Label>
                  <Input
                    id="brand_name"
                    value={formData.brand_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand_name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="affiliate_code">Affiliate Code</Label>
                  <Input
                    id="affiliate_code"
                    value={formData.affiliate_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, affiliate_code: e.target.value }))}
                    placeholder="e.g., SAVE20"
                    className="font-mono text-lg bg-white border-2 border-accent-cartier/20 focus:border-accent-cartier text-accent-cartier font-bold"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="affiliate_url">Affiliate URL</Label>
                <Input
                  id="affiliate_url"
                  type="url"
                  value={formData.affiliate_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, affiliate_url: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this deal or offer..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Expiry Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.expiry_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.expiry_date ? format(formData.expiry_date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.expiry_date}
                      onSelect={(date) => setFormData(prev => ({ ...prev, expiry_date: date }))}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_public"
                    checked={formData.is_public}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                  />
                  <Label htmlFor="is_public">Make Public</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit"
                  className="bg-gradient-to-r from-accent-cartier to-red-600 hover:from-accent-cartier/90 hover:to-red-600/90"
                >
                  {editingLink ? 'Update Link' : 'Add Link'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Links Grid */}
      {links.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ExternalLink className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No affiliate links yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding your first affiliate link to begin tracking your earnings.
            </p>
            <Button 
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-accent-cartier to-red-600 hover:from-accent-cartier/90 hover:to-red-600/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Link
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <div key={link.id} className="relative">
              <AffiliateCodeCard
                brand_name={link.brand_name}
                description={link.description}
                affiliate_code={link.affiliate_code}
                affiliate_url={link.affiliate_url}
                expiry_date={link.expiry_date}
                clicks={link.clicks}
                orders={link.orders}
                onLinkClick={() => handleLinkClick(link.id, link.affiliate_url)}
              />
              
              {/* Edit/Delete Actions */}
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(link)}
                  className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(link.id)}
                  className="h-8 w-8 p-0 bg-white/80 hover:bg-white text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {/* Status Badges */}
              <div className="absolute top-2 left-2 flex gap-1">
                {link.is_public && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                    <Eye className="h-2 w-2 mr-1" />
                    Public
                  </Badge>
                )}
                {!link.active && (
                  <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-800">
                    Inactive
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AffiliateHub;
