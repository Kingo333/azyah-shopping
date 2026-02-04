

# AI Studio Improvements: True Background Loading, Glass UI, & Expired Asset Filtering

## Summary

This plan addresses three specific issues:

1. **True background loading** - Loading continues in the background even when modal is closed, not just "resume" from where it left off
2. **Glass UI design** - Apply the dark glassmorphism design from Explore page to AI Studio
3. **Remove 0hr expired assets** - Filter out assets with 0 hours left from Previous Results (not just show red indicator)

---

## Issue 1: True Background Loading (Not Resume)

### Current Problem
The current implementation stores the job start time in localStorage and "resumes" polling when the modal reopens. But the user wants:
- Loading to **actually continue in the background** via `useTryOnJobMonitor` (which already exists in App.tsx)
- When modal reopens, show the **true elapsed time** from the original start
- The timer should never "restart"

### Current Flow
1. User starts video generation
2. Job ID saved to localStorage with `startedAt`
3. Modal closes → polling stops
4. Modal reopens → polling resumes but shows "resuming..." message

### Desired Flow  
1. User starts video generation
2. Job ID registered with `useTryOnJobMonitor` (global background monitor)
3. Modal closes → background monitor continues polling via database checks
4. User is notified when complete (toast appears anywhere in app)
5. Modal reopens → shows true elapsed time since original start

### Implementation

**File: `src/components/AiStudioModal.tsx`**

1. Import and use `useTryOnJobMonitor`:
```typescript
import { useTryOnJobMonitor } from '@/hooks/useTryOnJobMonitor';

// Inside component:
const { registerJob } = useTryOnJobMonitor();
```

2. When video generation starts (line ~400), register the job for background monitoring:
```typescript
if (result.ok && result.job_id) {
  setVideoJobId(result.job_id);
  saveVideoJob(result.job_id); // For persistence
  registerJob(result.job_id);  // NEW: Register for background monitoring
  await refetchCredits();
  // ...
}
```

3. Update the resume logic (lines 112-142) to show true elapsed time without "resuming" message:
```typescript
useEffect(() => {
  if (open && !videoPolling && !hasResumedVideoPolling.current) {
    const activeJob = getActiveVideoJob();
    if (activeJob) {
      hasResumedVideoPolling.current = true;
      setVideoJobId(activeJob.jobId);
      
      // Calculate true elapsed time from original start
      const elapsed = getElapsedSeconds(activeJob);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      setVideoStatus(`Processing... ${mins}:${secs.toString().padStart(2, '0')} (typically 2-5 min)`);
      
      // Continue polling
      pollVideoUntilComplete(
        activeJob.jobId,
        (checkResult) => {
          if (checkResult.result_url) {
            setVideoResult(checkResult.result_url);
            setVideoStatus('');
            clearVideoJob();
            fetchAssets();
          }
        },
        (status) => setVideoStatus(status)
      );
    }
  }
  // ...
}, [open, videoPolling, pollVideoUntilComplete, fetchAssets]);
```

4. Update the progress callback in `pollVideoUntilComplete` to use the persisted start time:
```typescript
// In useTheNewBlack.ts - Update poll progress to use persisted startTime
onProgress?.(`Processing... ${formatElapsedTime(getElapsedSeconds(activeJob))} (typically 2-5 min)`);
```

**File: `src/hooks/useTryOnJobMonitor.ts`**

Update to also call the edge function to check video status (not just database):
```typescript
// For video jobs, also check via edge function for accurate status
const { data: checkResult } = await supabase.functions.invoke('thenewblack-video', {
  body: { action: 'check', job_id: jobId }
});

if (checkResult?.ok && checkResult?.status === 'completed') {
  toast({
    title: 'Video Ready!',
    description: 'Your fashion video has been generated.',
  });
  // Remove from pending
  const updated = pending.filter((id: string) => id !== jobId);
  localStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(updated));
}
```

---

## Issue 2: Glass UI Design for AI Studio

### Inspiration from Explore Page
The Explore page uses:
- Dark background: `bg-gray-900`
- Glassmorphism: `bg-white/10`, `bg-black/60`, `backdrop-blur`
- White text with opacity: `text-white`, `text-white/60`
- Rounded pill buttons: `rounded-full bg-white/10 hover:bg-white/20`
- Gradient overlays: `bg-gradient-to-b from-black/60 to-transparent`

### Changes to AiStudioModal.tsx

1. **Main container** - Apply dark glass background:
```typescript
<motion.div
  className="relative w-full sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[92vh]
             rounded-t-3xl sm:rounded-3xl 
             bg-gray-900/95 backdrop-blur-xl  // NEW: Dark glass
             shadow-2xl border border-white/10
             flex flex-col"
>
```

2. **Header** - Dark glass header:
```typescript
<div className="flex items-center justify-between px-4 py-3 border-b border-white/10 
                bg-gradient-to-b from-black/40 to-transparent sticky top-0 z-10 rounded-t-3xl">
  <div className="min-w-0 flex-1">
    <div className="flex items-center gap-2">
      <Shirt className="h-5 w-5 text-primary" />
      <h2 className="text-lg font-semibold text-white">AI Studio</h2>
    </div>
    <p className="text-xs text-white/60 mt-0.5">Virtual try-on & video</p>
  </div>
  <button className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
    <XMarkIcon className="h-5 w-5 text-white" />
  </button>
</div>
```

3. **Tabs** - Glass pill tabs:
```typescript
<TabsList className="w-full bg-white/10 border border-white/10 p-1 rounded-full grid grid-cols-2 gap-1">
  <TabsTrigger 
    value="picture" 
    className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-primary rounded-full"
  >
    <Image className="h-4 w-4 mr-1" />
    Picture
  </TabsTrigger>
  <TabsTrigger 
    value="video" 
    className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-primary rounded-full"
  >
    <Video className="h-4 w-4 mr-1" />
    Video
  </TabsTrigger>
</TabsList>
```

