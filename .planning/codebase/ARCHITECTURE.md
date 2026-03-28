# Architecture

**Analysis Date:** 2026-03-29

## Pattern Overview

**Overall:** Feature-driven React SPA with cross-platform support (web + native mobile)

**Key Characteristics:**
- Client-side React application with server-side persistence via Supabase
- Feature-flag driven modularity for brand/retailer/shopper portals
- Role-based access control (RBAC) with strict gateway enforcement
- Optimized data fetching with React Query and caching patterns
- Capacitor bridge for native iOS/Android functionality

## Layers

**Presentation Layer:**
- Purpose: UI components and page layouts
- Location: `src/pages/`, `src/components/`
- Contains: React functional components, page routes, modal dialogs, form interfaces
- Depends on: Hooks layer (for data), Contexts (for auth/state), UI library (shadcn/radix-ui)
- Used by: React Router for page rendering, entry point `src/App.tsx`

**State Management Layer:**
- Purpose: Authentication, global state, cross-component context
- Location: `src/contexts/` (AuthContext, FeatureFlagsContext, LayerScrollContext)
- Contains: React Context providers with auth logic, permission evaluation, session management
- Depends on: Supabase client, utility functions (sessionHealthCheck, roleCache)
- Used by: All pages and components via context hooks

**Data Fetching & Query Layer:**
- Purpose: Async operations, caching, API integration
- Location: `src/hooks/useXxx*.ts` (60+ custom hooks)
- Contains: React Query hooks (useQuery/useMutation), Supabase queries, external API calls
- Depends on: Supabase client, external SDKs (OpenAI, HuggingFace, RevenueCat)
- Used by: All page components for data loading and mutations

**Integration Layer:**
- Purpose: External service clients and configurations
- Location: `src/integrations/supabase/` (client, types), `src/lib/` (service clients)
- Contains: Supabase client initialization, Apollo GraphQL, API clients (Axesso, BitStudio, OpenAI)
- Depends on: Environment variables for API keys and endpoints
- Used by: Data fetching hooks and utilities

**Utility & Helper Layer:**
- Purpose: Reusable functions and business logic
- Location: `src/utils/`, `src/lib/`
- Contains: Image processing, security validation, RBAC logic, formatting utilities
- Depends on: Third-party libraries (sharp, dompurify, transformers)
- Used by: Components, hooks, and other utilities

**Type Definition Layer:**
- Purpose: TypeScript type definitions for domain models
- Location: `src/types/index.ts`, `src/integrations/supabase/types.ts` (auto-generated)
- Contains: User, Product, Brand, Order, Swipe, CartItem interfaces
- Depends on: Supabase schema (auto-generated)
- Used by: All layers for type safety

## Data Flow

**Product Discovery (Swipe Flow):**
1. User navigates to `/swipe` → `Swipe.tsx` page component renders
2. `Swipe` initializes filters from URL params and React Query for product data
3. `useUnifiedProducts()` hook executes Supabase query based on filters
4. Query client caches results (5-minute stale time, 15-minute GC)
5. Components (SwipeDeck, ProductMasonryGrid) render cached products
6. User swipe actions trigger `useMutation()` to update database
7. Analytics hook tracks swipe metrics for taste profile building

**Authentication Flow:**
1. User accesses protected route → `ProtectedRoute` component checks auth status
2. If no session, redirect to `/onboarding/signup` or `/landing`
3. `AuthProvider` manages auth state via `supabase.auth.onAuthStateChange()` listener
4. On sign-in success, `AuthContext` fetches user role from `roleCache`
5. RBAC rules (from `src/lib/rbac.ts`) determine route access
6. Session health check (on app startup) validates token freshness
7. Auto-refresh via Supabase client handles token lifecycle

**Data Mutation Flow:**
1. Component form submission → `useMutation()` from React Query triggered
2. Mutation function calls Supabase `insert()`, `update()`, or `delete()`
3. On success: Query client invalidates related cache keys
4. UI updates via React state or optimistic updates
5. Toast notification provides user feedback
6. Error boundary catches and logs failures

