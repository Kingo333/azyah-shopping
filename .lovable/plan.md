## Plan: Update Live Cam Try-On Prompt

### Scope
Replace the existing `DEFAULT_TRYON_PROMPT` string in `src/components/ai-studio/live-cam/useLiveCamSession.ts` with the user-supplied prompt that emphasizes faithful garment preservation.

### New Prompt
```
Realistic virtual fashion try-on. Apply the exact clothing item from the reference image onto the person in the live camera frame. Preserve the person's face, body pose, body shape, background, skin tone, and lighting. Preserve the reference garment faithfully: same garment type, sleeve length, neckline, hem length, silhouette, color, fabric texture, print, logo, graphics, pattern placement, seams, buttons, and visible design details. Make the garment look naturally worn and fitted on the person, but do not redesign it. Do not shorten sleeves. Do not remove patterns or logos. Do not turn a designed garment into a plain garment. Do not invent a different item.
```

### Acceptance Criteria
- The `DEFAULT_TRYON_PROMPT` constant is replaced with the new text.
- No other code is modified.
- Build succeeds.