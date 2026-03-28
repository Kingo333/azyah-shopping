# Technology Stack

**Analysis Date:** 2026-03-29

## Languages

**Primary:**
- TypeScript 5.5.3 - Application logic, components, and type safety
- JavaScript - Configuration files and build tooling
- CSS/Tailwind - Styling via Tailwind CSS 3.4.11

**Secondary:**
- HTML5 - Document structure with meta tags and PWA support
- YAML - CI/CD pipeline configuration (Codemagic)

## Runtime

**Environment:**
- Node.js v20.14.0 (specified in Codemagic workflow)

**Package Managers:**
- npm (primary, with package-lock.json)
- Bun (lockfile: bun.lock, bun.lockb present)

**Target Platforms:**
- Web (Vite-based SPA)
- iOS (via Capacitor)
- Android (via Capacitor)

## Frameworks

**Core:**
- React 18.3.1 - UI library and component framework
- React Router DOM 6.26.2 - Client-side routing
- Vite 5.4.1 - Build tool and development server with SWC transpilation

**State Management & Data Fetching:**
- TanStack React Query 5.84.1 - Server state management and caching
- Apollo Client 3.13.9 - GraphQL client for Supabase GraphQL API
- graphql 16.11.0 - Core GraphQL utilities
- graphql-ws 6.0.6 - WebSocket support for GraphQL subscriptions

**Mobile & Cross-Platform:**
- Capacitor 7.4.4 - Native iOS/Android bridge via web
  - @capacitor/ios 7.4.4
  - @capacitor/app 7.1.2
  - @capacitor/browser 7.0.4
  - @capacitor/clipboard 7.0.4
  - @capacitor/share 7.0.4
  - @capacitor/status-bar 7.0.5

**UI Component Library:**
- Radix UI (v1.1.0 - v2.2.1) - Unstyled, accessible components for all major UI elements
- shadcn/ui - Tailwind + Radix UI component system
- Lucide React 0.462.0 - Icon library
- HeroIcons React 2.2.0 - Icon set

**Styling & Theme:**
- Tailwind CSS 3.4.11 - Utility-first CSS framework
- Tailwind Merge 2.5.2 - Merge class names without conflicts
- tailwindcss-animate 1.0.7 - Animation utilities
- next-themes 0.3.0 - Dark mode and theme management
- PostCSS 8.4.47 - CSS transformation with autoprefixer

**Form Handling:**
- React Hook Form 7.53.0 - Performant form state management
- @hookform/resolvers 3.9.0 - Schema validation (Zod support)
- Zod 3.23.8 - TypeScript-first schema validation

**3D & AR:**
- Three.js 0.160.1 - 3D graphics library
- @react-three/fiber 8.18.0 - React renderer for Three.js
- @react-three/drei 9.122.0 - Useful helpers and abstractions for Three.js
- @mediapipe/tasks-vision 0.10.34 - ML Kit for vision (pose detection for AR)
- @mediapipe/pose 0.5.1675469404 - Pose landmark detection

**Data Visualization:**
- ECharts 5.5.0 - Declarative charting library
- echarts-for-react 3.0.2 - React wrapper for ECharts
- Recharts 2.12.7 - React charting library

**AI/ML & Vector Search:**
- OpenAI 5.12.2 - OpenAI API client
- @huggingface/transformers 3.7.1 - Hugging Face transformer models for embeddings and visual search
- @qdrant/js-client-rest 1.15.1 - Vector database REST client
- qdrant-client 0.0.1 - Vector database client wrapper

**UI Interactions & Animations:**
- Framer Motion 12.23.12 - React animation library
- Embla Carousel 8.6.0 - Carousel component
- embla-carousel-autoplay 8.6.0 - Carousel autoplay plugin
- React Intersection Observer 9.16.0 - Intersection observer hook
- React Resizable Panels 2.1.3 - Resizable layout panels
- Vaul 0.9.3 - Drawer component
- cmdk 1.0.0 - Command palette
- input-otp 1.2.4 - OTP input component
- react-dropzone 14.3.8 - File upload

