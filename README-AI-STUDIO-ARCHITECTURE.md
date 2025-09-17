# AI Studio & BitStudio Integration - Working Architecture Documentation

## Overview

This document details the working architecture of the AI Studio and BitStudio integration as of commit `12b3b80`. This system successfully handles virtual try-on functionality both in the standalone AI Studio modal and the Product Try-On feature.

## Architecture Components

### 1. Frontend Components

#### Main Entry Points
- **`AiStudioModal.tsx`** - Standalone AI Studio interface accessible from dashboard
- **`ProductTryOnModal.tsx`** - Product-specific try-on interface in shopping flows

#### Supporting Components
- **`AiStudio/AiStudioHeader.tsx`** - Header with premium status and upgrade options
- **`AiStudio/AiStudioResultsPanel.tsx`** - Displays current results and asset gallery
- **`AiStudio/AiStudioUploadPanel.tsx`** - File upload interface for person/outfit images
- **`AiStudio/AiStudioControlsPanel.tsx`** - Generation settings and controls
- **`AiStudio/AiStudioHelpPanel.tsx`** - Error handling and help information

### 2. Core Hooks

#### `useBitStudio()` Hook
**Location**: `src/hooks/useBitStudio.ts`

**Purpose**: Primary interface for BitStudio API operations

**Key Functions**:
- `uploadImage(file: File, type: string)` - Uploads images to BitStudio
- `virtualTryOn(params)` - Initiates virtual try-on generation
- `healthCheck()` - Validates BitStudio API connectivity
- Error handling with user-friendly messages
- Loading state management

**Error Handling Strategy**:
- Specific error codes mapped to user actions (upgrade plans, check docs)
- Rate limiting and retry logic
- File validation (HEIC detection, size limits)
- Toast notifications with actionable buttons

#### `useAiAssets()` Hook
**Location**: `src/hooks/useAiAssets.ts`

**Purpose**: Manages persistent storage of AI-generated results

**Key Functions**:
- `fetchAssets()` - Loads user's saved AI try-on results
- `saveAsset(assetUrl, jobId, title)` - Saves new results to database
- `deleteAssets(assetIds)` - Removes selected assets
- Session management and retry logic
- Debounced user detection

**Database Integration**:
- Uses `ai_assets` table in Supabase
- Filters by `asset_type: 'tryon_result'`
- User-scoped data with automatic cleanup
- Robust error handling and session refresh

### 3. BitStudio Client Layer

#### `BitStudioClient` Class
**Location**: `src/lib/bitstudio-client.ts`

**Purpose**: Direct interface to BitStudio API via Supabase Functions

**Architecture Pattern**:
```
Frontend Component → useBitStudio Hook → BitStudioClient → Supabase Functions → BitStudio API
```

**Key Methods**:
- `uploadImage(file, type)` - Handles FormData upload to `/bitstudio-upload` function
- `virtualTryOn(params)` - Calls `/bitstudio-tryon` function
- `getImage(id)` - Status polling via `/bitstudio-status/{id}` function
- `pollUntilComplete(id)` - Intelligent polling with exponential backoff

**Authentication**: Uses Supabase session tokens for secure API access

#### Type Definitions
**Location**: `src/lib/bitstudio-types.ts`

**Key Types**:
```typescript
export interface BitStudioImage {
  id: string;
  type: string;
  path?: string;
  status: BitStudioStatus;
  versions?: any[];
  credits_used?: number;
  error?: string;
  video_path?: string;
}

export const BITSTUDIO_IMAGE_TYPES = {
  PERSON: 'virtual-try-on-person',
  OUTFIT: 'virtual-try-on-outfit',
  // ... other types
} as const;
```

### 4. Backend Integration (Supabase Functions)

**Note**: As of the working commit, the edge functions are **not present** in the repository. The system uses environment variable URLs to call external BitStudio API endpoints directly.

#### Expected Function Endpoints:
- `/bitstudio-upload` - File upload handling
- `/bitstudio-tryon` - Virtual try-on initiation
- `/bitstudio-status/{id}` - Status polling
- `/bitstudio-health` - API health check

#### Authentication Flow:
1. Frontend gets Supabase session token
2. Passes token in Authorization header to functions
3. Functions validate token and make authenticated BitStudio API calls
4. Results passed back through the chain

### 5. Data Flow

#### Upload Flow:
```
1. User selects file in AiStudioModal
2. File validation (size, type, HEIC detection)
3. useBitStudio.uploadImage() called
4. BitStudioClient.uploadImage() creates FormData
5. Direct fetch to /bitstudio-upload with session token
6. Function uploads to BitStudio API
7. Image ID returned and stored in component state
8. Success toast shown to user
```

