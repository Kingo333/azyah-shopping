# Codebase Structure

**Analysis Date:** 2026-03-29

## Directory Layout

```
azyah-shopping/
├── src/
│   ├── main.tsx              # Entry point: React root render, Capacitor init
│   ├── App.tsx               # Route configuration, provider setup
│   ├── App.css               # Global styles
│   ├── index.css             # Base Tailwind + theme overrides
│   │
│   ├── pages/                # Page-level components (routes)
│   │   ├── Index.tsx
│   │   ├── Landing.tsx
│   │   ├── Swipe.tsx         # Main product discovery
│   │   ├── Explore.tsx
│   │   ├── Community.tsx
│   │   ├── Feed.tsx
│   │   ├── UserProfile.tsx
│   │   ├── ProfileSettings.tsx
│   │   ├── DressMe*.tsx      # Outfit builder suite
│   │   ├── BrandPortal.tsx
│   │   ├── RetailerPortal.tsx
│   │   ├── Affiliate.tsx
│   │   ├── Rewards.tsx
│   │   ├── onboarding/       # Onboarding flow pages
│   │   │   ├── IntroCarousel.tsx
│   │   │   ├── SignUp.tsx
│   │   │   ├── GenderSelect.tsx
│   │   │   └── ...
│   │   └── dashboard/        # Dashboard pages
│   │       └── Upgrade.tsx
│   │
│   ├── components/           # Reusable UI components
│   │   ├── ProtectedRoute.tsx      # RBAC enforcement
│   │   ├── AuthAwareRoute.tsx      # Auth-conditional rendering
│   │   ├── BottomNavigation.tsx    # Mobile nav bar
│   │   ├── StatusBarScrim.tsx      # iOS status bar padding
│   │   │
│   │   ├── ui/               # shadcn/radix-ui wrapped components
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── toaster.tsx
│   │   │   └── ... (30+ UI primitives)
│   │   │
│   │   ├── affiliate/        # Affiliate promo components
│   │   │   ├── PromoCard.tsx
│   │   │   ├── DealsAndCodesCenter.tsx
│   │   │   └── ...
│   │   │
│   │   ├── AiStudio/        # AI image analysis sub-components
│   │   │   ├── AiStudioControlsPanel.tsx
│   │   │   ├── AiStudioResultsPanel.tsx
│   │   │   └── ...
│   │   │
│   │   ├── brand/           # Brand portal components
│   │   │   ├── BrandOnboardingModal.tsx
│   │   │   ├── PortfolioManager.tsx
│   │   │   ├── BrandSettingsForm.tsx
│   │   │   └── ...
│   │   │
│   │   ├── community/       # Community/UGC components
│   │   ├── dashboard/       # Dashboard UI components
│   │   ├── deals/          # Deals/affiliate components
│   │   ├── explore/        # Explore page components
│   │   ├── icons/          # Custom icon components
│   │   ├── profile/        # Profile UI components
│   │   ├── rewards/        # Rewards components
│   │   ├── salon/          # Virtual salon/AR components
│   │   ├── stylelink/      # StyleLink (outfit sharing) components
│   │   ├── ugc/            # UGC collaboration components
│   │   ├── voice/          # Voice assistant UI
│   │   ├── globe/          # Globe visualization
│   │   ├── AiTryOnModal.tsx
│   │   ├── ARExperience.tsx
│   │   ├── BoardCanvas.tsx
│   │   ├── SwipeDeck.tsx
│   │   ├── ProductMasonryGrid.tsx
│   │   └── ... (100+ additional components)
│   │
│   ├── contexts/            # React Context providers
│   │   ├── AuthContext.tsx        # Auth state + session management
│   │   ├── FeatureFlagsContext.tsx # Feature flag evaluation
│   │   └── LayerScrollContext.tsx  # Canvas layer scroll state
│   │
│   ├── hooks/               # Custom React hooks (60+)
│   │   ├── useAuth.ts              # Auth context consumer
│   │   ├── useAnalytics.ts         # Brand/retailer analytics
│   │   ├── useAddProductToWardrobe.ts
│   │   ├── useAffiliatePromos.ts
│   │   ├── useAiAssets.ts
│   │   ├── useCanvasEditor.ts      # DressMe canvas logic
│   │   ├── useCollaborations.ts
│   │   ├── useDealsFromImage.ts    # Image-to-deals matching
│   │   ├── useDeepLinkHandler.ts   # Mobile deep links
│   │   ├── useTryOnJobMonitor.ts
│   │   ├── useGuestMode.ts         # Guest browsing state
│   │   ├── useSessionMonitor.ts    # Auth health check
│   │   └── ... (many more domain-specific hooks)
│   │
│   ├── lib/                 # Business logic & service clients
│   │   ├── apollo-client.ts        # GraphQL Apollo setup
│   │   ├── axesso-client.ts        # Product search API
│   │   ├── bitstudio-client.ts     # AI image processing
│   │   ├── iap.ts                  # In-app purchases (RevenueCat)
│   │   ├── qdrant.ts               # Vector search client
│   │   ├── rbac.ts                 # Role-based access control
│   │   ├── roleCache.ts            # User role caching
│   │   ├── categories.ts           # Category taxonomy
│   │   ├── countries.ts            # Country/city data
│   │   ├── countryCurrency.ts      # Currency mapping
│   │   ├── formatMoney.ts          # Currency formatting
│   │   ├── password-validation.ts  # Zod schema for passwords
│   │   ├── nativeShare.ts          # Capacitor share API
│   │   ├── openExternalUrl.ts      # Browser/Capacitor URLs
│   │   ├── pwa.ts                  # PWA installation
│   │   ├── fallbackImage.ts        # Default image URLs
│   │   ├── displaySrc.ts           # Image source selection
│   │   ├── imageUrl.ts             # Image URL helpers
│   │   ├── slugify.ts              # URL-safe slugs
│   │   ├── type-utils.ts           # TypeScript utility types
│   │   ├── analytics/              # Analytics tracking
│   │   │   └── * (event tracking utilities)
│   │   ├── tryon/                  # Try-on/AR logic
│   │   │   ├── index.ts
│   │   │   └── providers/          # ML model providers
│   │   └── voice/                  # Voice assistant logic
│   │       └── * (voice processing)
│   │
│   ├── utils/               # Utility functions (no domain logic)
│   │   ├── logger.ts               # Logging wrapper
│   │   ├── sessionHealthCheck.ts   # Auth token validation
│   │   ├── securityValidation.ts   # Input validation
│   │   ├── securityFixes.ts        # Security utilities
│   │   ├── securityHeaders.ts      # HTTP header helpers
│   │   ├── sanitizeHtml.ts         # XSS prevention
│   │   ├── imageOptimizer.ts       # Image compression/resize
│   │   ├── imageCropUtils.ts       # Image cropping
│   │   ├── imageTrimming.ts        # PNG transparency trim
│   │   ├── canvasToImage.ts        # Canvas → image export
│   │   ├── canvasImageLoader.ts    # Image loading for canvas
│   │   ├── objectDetection.ts      # MediaPipe pose detection
│   │   ├── backgroundRemoval.ts    # BG removal via transformers
│   │   ├── productHelpers.ts       # Product utilities
│   │   ├── brandHelpers.ts         # Brand utilities
│   │   ├── proxyVerification.ts    # Image proxy validation
│   │   ├── cacheManager.ts         # Storage caching
│   │   ├── pwaHelpers.ts           # PWA helpers
│   │   └── ... (other utilities)
│   │
│   ├── types/               # TypeScript domain types
│   │   ├── index.ts                # Core: User, Product, Brand, Order
│   │   ├── ProductContext.ts       # Product state types
│   │   ├── ugc.ts                  # UGC collaboration types
│   │   └── ugcBrand.ts             # Brand UGC types
│   │
│   ├── constants/           # Static data
│   │   └── styleTags.ts            # Style tag definitions
│   │
│   ├── integrations/        # External service integrations
│   │   └── supabase/
│   │       ├── client.ts           # Supabase client initialization
│   │       └── types.ts            # Auto-generated DB types
│   │
│   └── assets/              # Static images
│       ├── category-*.jpg
│       ├── onboarding images
│       └── ...
│
├── public/                  # Static web assets
│   ├── icons/
│   ├── lovable-uploads/     # Lovable platform uploads
│   ├── marketing/
│   └── onboarding/
│
├── ios/                     # Capacitor iOS build
│   └── App/                 # Xcode project structure
│
├── dist/                    # Built output (Vite)
│
├── .github/workflows/       # GitHub Actions CI/CD
│
├── Configuration Files
│   ├── vite.config.ts              # Vite build config + path aliases
│   ├── tsconfig.json               # TypeScript config
│   ├── tailwind.config.ts          # Tailwind CSS theming
│   ├── postcss.config.js           # PostCSS plugins
│   ├── eslint.config.js            # ESLint rules
│   ├── capacitor.config.ts         # Capacitor native config
│   ├── playwright.config.ts        # E2E test config
│   ├── package.json                # Dependencies & scripts
│   └── package-lock.json           # Lockfile
│
└── .planning/codebase/      # Architecture documentation
    ├── ARCHITECTURE.md
    ├── STRUCTURE.md
    └── ...
```

