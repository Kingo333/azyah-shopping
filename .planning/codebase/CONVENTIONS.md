# Coding Conventions

**Analysis Date:** 2026-03-29

## Naming Patterns

**Files:**
- Component files: PascalCase (e.g., `AccessibilityProvider.tsx`, `ProtectedRoute.tsx`)
- Utility/helper files: camelCase (e.g., `imageHelpers.ts`, `sessionHealthCheck.ts`, `asosImageUtils.ts`)
- Hook files: `use` prefix in camelCase (e.g., `useFits.ts`, `useCanvasState.ts`, `useSessionMonitor.ts`)
- Context/provider files: PascalCase with Provider suffix (e.g., `AuthContext.tsx`, `AccessibilityProvider.tsx`)
- Type definition files: kebab-case with types suffix (e.g., `password-validation.ts`)

**Functions:**
- React components: PascalCase
- Hook functions: camelCase with `use` prefix (e.g., `useAuth()`, `useFits()`, `useCanvasState()`)
- Utility functions: camelCase (e.g., `getAllProductImages()`, `checkPasswordStrength()`, `optimizeAsosSpecificUrl()`)
- Event handlers: camelCase with descriptive verbs (e.g., `handleSetFontSize()`, `announceToScreenReader()`, `toggleHighContrast()`)
- Private/internal functions: camelCase (no underscore prefix, but placed after public exports)

**Variables:**
- Local variables and state: camelCase (e.g., `const isHighContrast`, `const savedPreferences`)
- Constants: UPPER_SNAKE_CASE (e.g., `const FREE_OUTFIT_LIMIT = 5`, `const AUTOSAVE_KEY = 'dressme_canvas_autosave'`)
- Component props: camelCase (e.g., `children`, `roles`, `fontSize`)
- TypeScript generics: PascalCase (e.g., `<T>`, `<UserRole>`)

**Types/Interfaces:**
- Interfaces: PascalCase (e.g., `AuthContextType`, `AccessibilityContextType`, `CanvasState`)
- Type aliases: PascalCase (e.g., `UserRole`, `Fit`, `FitItem`)
- Generic constraints: PascalCase
- Props interfaces: Component name + `Props` suffix (e.g., `AccessibilityProviderProps`, `ProtectedRouteProps`)

## Code Style

**Formatting:**
- No strict formatter configured (no Prettier detected)
- Consistent indentation: 2 spaces (observed in all TSX/TS files)
- Line length: No hard limit enforced, but files generally stay under 300 lines per file
- Import statements: Generally alphabetically ordered within groups

**Linting:**
- Tool: ESLint with TypeScript support
- Config: `eslint.config.js`
- Key rules enabled:
  - React hooks rules: `reactHooks.configs.recommended`
  - React refresh rule: `react-refresh/only-export-components` (warns with `allowConstantExport: true`)
  - TypeScript recommended rules from `typescript-eslint`
- Disabled rules:
  - `@typescript-eslint/no-unused-vars`: OFF (disabled - unused variables allowed)
- ECMAVersion: 2020

## Import Organization

**Order:**
1. External libraries (e.g., `react`, `@tanstack/react-query`, `@supabase/supabase-js`)
2. Library utilities (e.g., `lucide-react`, `sonner`, `clsx`)
3. Internal integrations (e.g., `@/integrations/supabase/client`)
4. Internal contexts (e.g., `@/contexts/AuthContext`)
5. Internal hooks (e.g., `@/hooks/useAuth`)
6. Internal components (e.g., `@/components/...`)
7. Internal utils and lib (e.g., `@/utils/...`, `@/lib/...`)
8. Internal types (e.g., `@/types/...`)
9. Relative imports (e.g., `./styles.css`, `./constants`)
10. Type imports use `import type` syntax (e.g., `import type { UserRole } from '@/lib/rbac'`)

**Path Aliases:**
- `@/*` maps to `./src/*` as defined in `tsconfig.json`
- Used consistently throughout codebase for cleaner imports
- Always prefer absolute imports with `@/` over relative paths

## Error Handling

**Patterns:**
- Wrapped in try-catch blocks for async operations
- Error types: Check for specific error messages (e.g., `error.message.includes('refresh_token')`)
- Logging on error: `console.error()` for serious errors, `console.log()` for debug info
- Graceful degradation: Fallback values provided (e.g., placeholder images, default states)
- User feedback: Toast notifications via `sonner` for user-facing errors (e.g., `toast.error('...')`)
- Silent failures acceptable for non-critical operations (e.g., analytics, tracking)
- Storage errors: Generally ignored with try-catch, no UI notification

