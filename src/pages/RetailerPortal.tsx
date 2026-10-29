
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

import { Package, Store, BarChart3, Plus, Settings, Users, Upload, CalendarDays } from 'lucide-react';
import { AddProductModal } from '@/components/AddProductModal';
import { EditProductModal } from '@/components/EditProductModal';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import RetailerBrandsList from '@/components/RetailerBrandsList';
import { BulkImportActions } from '@/components/BulkImportActions';
import { PartnerShell, PartnerSectionHeader, type PartnerNavItem } from '@/components/partner/PartnerShell';
import { PartnerProductList } from '@/components/partner/PartnerProductList';
import { usePartnerPublish } from '@/hooks/usePartnerPublish';
import { productSummary } from '@/lib/partnerPortal';
import { RetailerSettingsForm } from '@/components/RetailerSettingsForm';
import { CollabDashboard } from '@/components/ugc/CollabDashboard';
import { features } from '@/lib/features';

import { AsosImportManager } from '@/components/AsosImportManager';
import BulkAsosImportManager from '@/components/BulkAsosImportManager';
import { RetailerEvents } from '@/components/RetailerEvents';
import { Product } from '@/types';
import { convertJsonToProductAttributes } from '@/lib/type-utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { PendingApprovalBanner } from '@/components/partner/PendingApprovalBanner';
import { loadContactEmail, withContactEmail } from '@/lib/partnerContacts';

// Collabs tab hidden while UGC is off; old ?tab=collabs links open Products.
const portalTab = (tab: string | null) => (!tab ? 'products' : tab === 'collabs' && !features.ugc_collab ? 'products' : tab);