**State Management:**
- **Auth State:** Persisted via localStorage, managed by `AuthProvider` context
- **Query Cache:** Managed by React Query with configurable stale/GC times
- **UI State:** Local component state (useState) for modals, filters, view modes
- **Feature Flags:** `FeatureFlagsContext` controls feature visibility by user role
- **Guest Mode:** localStorage flag (`isGuestMode()`) allows browsing without auth

## Key Abstractions

**Protected Route Abstraction:**
- Purpose: Enforce RBAC before rendering components
- Examples: `src/components/ProtectedRoute.tsx`, `src/components/AuthAwareRoute.tsx`
- Pattern: Higher-order component wrapping routes with role checks and redirect logic

**Custom Hooks (Data Fetching):**
- Purpose: Encapsulate Supabase/API calls with loading/error states
- Examples: `useAnalytics()`, `useAddProductToWardrobe()`, `useDealsFromImage()`
- Pattern: Return `{ data, error, isLoading }` object for consumer usage

**Query Key Factory Pattern:**
- Purpose: Consistent cache invalidation across mutations
- Examples: Query keys like `['analytics', entityId, entityType]`, `['user-swipe-count', user?.id]`
- Pattern: Array of identifiers scoped by entity type and ID

**Component Composition:**
- Purpose: Break large features into managed sub-components
- Examples: DressMe broken into `DressMeCanvas`, `DressMeWardrobe`, `DressMeCommunity`
- Pattern: Parent page orchestrates sub-pages/modals; data flows down via props

**API Client Wrappers:**
- Purpose: Normalize external API responses and handle errors
- Examples: `src/lib/axesso-client.ts`, `src/lib/bitstudio-client.ts`, `src/lib/iap.ts`
- Pattern: Functions return typed responses with error handling and retry logic

## Entry Points

**Application Entry:**
- Location: `src/main.tsx`
- Triggers: Browser page load via `index.html`
- Responsibilities: Initialize React root, configure iOS StatusBar via Capacitor, render App

**Route Configuration:**
- Location: `src/App.tsx`
- Triggers: App component mounts
- Responsibilities: Define all routes with proper protection levels, wrap with providers (Auth, Theme, Query, Helmet)

**Authentication Hook:**
- Location: `src/contexts/AuthContext.tsx`
- Triggers: App starts, auth state changes
- Responsibilities: Monitor Supabase auth events, perform health checks, manage session lifecycle

**Native Bridge:**
- Location: `src/main.tsx`, hooks like `useDeepLinkHandler()`, `useSessionMonitor()`
- Triggers: Capacitor lifecycle events
- Responsibilities: Handle iOS/Android deep links, status bar configuration, push notifications

## Error Handling

**Strategy:** Layered error boundaries with fallback UI and logging

**Patterns:**
- **React Error Boundary:** `react-error-boundary` wraps page components to catch render errors
- **Async Error Handling:** Try/catch in hooks, error states in React Query, toast notifications
- **Network Error Recovery:** React Query retry logic (1 retry by default), exponential backoff via custom configs
- **Auth Error Handling:** `AuthContext` detects unhealthy sessions and triggers logout + redirect
- **Validation Errors:** Zod schemas in form hooks validate input before submission

## Cross-Cutting Concerns

**Logging:** `src/utils/logger.ts` provides centralized console logging wrapper; structured logging to Supabase via event table

**Validation:**
- Input: `@hookform/resolvers` + Zod schemas (`CredentialsSchema` in auth forms)
- Data: Type safety via TypeScript and auto-generated Supabase types
- Security: `src/utils/securityValidation.ts`, `src/utils/sanitizeHtml.ts`

**Authentication:**
- Supabase Auth (email/password, OAuth removed)
- JWT tokens in localStorage, auto-refresh via Supabase client
- RBAC applied at route level via `ProtectedRoute` and role checks in hooks

**Analytics:**
- Event tracking via `useAnalytics()` hook family
- Events stored in Supabase `events` table with user_id, event_type, metadata
- Dashboard views in `AnalyticsDashboard.tsx` for brand/retailer insights

**Image Processing:**
- Optimization: `src/utils/imageOptimizer.ts` handles resizing, compression
- AR/TryOn: `src/utils/objectDetection.ts` for MediaPipe pose detection
- Canvas: `src/utils/canvasToImage.ts` for outfit board export

---

*Architecture analysis: 2026-03-29*
