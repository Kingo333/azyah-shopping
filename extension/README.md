# Azyah Browser Extension — Find Better Deals

A Chrome extension (MV3) that provides Phia-like visual shopping: find visually similar products at better prices while shopping online.

## Features

- **Automatic Product Detection**: Extracts product info from any product page using JSON-LD, OpenGraph, and DOM fallbacks
- **Visual Similarity Search**: Uses Google Lens to find visually similar products
- **Price Comparison**: Shows low/median/high prices across the web
- **Pattern-Aware Ranking**: Prioritizes pattern, color, and silhouette matching
- **Similar on Azyah**: Shows matching products from the Azyah catalog
- **Manual Image Selection**: Click any image to use it for the search

## Installation

### Load Unpacked (Development)

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `extension/` folder from this project

### Create Extension Icons

Before publishing, add icon files:
- `extension/icons/icon16.png` (16x16)
- `extension/icons/icon48.png` (48x48)
- `extension/icons/icon128.png` (128x128)

## Usage

1. Navigate to any product page (Amazon, ASOS, Zara, etc.)
2. Look for the floating "Find Deals" button (bottom right)
3. Click to open the side panel
4. The extension will show the detected product and search for deals

### Manual Extraction

If the button doesn't appear:
1. Click the extension icon in Chrome toolbar
2. Click "Extract from Current Page"
3. Or use "Select Image" to manually choose an image

## Authentication

The extension requires authentication with your Azyah account:

1. Sign in at [azyah-shopping.lovable.app](https://azyah-shopping.lovable.app)
2. Your session will be detected by the extension
3. If not detected, click "I've signed in" in the extension

## Files Structure

```
extension/
├── manifest.json           # Chrome MV3 manifest
├── service_worker.js       # Background script (API calls)
├── content_script.js       # Injected into pages
├── content_styles.css      # Content script styles
├── sidepanel.html          # Side panel UI
├── sidepanel.js            # Side panel logic
├── styles.css              # Side panel styles
├── lib/
│   └── extractor.js        # Product extraction logic
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## API Endpoints Used

- `POST /functions/v1/deals-from-context` — Main deals search
- `POST /functions/v1/deals-match-catalog` — Azyah catalog matching

## Backend Image Handling

When the extension sends an external image URL, the backend:
1. Downloads the image server-side (avoids CORS/hotlinking blocks)
2. Uploads to `deals-uploads` bucket
3. Generates a signed URL
4. Uses the signed URL for Google Lens search

## Rate Limits

- 10 requests per minute per user
- Results are cached for 30 minutes

## Troubleshooting

### "Sign In Required"
Make sure you're signed in to your Azyah account in a browser tab.

### No button appears
The button only appears on pages detected as product pages. Use manual extraction from the extension popup.

### "Image blocked" errors
Some sites block image hotlinking. The backend downloads images server-side to work around this. If issues persist, use the screenshot capture feature.

## Development

### Testing Locally

1. Make changes to extension files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test on a product page

### Debugging

- Content script: Open DevTools on any page, check Console
- Service worker: Go to `chrome://extensions/`, click "Service worker" link
- Side panel: Right-click in side panel → Inspect

## Safari Port (Future)

To port to Safari:
1. Convert to Safari Web Extension using Xcode
2. Adjust for Safari's side panel limitations
3. Submit to App Store