#### Virtual Try-On Flow:
```
1. User clicks "Generate Try-On" with both images uploaded
2. Credit limit validation (4 for free, 20 for premium)
3. useBitStudio.virtualTryOn() called with parameters
4. BitStudioClient.virtualTryOn() initiates job
5. BitStudioClient.pollUntilComplete() monitors status
6. Exponential backoff polling with error handling
7. Completed result returned with image URL
8. useAiAssets.saveAsset() stores result to database
9. Result displayed in ResultsPanel
```

#### Asset Management Flow:
```
1. useAiAssets hook loads user's previous results on modal open
2. Results displayed in gallery with thumbnails
3. User can select, view full-size, or delete assets
4. All operations scoped to authenticated user
5. Automatic cleanup and session management
```

### 6. User Experience Features

#### Generation Limits:
- **Free Users**: 4 lifetime generations
- **Premium Users**: 20 daily generations
- Limits enforced in frontend with backend validation

#### File Handling:
- 10MB size limit with validation
- HEIC/HEIF detection and user education
- Drag & drop interface with visual feedback
- Preview thumbnails for uploaded files

#### Error Recovery:
- Automatic retry for network issues
- Session refresh for auth errors
- User-friendly error messages with action buttons
- Graceful degradation for API failures

#### Mobile Optimization:
- Responsive layouts for mobile/desktop
- Touch-friendly upload areas
- Long-press gestures for image viewing
- Optimized thumbnail grids

### 7. Integration Points

#### Product Try-On Integration:
- Uses same BitStudio infrastructure
- Loads outfit images from `product_outfit_assets` table
- Product-specific asset filtering
- Seamless transition to product purchase

#### Subscription Integration:
- `useSubscription` hook provides premium status
- Dynamic generation limits based on subscription
- Upgrade prompts integrated into error handling
- Payment intent creation for upgrades

#### Authentication Integration:
- Full integration with Supabase Auth
- Session management and refresh
- User-scoped data access
- Secure token passing to functions

### 8. Configuration

#### Environment Variables:
```typescript
// In BitStudioClient - used for direct function calls
const uploadUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bitstudio-upload`;
```

#### Required Secrets (Function Level):
- `BITSTUDIO_API_KEY` - BitStudio API authentication
- Additional BitStudio configuration as needed

### 9. Error Handling Strategy

#### Comprehensive Error Mapping:
- `upgrade_required` → Upgrade prompts with pricing links
- `insufficient_credits` → Credit purchase flows
- `RATE_LIMITED` → Automatic retry with backoff
- `MISSING_API_KEY` → Admin configuration guidance
- `bad_request` → User input validation feedback

#### Retry Logic:
- Network errors: 3 attempts with exponential backoff
- Auth errors: Session refresh then retry
- Rate limiting: Intelligent backoff timing
- Status polling: Up to 3 minutes with increasing intervals

### 10. Performance Optimizations

#### Efficient Polling:
- Exponential backoff (2s, 3s, 4.5s, 6.75s, max 10s)
- Jitter to prevent thundering herd
- Maximum 3-minute timeout
- Early termination on completion

#### Asset Management:
- Debounced user detection
- Request deduplication
- Lazy loading of thumbnails
- Efficient database queries (limit 50, ordered by date)

#### Memory Management:
- Proper cleanup of object URLs
- Component state reset on modal close
- Garbage collection of temporary files

## Key Success Factors

1. **Separation of Concerns**: Clear separation between UI, business logic, and API communication
2. **Error Resilience**: Comprehensive error handling with user-friendly messaging
3. **Performance**: Efficient polling and data management
4. **User Experience**: Responsive design with clear feedback
5. **Security**: Token-based authentication with user-scoped data
6. **Scalability**: Modular architecture allowing easy feature addition

## Debugging & Monitoring

### Client-Side Logging:
```typescript
console.log('[BitStudioClient] Starting upload:', { fileName: file.name, type, fileSize: file.size });
console.log('[useAiAssets] Fetching assets for user:', debouncedUser.id);
```

### Error Tracking:
- Detailed error objects with codes and context
- User action tracking for error resolution
- Network timing and retry metrics

### User Feedback:
- Toast notifications for all major operations
- Loading states for async operations
- Progress indicators for long-running tasks

## Future Considerations

1. **Edge Function Migration**: Consider moving to Supabase Edge Functions for better integration
2. **Caching Strategy**: Implement result caching for improved performance
3. **Batch Operations**: Support multiple image processing
4. **Advanced Features**: Add more BitStudio capabilities (inpainting, editing)
5. **Analytics**: Track usage patterns and error rates
6. **Optimization**: Reduce bundle size and improve loading times

---

**This architecture has been tested and confirmed working as of commit `12b3b80`. Any future modifications should maintain this level of error handling, user experience, and architectural separation.**
