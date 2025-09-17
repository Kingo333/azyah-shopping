# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/fdc5efa8-4b59-4f52-b897-9383ae6220cb

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/fdc5efa8-4b59-4f52-b897-9383ae6220cb) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Backend & Authentication)
- BitStudio API (AI Virtual Try-On)

## BitStudio API Integration

This project integrates with BitStudio's AI-powered virtual try-on technology to enable users to see how clothing items look on them.

### Setup Requirements

1. **BitStudio API Key**: You need a BitStudio API key from [bitstudio.ai](https://bitstudio.ai/studio/api-keys)
2. **Supabase Configuration**: The API key must be stored as a secret in Supabase

### Edge Functions

The integration uses the following Supabase Edge Functions:

- `bitstudio-upload`: Handles image uploads to BitStudio API
- `bitstudio-tryon`: Processes virtual try-on requests
- `bitstudio-status`: Checks the status of BitStudio operations
- `bitstudio-health`: Health check for BitStudio API connection

### API Endpoints

The BitStudio integration uses these endpoints:
- `https://api.bitstudio.ai/images/upload` - Upload images
- `https://api.bitstudio.ai/images/virtual-try-on` - Virtual try-on processing
- `https://api.bitstudio.ai/images/{id}` - Get image status

### Features

- **Virtual Try-On**: Users can upload their photo and see how products look on them
- **AI Studio**: Advanced try-on capabilities with person and outfit image uploads
- **Real-time Processing**: Async processing with status polling
- **Credit System**: Integration with BitStudio's credit-based pricing

### Configuration

Make sure to configure the `BITSTUDIO_API_KEY` secret in your Supabase project's Edge Functions settings.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/fdc5efa8-4b59-4f52-b897-9383ae6220cb) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
