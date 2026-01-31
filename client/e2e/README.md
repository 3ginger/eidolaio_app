# E2E Tests

End-to-end tests for Eidola using Playwright.

## Quick Start

```bash
cd /Users/germangurov/projects/pareidolia-app/client

# Setup auth (first time or when expired)
npm run test:e2e:setup-auth

# Run tests
npm run test:e2e
```

## Regenerating Auth

When tests fail with redirects to sign-in, regenerate auth:

```bash
npm run test:e2e:setup-auth
```

This launches a headed browser and waits for you to log in as e2e-test@eidola.io.
Auth typically expires after ~7 days.

### Verify auth is valid

```bash
grep '"__client_uat"' e2e/auth.json
# Should show a timestamp like "1769767182", NOT "0"
```

### Alternative: Manual auth setup

```bash
npx playwright codegen --save-storage=e2e/auth.json https://eidola.io
```

## Full Setup (First Time)

### 1. Install Dependencies

```bash
npm install
npx playwright install chromium
```

### 2. Test User (Already Created)

A test user `E2E Test` (e2e-test@eidola.io) exists in Clerk with `is_test_user = true` in the database.

### 3. Save Authentication State

```bash
npm run test:e2e:setup-auth
```

This opens a browser where you log in. Session saved to `auth.json` (gitignored).

### 4. Run Tests

```bash
npm run test:e2e          # Run all tests
npm run test:e2e:ui       # Interactive UI mode
npm run test:e2e:headed   # Visible browser
```

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run with browser visible
npm run test:e2e:headed
```

## Test Coverage

### create-post.spec.ts

Tests the Create Post flow at `/create`:

1. **Upload Step - UI Elements**: Verifies Camera/Gallery buttons and close button
2. **Image Upload via Gallery**: Tests file upload and transition to position step
3. **Position Step**: Tests image display, Done/Cancel buttons
4. **Draw Step**: Tests canvas presence and Next button
5. **Details Step - Post Type Selection**: Tests Persistent/Temporary/Challenge buttons
6. **Location Picker**: Tests that location picker opens for persistent posts
7. **Full Flow**: End-to-end from upload to details (no submission)

## Test User Filtering

Test users have `is_test_user = true` in the database. Their posts are automatically filtered from:
- Personalized feed (`/feed`)
- Explore feed (`/explore`)
- Map view (`/map`)
- All posts listing
- Challenges list
- Challenge leaderboards
- Photo chain entries
- Comments
- Admin stats

This allows tests to create real posts without polluting the live feed.

## Files

```
e2e/
├── auth.json           # Saved auth state (gitignored)
├── create-post.spec.ts # Create post flow tests
├── README.md           # This file
└── fixtures/
    └── test-image.jpg  # Test image for uploads
```