**Utilities:**
- DOMPurify 3.2.6 - XSS prevention for HTML
- Sonner 1.5.0 - Toast notifications
- clsx 2.1.1 - Conditional CSS class binding
- class-variance-authority 0.7.1 - Variant-based component styling
- date-fns 3.6.0 - Date manipulation
- fastest-levenshtein 1.0.16 - String similarity (for fuzzy search)
- form-data 4.0.4 - FormData polyfill
- QRCode 1.5.4 - QR code generation
- @types/qrcode 1.5.5
- Sharp 0.34.3 - Image processing
- React Helmet Async 2.0.5 - Dynamic head management
- React Error Boundary 6.0.0 - Error boundary component
- XYFlow React 12.8.2 - Flowchart/diagram library
- topojson-client 3.1.0 - TopoJSON utilities for geographic data

**Testing:**
- Playwright 1.57.0 - E2E testing framework
- @playwright/test 1.57.0

**Accessibility:**
- Includes accessible form components via Radix UI
- ARIA attributes in components

## Configuration Files

**Build & Bundling:**
- `vite.config.ts` - Vite configuration with SWC plugin, path aliases, chunk splitting
- `tsconfig.json` - TypeScript configuration with path aliases (@/*)
- `tsconfig.app.json` - App-specific TypeScript config
- `tsconfig.node.json` - Node/build tools TypeScript config

**Styling:**
- `tailwind.config.ts` - Tailwind configuration with custom theme extensions
- `postcss.config.js` - PostCSS with autoprefixer

**Linting & Code Quality:**
- `eslint.config.js` - ESLint configuration with React hooks and refresh plugins

**Mobile:**
- `capacitor.config.ts` - Capacitor configuration for iOS/Android
- `app.json` - Expo-compatible app metadata (app ID, version, platforms)

**CI/CD:**
- `codemagic.yaml` - CodeMagic workflow for iOS build and App Store Connect integration

## Key Dependencies

**Critical Infrastructure:**
- @supabase/supabase-js 2.78.0 - Backend-as-a-Service with auth, database, storage, and functions
- @qdrant/js-client-rest 1.15.1 - Vector search for semantic product search
- @revenuecat/purchases-capacitor 11.3.0 - In-app purchase management via RevenueCat (iOS/Android)

**AI/ML Processing:**
- @huggingface/transformers 3.7.1 - Client-side ML for visual search and image processing
- OpenAI 5.12.2 - LLM API integration

**Analytics & Monitoring:**
- No error tracking service detected (Sentry/Rollbar not present)

## Platform Requirements

**Development:**
- Node.js v20.14.0 (or compatible)
- npm or Bun package manager
- macOS with Xcode 16.0 for iOS development
- Cocoapods for iOS dependencies

**Production:**
- Web: Static hosting (built to `dist/` directory)
- iOS: App Store (app ID: 6755971189, bundle ID: com.azyah.style)
- Android: Google Play (package ID: com.azyah.style)

## Build Process

**Development Server:**
- `npm run dev` - Starts Vite dev server on port 8080
- Hot module reloading via Vite

**Production Build:**
- `npm run build` - Vite build to `dist/` directory with chunk splitting
- Chunk splitting strategy:
  - vendor-react: React and routing
  - vendor-query: TanStack Query
  - vendor-supabase: Supabase client
  - vendor-motion: Framer Motion
  - charts: ECharts and Recharts
- Rollup manual chunks for optimized loading
- Chunk size warning limit: 600KB

**Mobile Build:**
- Capacitor sync to iOS and Android projects
- CodeMagic automated iOS builds with App Store Connect integration

## Environment Configuration

**Required Environment Variables (Build Time):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `VITE_REVENUECAT_API_KEY` - RevenueCat API key (required for iOS IAP)

**Optional Environment Variables:**
- `QDRANT_URL` - Qdrant vector database URL (defaults to http://localhost:6333)
- `QDRANT_API_KEY` - Qdrant API key
- `AZ_PRICE_TIER_DRUGSTORE_MAX` - Price threshold for drugstore tier
- `AZ_PRICE_TIER_MID_MAX` - Price threshold for mid-tier products

**Supabase Credentials:**
- Stored in `src/integrations/supabase/client.ts`
- Published key embedded in client (safe for anonymous access)

---

*Stack analysis: 2026-03-29*
