

# Fix: Update Model Validator to Match 50MB Upload Limit

## Problem
`src/ar/utils/modelValidator.ts` still treats files over 25MB as errors (line 44) and over 10MB as warnings (line 48). The upload limit was raised to 50MB but the validator wasn't updated to match.

## Changes (single file)

**`src/ar/utils/modelValidator.ts`** — Update thresholds:
- Error threshold: 25MB → 50MB
- Warning threshold: 10MB → 25MB
- Update error/warning message text accordingly

