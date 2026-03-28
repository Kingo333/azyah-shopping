# Testing Patterns

**Analysis Date:** 2026-03-29

## Test Framework

**Runner:**
- Playwright: `@playwright/test` (version ^1.57.0)
- Config: `playwright.config.ts`
- Framework: Lovable Agent Playwright Config (`lovable-agent-playwright-config/config`)

**Assertion Library:**
- Playwright test assertions (built-in with `@playwright/test`)
- Custom fixture from `playwright-fixture.ts`

**Run Commands:**
No explicit test scripts found in `package.json`. Framework configured but no dev dependency for running tests locally.

```bash
# Expected test commands (based on Playwright setup):
npx playwright test              # Run all tests
npx playwright test --watch      # Watch mode
npx playwright test --ui         # UI mode (interactive)
```

## Test File Organization

**Location:**
- E2E tests expected in `e2e/` directory (as per Lovable convention)
- Currently: No test files present in source tree (`src/` directory)
- Tests organized separately from source code

**Naming:**
- Pattern: Not established (no existing tests in codebase)
- Recommended: `{feature}.spec.ts` or `{page}.e2e.ts`

**Structure:**
```
project-root/
├── e2e/                    # E2E tests (Lovable convention)
│   ├── auth.spec.ts
│   ├── shopping.spec.ts
│   └── ...
└── src/                    # Source code (no unit tests)
```

## Test Structure

**Suite Organization:**
Based on Playwright conventions (no custom setup in codebase):

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup
  });

  test('should do something', async ({ page }) => {
    // Test logic
    expect(value).toBe(expected);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup
  });
});
```

**Patterns:**
- Setup: `test.beforeEach()` for common initialization
- Teardown: `test.afterEach()` for cleanup
- Assertions: `expect()` with matcher methods (`.toBe()`, `.toContain()`, etc.)
- Async/await for all async operations

## Mocking

**Framework:**
- Playwright built-in mocking via route interception
- No dedicated mocking library (jest/vitest not installed)

**Patterns:**
```typescript
// Route interception example (Playwright pattern):
await page.route('**/api/**', route => {
  if (route.request().method() === 'GET') {
    route.abort();
  } else {
    route.continue();
  }
});

// Mock API responses
await page.route('**/api/products', route => {
  route.abort('blockedreason');
});
```

**What to Mock:**
- External API calls (reduce flakiness)
- Third-party service endpoints
- Analytics endpoints (fire-and-forget services)
- Heavy computations or long-running operations

**What NOT to Mock:**
- Application UI behavior
- Database/Supabase operations (use test environment or fixtures)
- Authentication flows (test real auth when possible)
- User interactions and DOM changes

## Fixtures and Factories

**Test Data:**
No centralized test data factories currently exist in codebase.

Recommended pattern (Playwright fixture):
```typescript
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Setup authentication
    await page.goto('/login');
    await page.fill('[name=email]', 'test@example.com');
    await page.fill('[name=password]', 'password123');
    await page.click('button[type=submit]');
    await page.waitForNavigation();

    await use(page);
  },
});
```

**Location:**
- Fixtures: `playwright-fixture.ts` (custom re-export of Lovable fixture)
- Test data generators: Should be created in `e2e/fixtures/` directory
- Shared test utilities: `e2e/helpers/` or `e2e/utils/` directory

## Coverage

**Requirements:** None enforced

Coverage tools not configured. No CI coverage gates detected.

**View Coverage:**
```bash
# Playwright coverage (if enabled in config):
npx playwright test --reporter=html
# Opens interactive HTML report with coverage data
```

## Test Types

**Unit Tests:**
- Not currently implemented in codebase
- Would test: Utility functions, helpers, validators
- Tools needed: Jest or Vitest (not installed)

**Integration Tests:**
- Not currently implemented
- Would test: Hook behavior, component integration, API interactions
- Tools needed: React Testing Library + Jest (not installed)

**E2E Tests:**
- Framework: Playwright
- Scope: Full user journeys from browser perspective
- Examples to write:
  - User authentication flow (signup, login, logout)
  - Shopping cart workflows
  - Product browsing and filtering
  - Community features (posts, comments)
  - Design canvas interactions

## Common Patterns

**Async Testing:**
All Playwright tests are async by default with proper await:

```typescript
test('should load page', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.product-list');
  const items = await page.locator('.product-item').count();
  expect(items).toBeGreaterThan(0);
});
```

**Error Testing:**
Playwright supports error assertions:

```typescript
test('should show error on failed login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', 'invalid@example.com');
  await page.fill('[name=password]', 'wrongpassword');
  await page.click('button[type=submit]');

  await expect(page.locator('.error-message')).toBeVisible();
  await expect(page).toHaveURL('/login');
});
```

## Test Environment Configuration

**Lovable Config Setup:**
File: `playwright.config.ts`
```typescript
import { createLovableConfig } from "lovable-agent-playwright-config/config";

export default createLovableConfig({
  // Tests should be placed in the 'e2e' folder (default)
  // Add your custom playwright configuration overrides here
  // Example:
  // timeout: 60000,
  // use: {
  //   baseURL: 'http://localhost:3000',
  // },
});
```

**Custom Config Options Available:**
- `timeout`: Individual test timeout (default: 30000ms)
- `use.baseURL`: Base URL for all page.goto() calls
- `workers`: Parallel test execution count
- `retries`: Retry failed tests N times
- `use.screenshot`: Capture screenshots on failure

## Fixture Exports

**Base Fixture Re-export:**
File: `playwright-fixture.ts`
```typescript
export { test, expect } from "lovable-agent-playwright-config/fixture";
```

Import in tests:
```typescript
import { test, expect } from './playwright-fixture';
// Or directly from package:
import { test, expect } from '@playwright/test';
```

## Testing Best Practices (Not Yet Implemented)

These patterns should be adopted when writing tests:

1. **Arrange-Act-Assert Pattern:**
   ```typescript
   test('adds item to cart', async ({ page }) => {
     // Arrange
     await page.goto('/products');

     // Act
     await page.click('[data-testid=add-to-cart]');

     // Assert
     await expect(page.locator('[data-testid=cart-count]')).toHaveText('1');
   });
   ```

2. **Use Data Attributes:**
   - Mark testable elements with `data-testid` attributes
   - Avoid selecting by class or internal structure
   - Example: `<button data-testid="submit-form">Submit</button>`

3. **Test User Flows, Not Implementation:**
   - Test what users see and do
   - Don't test internal state directly
   - Avoid testing React component props/state internals

4. **Isolate Tests:**
   - Each test should be independent
   - Use beforeEach for setup, afterEach for cleanup
   - Avoid test interdependencies

5. **Descriptive Test Names:**
   - Use `should` or `does` naming: `should display error on invalid email`
   - Avoid technical names: `testInputValidation`

## Gap Analysis

**Missing Test Infrastructure:**
- No unit test framework (Jest/Vitest)
- No component testing library (React Testing Library)
- No API mocking library (MSW - Mock Service Worker)
- No test utilities in codebase
- No established fixture factories
- No example E2E tests to follow

**Recommended Setup for Future:**
1. Install Jest or Vitest for unit testing
2. Add React Testing Library for component tests
3. Create `e2e/` directory with example tests
4. Create `e2e/fixtures/` for test data factories
5. Create `e2e/helpers/` for shared test utilities
6. Document component `data-testid` conventions
7. Set up code coverage reporting

---

*Testing analysis: 2026-03-29*
