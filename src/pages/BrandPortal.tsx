import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PartnerShell, PartnerSectionHeader, type PartnerNavItem } from '@/components/partner/PartnerShell';
import { PartnerProductList } from '@/components/partner/PartnerProductList';
import { usePartnerPublish } from '@/hooks/usePartnerPublish';
import { productSummary } from '@/lib/partnerPortal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCategories } from '@/hooks/useCategories';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { AddProductModal } from '@/components/AddProductModal';
import { EditProductModal } from '@/components/EditProductModal';
import { BrandProductDetailModal } from '@/components/BrandProductDetailModal';
import { LogoUpload } from '@/components/LogoUpload';
import { ImportWizardModal } from '@/components/ImportWizardModal';
import { BulkImportActions } from '@/components/BulkImportActions';
import { CollabDashboard } from '@/components/ugc/CollabDashboard';
import { features } from '@/lib/features';

import { BrandSettingsForm } from '@/components/BrandSettingsForm';
import { BrandCategorySelectorModal } from '@/components/brand/BrandCategorySelectorModal';
import { BrandOnboardingModal } from '@/components/brand/BrandOnboardingModal';
import { BrandCategoryChangeCard } from '@/components/brand/BrandCategoryChangeCard';
import { BrandServicesManager } from '@/components/brand/BrandServicesManager';
import { PortfolioManager } from '@/components/brand/PortfolioManager';

import { SalonDashboard } from '@/components/salon/SalonDashboard';
import { Plus, Trash2, Upload, BarChart3, Package, Archive, Briefcase, Images, Users, Settings as SettingsIcon } from 'lucide-react';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { PendingApprovalBanner } from '@/components/partner/PendingApprovalBanner';
import { loadContactEmail, withContactEmail } from '@/lib/partnerContacts';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Product } from '@/types';

// Collabs tab hidden while UGC is off; old ?tab=collabs links open Products.
const portalTab = (tab: string | null) => (!tab ? 'products' : tab === 'collabs' && !features.ugc_collab ? 'products' : tab);