## Directory Purposes

**src/pages/:**
- Purpose: Page-level route components, top-level layout
- Contains: Full-page components that map to URL routes
- Key files: `Swipe.tsx` (discovery), `DressMe.tsx` (outfit builder), `BrandPortal.tsx` (brand admin)
- Naming: PascalCase file name matches route path (e.g., `UserProfile.tsx` → `/profile`)

**src/components/:**
- Purpose: Reusable UI components and feature-specific sub-components
- Contains: ~100+ React components from buttons to complex modals
- Key files: UI primitives (ui/), feature modules (affiliate/, brand/, community/, etc.)
- Naming: PascalCase, feature-scoped in subdirectories

**src/contexts/:**
- Purpose: Global state management and cross-component communication
- Contains: React Context + useContext hooks for auth, feature flags, UI state
- Key files: `AuthContext.tsx` (most critical), handles user session lifecycle
- Naming: PascalCase ending in `Context`

**src/hooks/:**
- Purpose: Encapsulate data fetching, mutations, and complex component logic
- Contains: React Query hooks, Supabase queries, state management
- Key files: `useAuth()` (auth consumer), `useAnalytics()`, `useCanvasEditor()` (domain logic)
- Naming: camelCase starting with `use`, scoped by domain

**src/lib/:**
- Purpose: Business logic, API clients, data transformation
- Contains: Service wrappers, domain helpers, static data
- Key files: `rbac.ts` (access control), `axesso-client.ts` (product search), `iap.ts` (in-app purchases)
- Naming: kebab-case for utility modules, camelCase for functions

