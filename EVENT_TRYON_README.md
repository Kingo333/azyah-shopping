# Event Try-On Feature Documentation

## 🏗️ System Architecture

The Event Try-On system allows users to virtually try on products from retail events using BitStudio AI.

### Components:
- **Frontend**: `Events.tsx`, `EventTryOnModal.tsx`
- **Backend**: `bitstudio-tryon`, `bitstudio-poll-job` edge functions
- **Database**: `event_tryon_jobs`, `event_user_photos`, `event_brand_products`
- **Storage**: `event-user-photos`, `event-tryon-results` buckets
- **External API**: BitStudio AI

---

## 🔄 Complete Workflow

### Phase 1: User Photo Upload
1. User selects image file (drag-drop or file input)
2. File validation: image type, under 10MB
3. Upload to `event-user-photos` bucket: `{eventId}/{userId}/{filename}`
4. Upload to BitStudio with type `'virtual-try-on-person'` → returns `bitstudio_image_id`
5. Store in `event_user_photos` table

### Phase 2: Product Try-On Initiation
1. User clicks "Try On" on a product
2. Validate `personImageId` and outfit data exist
3. Call `runTryOn()` → creates record in `event_tryon_jobs` with status `'queued'`

### Phase 3: BitStudio API Call
1. Edge function loads job data and user/product info
2. Verifies owner (`auth.uid() === job.user_id`)
3. Calls BitStudio API with person + outfit image IDs
4. Updates job with `provider_job_id` and status `'processing'`

### Phase 4: Job Polling & Completion
1. Frontend polls every 2s (modal) and 5s (background)
2. Edge function checks BitStudio job status
3. When `'completed'`: downloads image, uploads to `event-tryon-results` bucket
4. Updates job: `status = 'succeeded'`, `output_path = {path}`

### Phase 5: Results Display
1. Fetch all jobs for event + user, grouped by product
2. Display succeeded results with delete option
3. Real-time subscription updates UI instantly

---

## 🗄️ Database Schema

### `event_tryon_jobs`
```sql
- id: UUID (primary key)
- event_id, user_id, product_id: UUID references
- input_person_path, input_outfit_path: TEXT
- provider: TEXT (default 'bitstudio')
- provider_job_id, provider_status, provider_raw: Provider tracking
- status: 'queued' | 'processing' | 'succeeded' | 'failed'
- output_path: TEXT (Supabase Storage path)
- error: TEXT
- created_at, completed_at: TIMESTAMPTZ
```

### `event_user_photos`
```sql
- id: UUID (primary key)
- event_id, user_id: UUID (unique together)
- photo_url: TEXT (Supabase Storage path)
- bitstudio_image_id: TEXT (BitStudio's ID)
- vto_provider, vto_ready, vto_features: Try-on metadata
```

### `event_brand_products`
```sql
- id: UUID (primary key)
- event_brand_id: UUID reference
- image_url: TEXT
- try_on_provider: TEXT
- try_on_data, try_on_config: JSONB (outfit references)
```

---

## 📦 Storage Buckets

### `event-user-photos`
- Path: `{eventId}/{userId}/{filename}`
- Public: No (RLS protected)
- Max size: 10MB

### `event-tryon-results`
- Path: `event_tryon_results/{eventId}/{userId}/{productId}.jpg`
- Public: Yes (via signed URLs)
- Upsert: Yes (overwrites previous)

---

## 🔐 Security

- Owner checks: All edge functions verify `auth.uid() === job.user_id`
- RLS policies: Users only access their own jobs/photos
- File validation: Type and size limits
- Idempotency: BitStudio API calls use `Idempotency-Key` header

---

## 🎯 Key Design Decisions

1. **Dual polling**: Modal (2s) for active waiting, background (5s) for passive completion
2. **Storage redundancy**: Store both Supabase path and BitStudio ID for flexibility
3. **Exponential backoff**: 2s → 3s → 4.5s → 6s max to reduce API load
4. **Notification debouncing**: 10-second window prevents duplicate toasts

---

## 🧪 Testing Checklist

- [ ] Upload photo → verify storage and database
- [ ] Try on product → verify job creation
- [ ] Wait for completion → verify single notification
- [ ] Close modal → verify background polling
- [ ] Multiple try-ons → verify each shows one notification
- [ ] Delete result → verify storage and database cleanup
- [ ] Real-time updates → verify instant UI refresh

---

## 🔧 Recovery Procedures

**Job stuck in 'processing':**
1. Check `provider_job_id` in database
2. Manually poll: `GET https://api.bitstudio.ai/images/{provider_job_id}`
3. Run `bitstudio-poll-job` edge function manually

**Notification spam:**
1. Clear sessionStorage: `sessionStorage.removeItem('tryon_notified_jobs')`

**Image doesn't display:**
1. Verify `output_path` in database
2. Check file exists in bucket
3. Verify RLS policies

---

## 📝 Future Recreation Guide

1. Create database tables with RLS policies
2. Create storage buckets with proper permissions
3. Implement edge functions with BitStudio API integration
4. Build frontend components with polling + real-time subscriptions
5. Add notification debouncing utility
6. Implement delete functionality for results
