# External Integrations

**Analysis Date:** 2026-03-29

## APIs & External Services

**Backend & Database:**
- Supabase - Backend-as-a-Service platform
  - SDK: `@supabase/supabase-js` 2.78.0
  - Auth: Published key embedded in `src/integrations/supabase/client.ts`
  - Features: Authentication, PostgreSQL database, file storage, edge functions, GraphQL API
  - URL: `https://klwolsopucgswhtdlsps.supabase.co`

**AI & ML:**
- OpenAI API - LLM and embeddings
  - SDK: `openai` 5.12.2
  - Auth: Environment variable (implementation in codebase)
  - Use case: AI-powered features (completions, embeddings)

- Hugging Face Transformers - Client-side ML models
  - SDK: `@huggingface/transformers` 3.7.1
  - Features: Visual search, background removal, embeddings (running in browser)
  - Used in: `src/components/VisualSearchModal.tsx`, `src/utils/backgroundRemoval.ts`
  - Auth: Model access via free tier (some models may require token)

**Vector Search:**
- Qdrant - Vector database for semantic search
  - SDK: `@qdrant/js-client-rest` 1.15.1
  - Connection: `process.env.QDRANT_URL` (defaults to http://localhost:6333)
  - API Key: `process.env.QDRANT_API_KEY`
  - Collections:
    - `kb_beauty_docs` - Beauty knowledge base documents
    - `kb_products` - Product embeddings for semantic search
  - Used in: `src/lib/qdrant.ts`, `src/lib/products.ts`

**Product Data API:**
- Axesso Product Details API - Product scraping and data enrichment
  - SDK: `axesso-client.ts` (custom implementation in `src/lib/`)
  - Auth: API Key via header `X-RapidAPI-Key` (dual key support)
  - Endpoint: `http://api.axesso.de/aso/lookup-product-details`
  - Features: Product details, pricing, availability, variations
  - Cache: 12-hour TTL with in-memory cache
  - Used in: `src/lib/axesso-client.ts`, `src/lib/enhanced-axesso-client.ts`

**AR/Virtual Try-On:**
- BitStudio AI API - AI-powered virtual try-on and image generation
  - SDK: `src/lib/bitstudio-client.ts` (custom wrapper)
  - Integration: Via Supabase Edge Functions
  - Functions invoked:
    - `bitstudio-health` - Health check
    - `bitstudio-upload` - Image upload
    - `bitstudio-status/{id}` - Poll generation status
    - `bitstudio-tryon` - Virtual try-on processing
  - Features: Virtual try-on, image upscaling, style transformation
  - Status polling: Exponential backoff (2s → 10s max), 180s timeout
  - Used in: `src/components/AiTryOnModal.tsx`, AR experience components

**Vision/Pose Detection:**
- MediaPipe Vision Tasks
  - SDK: `@mediapipe/tasks-vision` 0.10.34
  - Models: Pose landmark detection for AR try-on
  - Used in: `src/pages/ARExperience.tsx`
  - Client-side processing (no external API call)

**3D Models:**
- Implicit 3D model generation (via Supabase functions)
  - Used for product AR experiences
  - Integration: Supabase edge functions

## Data Storage

**Databases:**
- PostgreSQL via Supabase
  - Connection: Managed via `@supabase/supabase-js`
  - Client: Supabase JS SDK (built-in)
  - Tables: users, products, outfits, likes, wishlists, subscriptions, profiles, brands, posts, etc.
  - Auth: Supabase auth with JWT tokens
  - Connection URL: `https://klwolsopucgswhtdlsps.supabase.co`

**File Storage:**
- Supabase Storage (S3-compatible)
  - Buckets:
    - `product-images` - Uploaded product images
    - `deals-uploads` - Deal photos
    - `outfit-images` - User outfit photos
    - User avatar storage
  - Client: Via Supabase JS SDK `supabase.storage.from('bucket-name')`
  - Used in: `src/components/AddProductModal.tsx`, image upload components

**Vector Database:**
- Qdrant - Vector embeddings
  - Collections: `kb_products`, `kb_beauty_docs`
  - Payload type: `ProductPayload` (defined in `src/lib/qdrant.ts`)

**Caching:**
- In-memory caching: Axesso API responses (12-hour TTL)
- Browser localStorage: Supabase session persistence

## Authentication & Identity

**Auth Provider:**
- Supabase Authentication
  - Implementation: Custom (`src/integrations/supabase/client.ts`)
  - Methods: Email/password, OAuth (social login)
  - Storage: localStorage with auto-token refresh
  - Persistence: Enabled with autoRefreshToken
  - Used in: Auth guards, protected routes via `AuthAwareRoute.tsx`

**In-App Purchase Authentication:**
- RevenueCat
  - SDK: `@revenuecat/purchases-capacitor` 11.3.0
  - Environment: iOS/Android native only (web returns safe defaults)
  - Configuration: Via `src/lib/iap.ts`
  - API Key: `VITE_REVENUECAT_API_KEY`
  - Product IDs:
    - `com.azyah.style.premium.monthly`
    - `com.azyah.style.premium.yearly`
  - Features: Subscription management, transaction tracking
  - Used in: `src/hooks/useSubscription.ts`, `src/hooks/usePremium.ts`

**Profile Sync:**
- Sync from auth metadata to database profile
  - Method: RPC function `sync_my_profile_from_auth`
  - Used in: Profile display components

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry, Rollbar, or error tracking service configured

**Logging:**
- Console logging (development)
- Client-side logs: Alert/error boundaries
- Structured logging in client modules:
  - BitStudio API calls logged in `src/lib/bitstudio-client.ts`
  - IAP operations logged in `src/lib/iap.ts`
  - Axesso API calls logged in `src/lib/axesso-client.ts`

**Analytics:**
- GraphQL subscription available: `RealTimeAnalytics`
- Client-side event tracking mutation: `TrackEvent`
- Analytics provider: Custom via Supabase GraphQL

## CI/CD & Deployment

**Mobile App Build:**
- CodeMagic - Automated iOS builds
  - Workflow: `azyah-ios-capacitor`
  - Build time: Max 120 minutes
  - Instance: Mac Mini M2
  - Xcode: Version 16.0
  - Node: v20.14.0
  - Integration: App Store Connect (via Codemagic integration)

**App Store Connect:**
- App ID: 6755971189
- Bundle ID: com.azyah.style
- Distribution: App Store (configured in Codemagic)

**Web Hosting:**
- Build output: `dist/` directory
- Vite static build (SPA)
- Can be deployed to any static hosting (Vercel, Netlify, etc.)

**Android Deployment:**
- Capacitor sync to android/ directory
- Google Play console deployment (not automated in provided config)

**PWA Support:**
- Manifest: `/manifest.json`
- Service worker support configured
- Meta tags for iOS and Android PWA installation

## Environment Configuration

**Required Environment Variables (Build & Runtime):**

```
VITE_SUPABASE_URL=https://klwolsopucgswhtdlsps.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_REVENUECAT_API_KEY=<RevenueCat API key>
```

**Optional Environment Variables (Runtime):**

```
QDRANT_URL=http://localhost:6333 (or Qdrant cloud URL)
QDRANT_API_KEY=<Qdrant API key if required>
AZ_PRICE_TIER_DRUGSTORE_MAX=60 (AED)
AZ_PRICE_TIER_MID_MAX=180 (AED)
```

**Secrets Storage:**
- Codemagic environment groups: `azyah-secrets`
- Development: `.env` file (not tracked)
- Production: Codemagic UI environment variables

## Webhooks & Callbacks

**Incoming Webhooks:**
- None detected in codebase

**Outgoing Webhooks/Events:**
- RevenueCat subscription events (handled via SDK)
- Supabase auth state changes
- Supabase real-time subscriptions (GraphQL subscriptions)

**Polling:**
- BitStudio image generation status: Polls every 2s-10s with exponential backoff (max 180s)

## Integration Points Summary

**Frontend to Backend:**
- Supabase client: Auth, database queries, storage, edge functions
- Apollo Client: GraphQL queries to Supabase GraphQL API
- TanStack Query: API caching and state management
- React Router: Client-side navigation

**Mobile Native Integrations:**
- Capacitor: Bridge to iOS/Android native APIs (status bar, share, browser)
- RevenueCat: In-app purchases and subscriptions
- App metadata: Expo-compatible app.json configuration

**Third-Party APIs:**
- OpenAI: LLM completions and embeddings
- Hugging Face: Model downloads and inference (local)
- BitStudio: Virtual try-on via edge functions
- Axesso: Product enrichment data
- Qdrant: Vector search
- MediaPipe: Pose detection (local)

**Data Flow:**
1. User uploads image → Supabase Storage
2. Image processed via BitStudio → Results in database
3. Products indexed in Qdrant for semantic search
4. Visual search queries → Hugging Face transformers + Qdrant
5. Real-time data → GraphQL subscriptions via Supabase

---

*Integration audit: 2026-03-29*