**src/utils/:**
- Purpose: Pure utility functions, cross-cutting concerns
- Contains: Image processing, validation, logging, security helpers
- Key files: `logger.ts` (logging), `securityValidation.ts` (input validation)
- Naming: camelCase, descriptive (imageOptimizer.ts not imgOpt.ts)

**src/types/:**
- Purpose: TypeScript type definitions and interfaces
- Contains: Domain models (User, Product, Brand) and auto-generated Supabase types
- Key files: `index.ts` (core domain types), `integrations/supabase/types.ts` (DB schema)
- Naming: PascalCase for types/interfaces

**src/integrations/supabase/:**
- Purpose: Supabase client initialization and type generation
- Contains: Single client instance, auto-generated DB types
- Key files: `client.ts` (exported as `supabase`), `types.ts` (generated from schema)
- Naming: Standard Supabase integration pattern

**src/assets/:**
- Purpose: Static images and media files
- Contains: Category thumbnails, onboarding images, hero images
- Naming: kebab-case with descriptive names (category-footwear.jpg)

## Key File Locations

**Entry Points:**
- `src/main.tsx`: Bootstrap React app, Capacitor init, DOM mounting
- `src/App.tsx`: Route tree, provider wrappers (Query, Auth, Theme, Helmet)
- `public/index.html`: HTML shell with Capacitor script tags

**Configuration:**
- `vite.config.ts`: Build setup, path aliases (@/), chunk splitting
- `tsconfig.json`: TypeScript compiler options, path mapping
- `tailwind.config.ts`: Theme colors, spacing, custom utilities
- `capacitor.config.ts`: iOS/Android native configuration
- `package.json`: Dependencies, build scripts

**Core Logic:**
- `src/contexts/AuthContext.tsx`: User session state, session health checks
- `src/lib/rbac.ts`: Role-based access control rules and route mapping
- `src/integrations/supabase/client.ts`: Supabase client (imported everywhere as `supabase`)
- `src/hooks/`: Data fetching hooks that power all pages

**Testing:**
- `playwright.config.ts`: E2E test configuration
- Test files co-located with features (pattern: feature.test.ts or feature.spec.ts)

## Naming Conventions