const RetailerPortal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(portalTab(searchParams.get('tab')));
  const [retailer, setRetailer] = useState<any>(null);
  
  // Sync activeTab when URL changes (e.g., from ProfileCompletionBanner navigation)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && portalTab(tab) !== activeTab) {
      setActiveTab(portalTab(tab));
    }
  }, [searchParams]);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [setupError, setSetupError] = useState<string | null>(null);


  useEffect(() => {
    if (user) {
      fetchRetailer();
    }
  }, [user, retryCount]);

  useEffect(() => {
    if (retailer) {
      fetchProducts();
    }
  }, [retailer]);

  const fetchRetailer = async () => {
    try {
      const { data, error } = await supabase
        .from('retailers')
        .select('*')
        .eq('owner_user_id', user?.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data && user) {
        // Auto-create retailer record for new retailer users
        let defaultName = user.user_metadata?.name || user.email?.split('@')[0] || 'My Store';
        
        // Check if display name is unique, if not, add a unique suffix
        const checkNameUnique = async (name: string): Promise<boolean> => {
          const { data } = await supabase
            .from('retailers')
            .select('id')
            .ilike('name', name.trim())
            .maybeSingle();
          return !data;
        };
        
        let isUnique = await checkNameUnique(defaultName);
        if (!isUnique) {
          // Add timestamp suffix to make it unique
          defaultName = `${defaultName}-${Date.now().toString(36)}`;
        }
        
        const baseSlug = defaultName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        let slug = baseSlug;
        
        // Ensure unique slug
        const { data: existingSlugs } = await supabase
          .from('retailers')
          .select('slug')
          .like('slug', `${baseSlug}%`);
        
        if (existingSlugs && existingSlugs.length > 0) {
          slug = `${baseSlug}-${Date.now()}`;
        }

        const { data: newRetailer, error: createError } = await supabase
          .from('retailers')
          .insert({
            owner_user_id: user.id,
            name: defaultName,
            slug: slug,
            contact_email: user.email,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating retailer:', createError);
          toast({
            title: "Setup Error",
            description: "Failed to create your retailer portal. Please try again.",
            variant: "destructive",
          });
          setLoading(false);
          setSetupError(createError.message || 'Failed to create retailer portal');
          return;
        }

        // The email is stored privately; show it from the private table.
        setRetailer(withContactEmail(newRetailer, await loadContactEmail(supabase as any, 'retailer', newRetailer.id)));
        toast({
          title: "Welcome!",
          description: "Your retailer portal has been set up successfully.",
        });
      } else {
        setRetailer(data ? withContactEmail(data, await loadContactEmail(supabase as any, 'retailer', data.id)) : data);
      }
    } catch (error: any) {
      console.error('Error fetching retailer:', error);
      toast({
        title: "Error",
        description: "Failed to load your retailer portal.",
        variant: "destructive",
      });
      setLoading(false);
      setSetupError(error.message || 'Failed to load retailer portal');
    }
  };

  const fetchProducts = async () => {
    if (!retailer) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          title,
          price_cents,
          currency,
          media_urls,
          external_url,
          brand_id,
          retailer_id,
          sku,
          category_slug,
          subcategory_slug,
          status,
          stock_qty,
          min_stock_alert,
          created_at,
          updated_at,
          description,
          compare_at_price_cents,
          weight_grams,
          dimensions,
          tags,
          seo_title,
          seo_description,
          attributes,
          ar_mesh_url,
          brand:brands(
            id,
            name,
            logo_url
          )
        `)
        .eq('retailer_id', retailer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedProducts: Product[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        price_cents: item.price_cents,
        compare_at_price_cents: item.compare_at_price_cents,
        currency: item.currency || 'USD',
        media_urls: Array.isArray(item.media_urls) 
          ? item.media_urls as string[] 
          : typeof item.media_urls === 'string' 
            ? JSON.parse(item.media_urls) 
            : [],
        external_url: item.external_url,
        brand_id: item.brand_id || '',
        retailer_id: item.retailer_id,
        sku: item.sku,
        category_slug: item.category_slug,
        subcategory_slug: item.subcategory_slug,
        status: item.status,
        stock_qty: item.stock_qty || 0,
        min_stock_alert: item.min_stock_alert || 0,
        created_at: item.created_at,
        updated_at: item.updated_at,
        weight_grams: item.weight_grams,
        dimensions: item.dimensions && typeof item.dimensions === 'object' && item.dimensions !== null 
          ? item.dimensions as Record<string, number> 
          : undefined,
        tags: item.tags,
        seo_title: item.seo_title,
        seo_description: item.seo_description,
        ar_mesh_url: item.ar_mesh_url,
        brand: item.brand ? {
          id: item.brand.id,
          name: item.brand.name,
          slug: '',
          logo_url: item.brand.logo_url,
          bio: '',
          socials: {},
          website: '',
          contact_email: '',
          shipping_regions: [],
          owner_user_id: '',
          created_at: '',
          updated_at: ''
        } : undefined,
        attributes: convertJsonToProductAttributes(item.attributes)
      }));

      setProducts(transformedProducts);
    } catch (error: any) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    setIsAddModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
  };

  const handleCloseEditModal = () => {
    setEditingProduct(null);
  };

  const { publish: publishProduct, busyIds: publishingIds } = usePartnerPublish(fetchProducts, handleEditProduct);

  const handleProductUpdate = () => {
    fetchProducts();
  };


  // Check user role - only retailer users and admins can access retailer portal
  const userRole = user?.user_metadata?.role;
  if (user && userRole && userRole !== 'retailer' && userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only retailer users can access the retailer portal.</p>
          <Button 
            onClick={() => navigate('/')} 
            variant="outline"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Please log in to access the retailer portal.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Setting up your Retailer Portal...</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">
                {retryCount === 0 ? 'Initializing your retailer portal...' :
                 retryCount <= 2 ? `Retrying setup (${retryCount}/3)...` :
                 'Finalizing setup...'}
              </p>
            </div>
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground">
                This may take a moment for new accounts.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (setupError && !retailer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-semibold">Setup Error</h2>
          <p className="text-muted-foreground">
            We're having trouble setting up your retailer portal.
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => {
                setRetryCount(0);
                setSetupError(null);
                fetchRetailer();
              }} 
              className="w-full"
            >
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Refresh Page
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')} 
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const navItems: PartnerNavItem[] = [
    { value: 'products', label: 'Products', icon: Package },
    ...(features.ugc_collab ? [{ value: 'collabs', label: 'Collabs', icon: Users }] : []),
    { value: 'brands', label: 'Brands', icon: Store },
    { value: 'events', label: 'Events', icon: CalendarDays },
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
    { value: 'settings', label: 'Settings', icon: Settings },
  ];
  // An old or unknown ?tab= opens Products.
  const currentTab = navItems.some((i) => i.value === activeTab) ? activeTab : 'products';

  return (
    <>
      <PartnerShell
        orgName={retailer?.name || 'Your store'}
        orgLogo={retailer?.logo_url}
        portalLabel="Store portal"
        userType="retailer"
        items={navItems}
        active={currentTab}
        onChange={handleTabChange}
      >
        {/* Approval status (shoppers only see approved partners' products) */}
        <PendingApprovalBanner status={retailer?.verification_status} />

        {currentTab !== 'settings' && <ProfileCompletionBanner />}

        {currentTab === 'products' && (
          <section>
            <PartnerSectionHeader
              title="Products"
              subtitle={loading ? 'Loading…' : productSummary(products)}
              actions={<>
                <Button variant="outline" onClick={() => setIsBulkAddModalOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk upload
                </Button>
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add product
                </Button>
              </>}
            />
            {loading ? (
              <div className="space-y-px overflow-hidden rounded-[20px] bg-card">
                {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse bg-fill/60" />)}
              </div>
            ) : products.length > 0 ? (
              <PartnerProductList
                products={products}
                fallbackCurrency={retailer?.currency || 'AED'}
                showBrand
                onEdit={handleEditProduct}
                onPublish={publishProduct}
                busyIds={publishingIds}
              />
            ) : (
              <div className="rounded-[20px] bg-card px-6 py-12 text-center">
                <Package className="mx-auto mb-3 h-10 w-10 text-ink-3" />
                <h2 className="text-[17px] font-semibold">No products yet</h2>
                <p className="mx-auto mt-1 max-w-sm text-[14px] text-ink-2">
                  Add your first product, or import products from Brands. A product goes live once it has a name, price, photo and category.
                </p>
                <Button className="mt-5" onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add product
                </Button>
              </div>
            )}
          </section>
        )}

        {currentTab === 'collabs' && features.ugc_collab && (
          <CollabDashboard ownerOrgId={retailer?.id || ''} orgType="retailer" />
        )}

        {currentTab === 'brands' && <RetailerBrandsList retailerId={retailer?.id || ''} />}

        {currentTab === 'events' && <RetailerEvents retailerId={retailer?.id || ''} />}

        {currentTab === 'analytics' && <AnalyticsDashboard retailerId={retailer?.id} />}

        {currentTab === 'settings' && (
          <div className="space-y-6">
            {/* ASOS Import - Only for retailer@test.com */}
            {user?.email === 'retailer@test.com' && (
              <>
                <AsosImportManager />
                <BulkAsosImportManager />
              </>
            )}
            {retailer && (
              <RetailerSettingsForm
                retailer={retailer}
                onRetailerUpdate={setRetailer}
                extraSections={
                  <BulkImportActions
                    retailerId={retailer.id}
                    onProductsDeleted={fetchProducts}
                  />
                }
              />
            )}
          </div>
        )}
      </PartnerShell>

        {/* Modals */}
        <AddProductModal 
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onProductAdded={() => {
            setIsAddModalOpen(false);
            fetchProducts();
          }}
          userType="retailer"
          retailerId={retailer?.id}
        />
        
        <AddProductModal 
          isOpen={isBulkAddModalOpen}
          onClose={() => setIsBulkAddModalOpen(false)}
          onProductAdded={() => {
            setIsBulkAddModalOpen(false);
            fetchProducts();
          }}
          userType="retailer"
          retailerId={retailer?.id}
          initialBulkMode={true}
        />
        {editingProduct && (
          <EditProductModal
            product={editingProduct}
            isOpen={!!editingProduct}
            onClose={() => setEditingProduct(null)}
            onProductUpdated={() => {
              setEditingProduct(null);
              fetchProducts();
            }}
          />
        )}
    </>
  );
};

export default RetailerPortal;
