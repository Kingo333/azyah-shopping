-- Phase 1: Create core enums
CREATE TYPE user_role AS ENUM ('shopper', 'brand', 'retailer', 'admin');
CREATE TYPE swipe_action AS ENUM ('right', 'up', 'left');
CREATE TYPE product_status AS ENUM ('active', 'inactive', 'archived', 'out_of_stock');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned');

-- Users table with role-based fields
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'shopper',
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  socials JSONB DEFAULT '{}',
  website TEXT,
  bio TEXT,
  phone TEXT,
  shipping_address JSONB,
  billing_address JSONB,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Brands table
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  cover_image_url TEXT,
  bio TEXT,
  socials JSONB DEFAULT '{}',
  website TEXT,
  contact_email TEXT,
  shipping_regions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Retailers table
CREATE TABLE public.retailers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  cover_image_url TEXT,
  bio TEXT,
  socials JSONB DEFAULT '{}',
  website TEXT,
  contact_email TEXT,
  shipping_regions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Categories reference table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id),
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Products table with complete taxonomy
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  retailer_id UUID REFERENCES public.retailers(id) ON DELETE SET NULL,
  sku TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  compare_at_price_cents INTEGER,
  currency CHAR(3) DEFAULT 'USD',
  category_slug TEXT NOT NULL,
  subcategory_slug TEXT,
  attributes JSONB DEFAULT '{}',
  media_urls JSONB DEFAULT '[]',
  ar_mesh_url TEXT,
  stock_qty INTEGER DEFAULT 0,
  min_stock_alert INTEGER DEFAULT 5,
  status product_status DEFAULT 'active',
  weight_grams INTEGER,
  dimensions JSONB,
  tags TEXT[] DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;