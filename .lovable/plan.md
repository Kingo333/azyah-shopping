
# Fix: Video Try-On Duplicate Saves, Notifications, and Loading Bar Issues

## Summary

There are 4 distinct bugs to fix in the video try-on flow:

1. **Triple saves** - Video result saved 3 times to Previous Videos
2. **Duplicate notifications** - Completion toast appears twice  
3. **Loading bar restarts** - Progress resets when modal closes/reopens instead of continuing from stored start time
4. **Two loading bars** - Duplicate progress indicators showing at the same time

---

## Root Cause Analysis

### 1. Triple Saves Issue

**Problem**: The edge function saves to `ai_assets` table when checking status. BUT both of these are calling the check endpoint:
- `pollVideoUntilComplete` (in modal) calls check every 5 seconds
- `useTryOnJobMonitor` (background) calls check every 30 seconds

If both are running when the video completes, the edge function could be called multiple times before the job is removed from pending lists. The edge function INSERTS a new row each time without checking if one already exists.

**Fix**: Add `ON CONFLICT DO NOTHING` or check if asset exists before inserting in edge function.

### 2. Duplicate Notifications Issue

**Problem**: Two separate notification sources:
- `useTheNewBlack.ts` line 349-352: Toast in `pollVideoUntilComplete`
- `useTryOnJobMonitor.ts` line 69-72: Toast in background check

Both fire when video completes.

**Fix**: Remove the toast from `useTryOnJobMonitor` for video jobs since the modal's polling already handles it. The background monitor should only notify if the modal is NOT open (user navigated away).

### 3. Loading Bar Restart Issue

**Problem**: In `AiStudioModal.tsx` line 912-921, the `AnimatedProgress` component always starts fresh:
```tsx
<AnimatedProgress isActive={true} duration={90} label="Creating Video" />
```

It doesn't use the persisted `startedAt` timestamp to calculate how far along it should be.

**Fix**: Calculate the initial progress based on `getElapsedSeconds()` from the persisted job and pass it to the progress component.

### 4. Two Loading Bars Issue

**Problem**: There are TWO places rendering `AnimatedProgress` when `videoPolling` is true:
- Line 912-921: Inside the video section content area
- Line 1058-1061: Inside the sticky action bar button

Both show simultaneously creating duplicate loading bars.

**Fix**: Remove the loading bar from the main content area. Keep only the one in the action bar button (consistent with picture try-on behavior).

---

## Implementation Plan

### File 1: `src/components/AiStudioModal.tsx`

**Change A**: Remove duplicate loading bar from video section (line 912-921)

Replace the entire "Processing status" block with just the text message (no loading bar):
```tsx
{/* Processing status */}
{videoPolling && (
  <div className="text-center py-4 px-4">
    <p className="text-sm text-muted-foreground">{videoStatus || 'Generating video...'}</p>
    <p className="text-xs text-muted-foreground/70 mt-2">
      You can close this modal — we'll notify you when it's ready!
    </p>
  </div>
)}
```

**Change B**: Pass initial progress to action bar loading (line 1058-1061)

When resuming a job, calculate the elapsed time and pass it:
```tsx
{videoPolling ? (
  <div className="w-full px-4">
    <AnimatedProgress 
      isActive={true} 
      duration={90} 
      label="Creating Video"
      initialProgress={getVideoInitialProgress()} // New function
    />
  </div>
) : ...
```

**Change C**: Add helper function to calculate initial progress

```tsx
// Calculate initial progress for resumed video jobs
const getVideoInitialProgress = useCallback(() => {
  const activeJob = getActiveVideoJob();
  if (activeJob) {
    const elapsed = getElapsedSeconds(activeJob);
    // Progress as percentage (90 seconds = 100%)
    return Math.min((elapsed / 90) * 100, 95); // Cap at 95%
  }
  return 0;
}, []);
```

### File 2: `src/hooks/useTryOnJobMonitor.ts`

**Change**: Prevent duplicate notifications by checking if already notified

Add a check using sessionStorage to prevent duplicate toasts:
```tsx
// At top of file
const NOTIFIED_JOBS_KEY = 'notified_video_jobs';

const hasNotified = (jobId: string): boolean => {
  const notified = JSON.parse(sessionStorage.getItem(NOTIFIED_JOBS_KEY) || '[]');
  return notified.includes(jobId);
};

const markNotified = (jobId: string): void => {
  const notified = JSON.parse(sessionStorage.getItem(NOTIFIED_JOBS_KEY) || '[]');
  if (!notified.includes(jobId)) {
    notified.push(jobId);
    sessionStorage.setItem(NOTIFIED_JOBS_KEY, JSON.stringify(notified));
  }
};

// Then in the check logic, wrap toast with:
if (!hasNotified(jobId)) {
  toast({...});
  markNotified(jobId);
}
```

### File 3: `supabase/functions/thenewblack-video/index.ts`

**Change**: Prevent duplicate asset saves using upsert or check

Replace the INSERT with an upsert that uses job_id as the unique constraint:
```typescript
// Line 787-793 - Check if already saved before inserting
const { data: existing } = await serviceClient
  .from('ai_assets')
  .select('id')
  .eq('job_id', job_id)
  .eq('user_id', user.id)
  .maybeSingle();

if (!existing) {
  const { error: assetError } = await serviceClient.from('ai_assets').insert({
    user_id: user.id,
    job_id: job_id,
    asset_url: publicUrl.publicUrl,
    asset_type: 'tryon_video',
    title: `AI Video ${new Date().toLocaleDateString()}`
  });

  if (assetError) {
    console.error('[TheNewBlack Video] Failed to save asset:', assetError);
  }
} else {
  console.log('[TheNewBlack Video] Asset already exists for job:', job_id);
}
```

### File 4: `src/components/ui/animated-progress.tsx`

**Change**: Accept `initialProgress` prop

```tsx
interface AnimatedProgressProps {
  isActive: boolean;
  duration: number;
  label?: string;
  initialProgress?: number; // New prop
}

// In component, use initialProgress as starting value
const [progress, setProgress] = useState(initialProgress || 0);
```

---

## Summary of Changes

| File | Change | Purpose |
|------|--------|---------|
| `AiStudioModal.tsx` | Remove duplicate loading bar | Fix 2 loading bars issue |
| `AiStudioModal.tsx` | Pass initial progress | Fix loading restart issue |
| `useTryOnJobMonitor.ts` | Deduplicate notifications | Fix duplicate toast issue |
| `thenewblack-video/index.ts` | Check before insert | Fix triple save issue |
| `animated-progress.tsx` | Accept initialProgress prop | Support resuming progress |

---

## Testing Checklist

- [ ] Start video generation
- [ ] Verify only ONE loading bar appears
- [ ] Close modal, wait 30 seconds, reopen
- [ ] Verify loading bar continues from correct elapsed time (not restart)
- [ ] Wait for video completion
- [ ] Verify only ONE toast notification
- [ ] Check Previous Videos - verify only ONE copy of the video appears
- [ ] Photo try-on still works correctly