**Files:**
- React components: PascalCase (`UserProfile.tsx`, `SwipeDeck.tsx`)
- Hooks: camelCase starting with `use` (`useAnalytics.ts`, `useCanvasEditor.ts`)
- Utils/lib: camelCase (`imageOptimizer.ts`, `rbac.ts`)
- Styles: Tailwind classes inline, rarely standalone CSS files
- Constants: UPPER_SNAKE_CASE for constants (`GUEST_ACCESSIBLE_ROUTES`), PascalCase for exports

**Directories:**
- Feature modules: camelCase lowercase plural when organizing sub-components
  - `src/components/affiliate/` contains promo-related components
  - `src/components/brand/` contains brand portal components
  - `src/lib/tryon/` contains try-on/AR logic
- Category directories: match feature name

**Functions:**
- Hooks: `use` prefix (e.g., `useAnalytics`, `useDeepLinkHandler`)
- Mutations: `handle` prefix in components (e.g., `handleSwipe()`)
- Queries: `fetch` prefix or bare verb (e.g., `fetchAnalytics()`, `getProductDetails()`)
- Predicates: `is` or `can` prefix (e.g., `isGuestMode()`, `canAccessRoute()`)

**Variables:**
- React state: camelCase (`user`, `isLoading`, `selectedCategory`)
- Context values: PascalCase for context objects (`AuthContext`)
- Query keys: camelCase in arrays (e.g., `['analytics', entityId]`)
- Constants: UPPER_SNAKE_CASE

**Types:**
- Interfaces: PascalCase (`User`, `Product`, `AnalyticsMetrics`)
- Unions: PascalCase (`UserRole`, `SwipeAction`)
- Generics: Single uppercase letter or descriptive (`T`, `TData`)

## Where to Add New Code

**New Feature:**
- Primary code: Create feature page in `src/pages/FeatureName.tsx`
- Sub-components: Create `src/components/featureName/` directory
- Data fetching: Add hooks in `src/hooks/useFeatureName.ts` or `src/hooks/useFeatureXxx.ts`
- Business logic: Add to `src/lib/featureName.ts` or `src/lib/featureName/` directory
- Tests: Co-locate with implementation or in `__tests__/` subdirectory (follow project conventions)

**New Component/Module:**
- Reusable component: `src/components/ComponentName.tsx` (if general) or `src/components/featureName/ComponentName.tsx` (if feature-specific)
- Feature module: Create subdirectory `src/components/featureName/` with index.ts barrel export
- UI primitive: Add to `src/components/ui/` (leveraging shadcn/Radix UI)

**Utilities:**
- Image/media processing: `src/utils/imageFunctionName.ts`
- Security/validation: `src/utils/securityFunctionName.ts` or `src/utils/validationName.ts`
- Shared helpers: `src/utils/helperName.ts` (keep pure, no side effects)
- Domain-specific business logic: `src/lib/domainName.ts` (can depend on services/APIs)

**New API Client:**
- Integrate external API: Create `src/lib/serviceName-client.ts` with typed request/response
- Pattern: Export functions like `fetchData()`, `submitForm()` with error handling
- Reuse in hooks: Create hook in `src/hooks/useServiceName.ts` that calls the client

**New Context Provider:**
- Global state needed: Create `src/contexts/FeatureContext.tsx`
- Pattern: Export context, provider component, and custom hook (`useFeature()`)
- Wrap in `src/App.tsx` providers section

## Special Directories

**dist/:**
- Purpose: Built output from Vite
- Generated: Yes (via `npm run build`)
- Committed: No (gitignored)
- Contains: Bundled JS, CSS, HTML ready for deployment

**ios/:**
- Purpose: Capacitor native iOS application
- Generated: Partially (Capacitor manages structure)
- Committed: Yes (includes xcodeproj, config)
- Contains: Xcode project, native code, app icons/launch screens

**public/:**
- Purpose: Static web assets served at root
- Generated: No
- Committed: Yes
- Contains: Icons, marketing images, onboarding assets
- Served at: `http://localhost:8080/icons/...` during dev

**.planning/codebase/:**
- Purpose: Architecture and code guidance documentation
- Generated: No (manually written)
- Committed: Yes
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

**node_modules/:**
- Purpose: npm dependencies
- Generated: Yes (via npm install)
- Committed: No (gitignored)

---

*Structure analysis: 2026-03-29*
