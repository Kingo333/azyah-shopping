import React from 'react';
import { Helmet } from 'react-helmet-async';
import { getPublicBaseUrl } from '@/lib/urls';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
  canonical?: string;
  structuredData?: object;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title = 'Azyah - Discover Fashion, Beauty, Fitness, and More',
  description = 'Discover fashion, beauty, fitness, and lifestyle items. Swipe, try on with AR, and curate your perfect style with personalized recommendations.',
  keywords = 'fashion, beauty, fitness, lifestyle, AR try-on, virtual fitting, fashion discovery, online shopping, home decor, personalized style',
  image = '/og-image.jpg',
  url,
  type = 'website',
  noIndex = false,
  canonical,
  structuredData,
}) => {
  const baseUrl = getPublicBaseUrl();
  const fullTitle = title.includes('Azyah') ? title : `${title} | Azyah`;
  const fullUrl = url ? (url.startsWith('http') ? url : `${baseUrl}${url}`) : baseUrl;
  const fullImage = image.startsWith('http') ? image : `${baseUrl}${image}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {canonical && <link rel="canonical" href={canonical} />}
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:site_name" content="Azyah" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={fullImage} />
      <meta property="twitter:creator" content="@azyahapp" />

      {/* Additional Meta Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      <meta name="theme-color" content="#000000" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Azyah" />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}

      {/* Preconnect to external domains */}
      <link rel="preconnect" href="https://images.unsplash.com" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    </Helmet>
  );
};

// Pre-defined SEO configurations for common pages
export const HomeSEO = () => {
  const baseUrl = getPublicBaseUrl();
  return (
    <SEOHead
      title="Azyah - Discover Fashion, Beauty, Fitness, and More"
      description="Discover fashion, beauty, fitness, and lifestyle items. Swipe, try on with AR, and curate your perfect style with personalized recommendations."
      structuredData={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Azyah",
        "url": baseUrl,
        "description": "Discover fashion, beauty, fitness, and lifestyle with AR try-on",
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${baseUrl}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      }}
    />
  );
};

export const ProductSEO = ({ product }: { product: any }) => (
  <SEOHead
    title={`${product.title} - ${product.brand?.name}`}
    description={`${product.description || product.title} - Available on Azyah. Try it on with AR and discover similar items.`}
    keywords={`${product.title}, ${product.brand?.name}, ${product.category_slug}, fashion, AR try-on`}
    image={product.media_urls?.[0]}
    type="product"
    structuredData={{
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.title,
      "description": product.description,
      "brand": {
        "@type": "Brand",
        "name": product.brand?.name
      },
      "offers": {
        "@type": "Offer",
        "price": (product.price_cents / 100).toString(),
        "priceCurrency": product.currency || "USD",
        "availability": "https://schema.org/InStock"
      },
      "image": product.media_urls
    }}
  />
);

export const CategorySEO = ({ category }: { category: string }) => (
  <SEOHead
    title={`${category.charAt(0).toUpperCase() + category.slice(1)} Fashion - Azyah`}
    description={`Discover the latest ${category} fashion items. Swipe, try on with AR, and find your perfect style on Azyah.`}
    keywords={`${category}, fashion, clothing, AR try-on, virtual fitting`}
  />
);

export const BrandSEO = ({ brand }: { brand: any }) => {
  const baseUrl = getPublicBaseUrl();
  return (
    <SEOHead
      title={`${brand.name} - Fashion Brand on Azyah`}
      description={`Shop ${brand.name} fashion items on Azyah. Try on their latest collections with AR and discover your perfect style.`}
      keywords={`${brand.name}, fashion brand, clothing, AR try-on`}
      image={brand.logo_url}
      structuredData={{
        "@context": "https://schema.org",
        "@type": "Brand",
        "name": brand.name,
        "description": brand.bio,
        "logo": brand.logo_url,
        "url": `${baseUrl}/brand/${brand.slug}`
      }}
    />
  );
};