Example pattern from `useCanvasState.ts`:
```typescript
try {
  const parsed: CanvasState = JSON.parse(saved);
  if (parsed.layers?.length > 0) {
    setLayers(parsed.layers);
    setBackground(parsed.background || { type: 'solid', value: '#FFFFFF' });
  }
} catch (e) {
  console.error('Failed to load canvas state:', e);
}
```

## Logging

**Framework:** `console` directly (both `console.log`, `console.error`, `console.warn`)

**Custom logger:** `@/utils/logger.ts` available for production-safe logging
- Exported as `logger` singleton with methods: `log()`, `warn()`, `error()`, `debug()`, `info()`
- In development: All methods enabled
- In production: Only `error()` enabled
- Usage: `import { logger } from '@/utils/logger'`

**Patterns:**
- Debug info: Typically logged with descriptive prefixes in brackets (e.g., `'[AiTryOnModal]'`, `'[ProtectedRoute]'`)
- Development-only logging: `const DEBUG_AUTH = process.env.NODE_ENV === 'development'`
- Always log errors that reach catch blocks
- Log state changes in auth and session management
- Avoid logging sensitive data (passwords, tokens, PII)

Example pattern from `ProtectedRoute.tsx`:
```typescript
const DEBUG_AUTH = process.env.NODE_ENV === 'development';

if (DEBUG_AUTH) console.log('ProtectedRoute: Showing loading - loading:', loading, 'authStable:', authStable);
```

## Comments

**When to Comment:**
- Complex algorithms or non-obvious business logic
- Workarounds or known limitations (e.g., `// SAFARI-STYLE: Don't overlay...`)
- Important implementation notes explaining "why" not "what"
- Security or performance considerations
- Disable rule explanations (ESLint overrides)
- TODOs and FIXMEs for incomplete work

**JSDoc/TSDoc:**
- Used for utility functions and exported helpers
- Single-line format for simple descriptions
- Multi-line format for functions with parameters:
  ```typescript
  /**
   * Extract all available images from a product
   * Prioritizes media_urls (which contains all ASOS images) over image_url
   */
  export function getAllProductImages(product: any): ImageData[] { ... }
  ```
- Not used extensively for React components (props interfaces used instead)
- Parameter and return type documentation optional but recommended for utilities

## Function Design

**Size:**
- Generally 20-100 lines per function in utilities
- Components can be 50-200+ lines depending on render complexity
- Long functions broken into smaller helpers

**Parameters:**
- Accept objects for multiple parameters (destructured in signature)
- Use type annotations for clarity
- Optional parameters with `?` notation
- No required positional parameters after optional ones

**Return Values:**
- Explicitly typed with TypeScript
- Consistent return shapes (objects with named properties preferred over tuples)
- Async functions return Promises with clear typing
- Early returns for guard conditions

Example from `imageHelpers.ts`:
```typescript
export function getProductImageUrls(product: any): string[] {
  if (!product) {
    logger.warn('getProductImageUrls: No product provided');
    return ['/placeholder.svg'];
  }
  // ... implementation
  return finalImages;
}
```

## Module Design

**Exports:**
- Named exports preferred for utilities (e.g., `export const logger = {...}`)
- Default exports for React components (especially route pages)
- Multiple named exports common in hooks files (e.g., `useFits`, `usePublicFits`, `useSaveFit`)
- Type exports use `export type` or `export interface`

**Barrel Files:**
- Used selectively (e.g., `src/types/index.ts`)
- Not enforced project-wide
- Components each in own file without barrel aggregation

Example pattern from `useFits.ts`:
```typescript
export interface Fit { ... }
export interface FitItem { ... }
export const useFits = () => { ... }
export const usePublicFits = (limit = 20) => { ... }
export const useSaveFit = () => { ... }
```

## React Patterns

**Hooks:**
- Custom hooks return object with named properties (not array destructuring)
- `useQuery` and `useMutation` from `@tanstack/react-query` for server state
- `useState` for component-local state
- `useCallback` for stable function references
- Context hooks follow pattern: `const context = useContext(Context); if (!context) throw new Error(...)`

**Component Structure:**
- Interface defined before component function
- Props interface optional if simple
- No functional component overloads - single function definition
- Return JSX fragments or wrapper divs

**Context Providers:**
- Create context before component
- Custom hook to access context with null check
- Provider component with children prop typed as `React.ReactNode`
- Value object created inline or extracted for clarity

---

*Convention analysis: 2026-03-29*