4. **Credits display** - Light text on dark:
```typescript
<div className="flex justify-center gap-4 mt-3 text-xs text-white/60">
  <span>Picture: <strong className="text-white">{pictureCredits}/{maxPictureCredits}</strong></span>
  <span>Video: <strong className="text-white">{videoCredits}/{maxVideoCredits}</strong></span>
</div>
```

5. **Upload cards** - Glass cards:
```typescript
// Update UploadCard component:
<motion.label 
  className={`group relative flex flex-col items-center justify-center gap-2
    h-32 rounded-xl border transition-all cursor-pointer overflow-hidden
    ${hasUrl 
      ? 'border-primary/50 bg-primary/10' 
      : 'border-dashed border-white/20 bg-white/5 hover:border-primary/50 hover:bg-white/10'
    }`}
>
```

6. **Section containers** - Glass panels:
```typescript
<div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
```

7. **Action bar** - Dark glass footer:
```typescript
<div className="flex-shrink-0 p-3 border-t border-white/10 bg-black/20">
```

8. **Text colors throughout** - Update from dark to light:
- `text-foreground` → `text-white`
- `text-muted-foreground` → `text-white/60`
- `bg-card` → `bg-white/5`
- `border-border` → `border-white/10`

---

## Issue 3: Remove 0hr Expired Assets from Previous Results

### Current Behavior
Assets with 0 hours left show a red indicator but still appear in the list.

### Desired Behavior
Assets with 0 hours left should be filtered out of the UI entirely (they'll be deleted by the cron job anyway).

### Implementation

**File: `src/components/AiStudioModal.tsx`**

1. Add helper function to check if asset is expired:
```typescript
const isAssetExpired = (createdAt: string, expiryHours = 48): boolean => {
  const created = new Date(createdAt);
  const expiresAt = new Date(created.getTime() + expiryHours * 60 * 60 * 1000);
  return Date.now() >= expiresAt.getTime();
};
```

2. Filter out expired assets when displaying:
```typescript
// Filter assets by type AND remove expired ones
const pictureAssets = assets
  .filter(a => a.asset_type !== 'tryon_video')
  .filter(a => !isAssetExpired(a.created_at));

const videoAssets = assets
  .filter(a => a.asset_type === 'tryon_video')
  .filter(a => !isAssetExpired(a.created_at));
```

This ensures:
- Assets with 0 hours remaining are not shown
- The cron job will delete them from the database on its next run
- Users don't see broken/expired thumbnails

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AiStudioModal.tsx` | Glass UI styling, background job registration, expired asset filtering |
| `src/hooks/useTryOnJobMonitor.ts` | Add video check via edge function for accurate status |

---

## Technical Implementation Details

### Glass UI Color Reference (from Explore page)

| Element | Current Class | New Class |
|---------|--------------|-----------|
| Background | `bg-background` | `bg-gray-900/95 backdrop-blur-xl` |
| Header | `bg-card` | `bg-gradient-to-b from-black/40 to-transparent` |
| Text primary | `text-foreground` | `text-white` |
| Text secondary | `text-muted-foreground` | `text-white/60` |
| Border | `border-border` | `border-white/10` |
| Card | `bg-card` | `bg-white/5` |
| Button ghost | `hover:bg-muted` | `bg-white/10 hover:bg-white/20` |
| Tab list | default | `bg-white/10 rounded-full` |

### Expired Asset Check Function

```typescript
/**
 * Check if an asset has expired (48 hours from creation)
 */
const isAssetExpired = (createdAt: string, expiryHours = 48): boolean => {
  const created = new Date(createdAt);
  const expiresAt = new Date(created.getTime() + expiryHours * 60 * 60 * 1000);
  return Date.now() >= expiresAt.getTime();
};
```

### Background Monitor Enhancement

```typescript
// Enhanced check in useTryOnJobMonitor
for (const jobId of pending) {
  // First try database
  const { data } = await supabase
    .from('ai_tryon_jobs')
    .select('status, result_url')
    .eq('id', jobId)
    .single();

  // If not in database or still processing, check via edge function
  if (!data || data.status === 'processing') {
    try {
      const { data: checkResult } = await supabase.functions.invoke('thenewblack-video', {
        body: { action: 'check', job_id: jobId }
      });
      
      if (checkResult?.ok && checkResult?.status === 'completed') {
        toast({
          title: 'Video Ready!',
          description: 'Your fashion video has been generated.',
        });
        // Remove from pending
        const updated = pending.filter((id: string) => id !== jobId);
        localStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(updated));
      }
    } catch (err) {
      console.log('[useTryOnJobMonitor] Edge function check failed:', err);
    }
  }
}
```

---

## Testing Checklist

### Background Loading
- [ ] Start video generation
- [ ] Close modal
- [ ] Wait 30+ seconds
- [ ] Receive toast notification when video completes
- [ ] Reopen modal - see completed video or correct elapsed time

### Glass UI
- [ ] Modal has dark glass background
- [ ] Header has gradient overlay
- [ ] Tabs are pill-shaped with glass styling
- [ ] Upload cards have glass effect
- [ ] Text is white/semi-transparent appropriately
- [ ] All interactive elements have hover states

### Expired Assets
- [ ] Assets older than 48 hours are not shown
- [ ] Assets with 0 hours left are filtered out
- [ ] Expiry indicator still shows correctly for visible assets

### Photo Try-On (Must Not Break)
- [ ] Picture generation still works
- [ ] Picture results appear in Previous Results
- [ ] Credits are deducted correctly
- [ ] Download works
- [ ] "Make Video" button works