type BrandCategory = 'fashion_brand' | 'agency' | 'studio';

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  bio: string | null;
  website: string | null;
  contact_email: string | null;
  socials: any;
  shipping_regions: string[];
  category?: string | null;
  currency?: string | null;
  created_at?: string;
}
const BrandPortal: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(portalTab(searchParams.get('tab')));
  
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
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<any[]>([]);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [brandLoading, setBrandLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const {
    categories
  } = useCategories();
  const mountedRef = useRef(true);
  const generateUniqueSlug = async (baseName: string): Promise<string> => {
    const baseSlug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const {
        data
      } = await supabase.from('brands').select('id').eq('slug', slug).maybeSingle();
      if (!data) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    return slug;
  };
  const createBrandForUser = async (): Promise<Brand | null> => {
    if (!user) return null;
    try {
      let brandName = user.user_metadata?.name || user.email?.split('@')[0] || 'My Brand';
      
      // Check if display name is unique, if not, add a unique suffix
      const checkNameUnique = async (name: string): Promise<boolean> => {
        const { data } = await supabase
          .from('brands')
          .select('id')
          .ilike('name', name.trim())
          .maybeSingle();
        return !data;
      };
      
      let isUnique = await checkNameUnique(brandName);
      if (!isUnique) {
        // Add timestamp suffix to make it unique
        brandName = `${brandName}-${Date.now().toString(36)}`;
      }
      
      const slug = await generateUniqueSlug(brandName);
      const {
        data,
        error
      } = await supabase.from('brands').insert({
        name: brandName,
        slug: slug,
        owner_user_id: user.id,
        contact_email: user.email,
        bio: null,
        website: null,
        logo_url: null,
        socials: {},
        shipping_regions: [],
        category: null // Force NULL so BrandCategorySelectorModal appears for new brands
      }).select().single();
      if (error) {
        console.error('Error creating brand:', error);
        throw error;
      }
      console.log('Successfully created brand:', data);
      return data;
    } catch (error) {
      console.error('Exception creating brand:', error);
      return null;
    }
  };
  const fetchBrandData = useCallback(async () => {
    if (!user?.id) {
      console.log('No user ID available');
      setBrandLoading(false);
      return;
    }
    try {
      console.log('Fetching brand for user:', user.id);
      setBrandLoading(true);
      const {
        data,
        error
      } = await supabase.from('brands').select('*').eq('owner_user_id', user.id).maybeSingle();
      console.log('Brand query completed - data:', data, 'error:', error);
      if (error) {
        console.error('Supabase error fetching brand:', error);
        if (mountedRef.current) {
          setBrand(null);
          setBrandLoading(false);
        }
        return;
      }
      if (!data) {
        console.log('No brand found for user, creating new brand...');

        // Check if user has brand role before auto-creating
        const userRole = user.user_metadata?.role;
        if (userRole === 'brand' || userRole === 'admin') {
          const newBrand = await createBrandForUser();
          if (newBrand && mountedRef.current) {
            // The email is stored privately; show it from the private table.
            setBrand(withContactEmail(newBrand, await loadContactEmail(supabase as any, 'brand', newBrand.id)));
            toast({
              title: "Welcome to Azyah!",
              description: "Your brand portal has been created. Complete your profile in Settings to get started."
            });
          }
        }
        if (mountedRef.current) {
          setBrandLoading(false);
        }
        return;
      }
      console.log('Successfully setting brand data:', data);
      const contactEmail = await loadContactEmail(supabase as any, 'brand', data.id);
      if (mountedRef.current) {
        setBrand(withContactEmail(data, contactEmail));
        setBrandLoading(false);
      }
    } catch (error) {
      console.error('Exception in fetchBrandData:', error);
      if (mountedRef.current) {
        setBrand(null);
        setBrandLoading(false);
      }
    }
  }, [user?.id, user?.user_metadata?.name, user?.email, user?.user_metadata?.role, toast, retryCount]);
  const fetchProducts = useCallback(async () => {
    if (!brand?.id) return;
    try {
      setProductsLoading(true);
      const {
        data,
        error
      } = await supabase.from('products').select(`
          *,
          brand:brands(name)
        `).eq('brand_id', brand.id).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      const formatted = (data || []).map((p: any) => ({
        ...p,
        media_urls: Array.isArray(p.media_urls) ? p.media_urls : [],
        ar_mesh_url: p.ar_mesh_url || null,
        currency: p.currency || 'USD',
        sku: p.sku || `SKU-${p.id}`,
        external_url: p.external_url || '',
        description: p.description || ''
      }));
      if (mountedRef.current) {
        setProducts(formatted);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive"
      });
    } finally {
      if (mountedRef.current) {
        setProductsLoading(false);
      }
    }
  }, [brand?.id, toast]);
  useEffect(() => {
    if (user) {
      fetchBrandData();
    }
  }, [user, fetchBrandData]);
  useEffect(() => {
    if (brand?.id) {
      fetchProducts();
      console.log('Brand ID for analytics:', brand.id);
    }
  }, [brand?.id, fetchProducts]);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const handleLogoUpdate = (logoUrl: string | null) => {
    if (brand) {
      setBrand({
        ...brand,
        logo_url: logoUrl
      });
    }
  };
  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    newSelected.has(productId) ? newSelected.delete(productId) : newSelected.add(productId);
    setSelectedProducts(newSelected);
  };
  const handleBulkAction = async (action: string) => {
    try {
      if (action === 'Archive') {
        const {
          error
        } = await supabase.from('products').update({
          status: 'archived'
        }).in('id', Array.from(selectedProducts));
        if (error) throw error;
      } else if (action === 'Delete') {
        // First try to delete related data
        const productIds = Array.from(selectedProducts);

        // Delete related records first
        await supabase.from('likes').delete().in('product_id', productIds);
        await supabase.from('wishlist_items').delete().in('product_id', productIds);
        await supabase.from('cart_items').delete().in('product_id', productIds);

        // Then delete products
        const {
          error
        } = await supabase.from('products').delete().in('id', productIds);
        if (error) throw error;
      }
      toast({
        description: `${action} applied to ${selectedProducts.size} product(s)`
      });
      setSelectedProducts(new Set());
      fetchProducts();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast({
        title: "Error",
        description: `Failed to ${action.toLowerCase()} products`,
        variant: "destructive"
      });
    }
  };
  const handleViewProduct = (product: any) => {
    console.log('View product clicked:', product);
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };
  const handleEditProduct = (product: any) => {
    console.log('Edit product clicked:', product);
    setSelectedProduct(product);
    setIsEditProductModalOpen(true);
  };
  const handleEditFromDetail = (product: any) => {
    setIsDetailModalOpen(false);
    setSelectedProduct(product);
    setIsEditProductModalOpen(true);
  };
  const { publish: publishProduct, busyIds: publishingIds } = usePartnerPublish(fetchProducts, handleEditProduct);
  if (!user) return <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground">Please log in to access the brand portal.</p>
      </div>
    </div>;

  // Check user role - only brand users and admins can access brand portal
  const userRole = user.user_metadata?.role;
  if (userRole && userRole !== 'brand' && userRole !== 'admin') {
    return <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">Only brand users can access the brand portal.</p>
        <Button onClick={() => navigate('/')} variant="outline">
          Go to Dashboard
        </Button>
      </div>
    </div>;
  }
  if (brandLoading) return <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Loading Brand Portal...</h2>
        <p className="text-muted-foreground">Please wait while we fetch your brand information.</p>
      </div>
    </div>;
  if (!brand) return <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold mb-2">Setting up your Brand Portal...</h2>
        <p className="text-muted-foreground">Please wait while we create your brand profile.</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Refresh Page
        </Button>
      </div>
    </div>;
  // Determine if we need to show category selector
  const needsCategorySelection = !brand.category;
  const isAgencyOrStudio = brand.category === 'agency' || brand.category === 'studio';
  const isSalon = brand.category === 'salon';

  const handleCategorySelected = (category: string) => {
    setBrand({ ...brand, category });
    // Show onboarding wizard after category selection
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = (updatedBrand: Brand) => {
    setBrand(updatedBrand);
    setShowOnboarding(false);
    // Set default tab based on category
    if (updatedBrand.category === 'agency' || updatedBrand.category === 'studio' || updatedBrand.category === 'salon') {
      handleTabChange('services');
    } else {
      handleTabChange('products');
    }
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    // Set default tab based on category
    if (brand.category === 'agency' || brand.category === 'studio' || brand.category === 'salon') {
      handleTabChange('services');
    } else {
      handleTabChange('products');
    }
  };



  // Brands can add up to 10 products for now; more on request.
  const withinProductLimit = (open: () => void) => {
    if (products.length >= 10) {
      toast({
        title: "Product limit reached",
        description: "You can add up to 10 products. Use Help and feedback to ask for more.",
        variant: "destructive"
      });
      return;
    }
    open();
  };

  const navItems: PartnerNavItem[] = isSalon ? [] : isAgencyOrStudio ? [
    { value: 'services', label: 'Services', icon: Briefcase },
    { value: 'portfolio', label: 'Portfolio', icon: Images },
    ...(features.ugc_collab ? [{ value: 'collabs', label: 'Collabs', icon: Users }] : []),
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
    { value: 'settings', label: 'Settings', icon: SettingsIcon }
  ] : [
    { value: 'products', label: 'Products', icon: Package },
    ...(features.ugc_collab ? [{ value: 'collabs', label: 'Collabs', icon: Users }] : []),
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
    { value: 'settings', label: 'Settings', icon: SettingsIcon }
  ];
  // An old or unknown ?tab= opens the first menu item.
  const currentTab = navItems.some(i => i.value === activeTab) ? activeTab : navItems[0]?.value;

  return <>
      {/* Category Selector Modal - blocks portal until category is chosen */}
      <BrandCategorySelectorModal
        brandId={brand.id}
        isOpen={needsCategorySelection}
        onCategorySelected={handleCategorySelected}
      />

      {/* Onboarding Modal - shows after category selection */}
      <BrandOnboardingModal
        isOpen={showOnboarding}
        brand={brand}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />

      <PartnerShell
        orgName={brand.name || 'Your brand'}
        orgLogo={brand.logo_url}
        portalLabel="Brand portal"
        userType="brand"
        items={navItems}
        active={currentTab ?? ''}
        onChange={handleTabChange}
      >
        {/* Approval status (shoppers only see approved partners' products) */}
        <PendingApprovalBanner status={(brand as { verification_status?: string } | null)?.verification_status} />

        {currentTab !== 'settings' && <ProfileCompletionBanner />}

        {isSalon ? (
          <SalonDashboard
            brandId={brand.id}
            brand={brand}
            onBrandUpdate={(b) => setBrand(b)}
          />
        ) : (
          <>
            {currentTab === 'services' && isAgencyOrStudio && (
              <BrandServicesManager brandId={brand.id} brandCategory={brand.category as 'agency' | 'studio'} currency={brand.currency || 'AED'} />
            )}

            {currentTab === 'portfolio' && isAgencyOrStudio && <PortfolioManager brandId={brand.id} />}

            {currentTab === 'products' && (
              <section>
                <PartnerSectionHeader
                  title="Products"
                  subtitle={productsLoading ? 'Loading…' : productSummary(products)}
                  actions={selectedProducts.size > 0 ? <>
                      <span className="text-[14px] text-ink-2">{selectedProducts.size} selected</span>
                      <Button variant="outline" size="sm" onClick={() => setSelectedProducts(new Set())}>Cancel</Button>
                      <Button variant="outline" size="sm" onClick={() => handleBulkAction('Archive')}>
                        <Archive className="h-4 w-4 mr-1" />
                        Archive
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        if (window.confirm(`Delete ${selectedProducts.size} product(s)? This can't be undone.`)) handleBulkAction('Delete');
                      }} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </> : <>
                      <Button variant="outline" onClick={() => withinProductLimit(() => setIsBulkAddModalOpen(true))}>
                        <Upload className="h-4 w-4 mr-2" />
                        Bulk upload
                      </Button>
                      <Button onClick={() => withinProductLimit(() => setIsAddProductModalOpen(true))}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add product
                      </Button>
                    </>}
                />
                {productsLoading ? (
                  <div className="space-y-px overflow-hidden rounded-[20px] bg-card">
                    {[0, 1, 2].map(i => <div key={i} className="h-20 animate-pulse bg-fill/60" />)}
                  </div>
                ) : products.length > 0 ? (
                  <PartnerProductList
                    products={products}
                    fallbackCurrency={brand.currency || 'AED'}
                    onOpen={handleViewProduct}
                    onEdit={handleEditProduct}
                    onPublish={publishProduct}
                    busyIds={publishingIds}
                    selection={{ selected: selectedProducts, toggle: handleSelectProduct }}
                  />
                ) : (
                  <div className="rounded-[20px] bg-card px-6 py-12 text-center">
                    <Package className="mx-auto mb-3 h-10 w-10 text-ink-3" />
                    <h2 className="text-[17px] font-semibold">No products yet</h2>
                    <p className="mx-auto mt-1 max-w-sm text-[14px] text-ink-2">
                      Add your first product. It goes live for shoppers once it has a name, price, photo and category.
                    </p>
                    <Button className="mt-5" onClick={() => withinProductLimit(() => setIsAddProductModalOpen(true))}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add product
                    </Button>
                  </div>
                )}
              </section>
            )}

            {currentTab === 'collabs' && features.ugc_collab && (
              <CollabDashboard ownerOrgId={brand.id} orgType="brand" />
            )}

            {currentTab === 'analytics' && <AnalyticsDashboard brandId={brand?.id} />}

            {currentTab === 'settings' && (
              <div className="space-y-6">
                {/* Category change - only shows within 2 weeks of account creation */}
                {brand.category && brand.created_at && (
                  <BrandCategoryChangeCard
                    brandId={brand.id}
                    currentCategory={brand.category}
                    brandCreatedAt={brand.created_at}
                    onCategoryChanged={(category) => setBrand({ ...brand, category })}
                  />
                )}
                <BrandSettingsForm brand={brand} onBrandUpdate={setBrand} />
              </div>
            )}
          </>
        )}
      </PartnerShell>

      <AddProductModal isOpen={isAddProductModalOpen} onClose={() => setIsAddProductModalOpen(false)} onProductAdded={fetchProducts} userType="brand" brandId={brand.id} brandCurrency={brand.currency || 'AED'} />
      
      <AddProductModal isOpen={isBulkAddModalOpen} onClose={() => setIsBulkAddModalOpen(false)} onProductAdded={fetchProducts} userType="brand" brandId={brand.id} brandCurrency={brand.currency || 'AED'} initialBulkMode={true} />
      {selectedProduct && <>
          <BrandProductDetailModal isOpen={isDetailModalOpen} onClose={() => {
        setIsDetailModalOpen(false);
        setSelectedProduct(null);
      }} product={selectedProduct} onEdit={handleEditFromDetail} onProductUpdated={fetchProducts} />

          <EditProductModal isOpen={isEditProductModalOpen} onClose={() => {
        setIsEditProductModalOpen(false);
        setSelectedProduct(null);
      }} onProductUpdated={fetchProducts} product={selectedProduct} brandCurrency={brand.currency || 'AED'} />
        </>}

      <ImportWizardModal open={isImportModalOpen} onOpenChange={setIsImportModalOpen} brandId={brand?.id} />
    </>;
};
export default BrandPortal;