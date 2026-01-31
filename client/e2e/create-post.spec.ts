import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Note: These tests require authentication.
// Run: npx playwright codegen --save-storage=e2e/auth.json https://eidola.io
// Then login to save your session.

test.describe('Create Post Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to create page
    await page.goto('/create')
  })

  test('Upload Step - UI Elements', async ({ page }) => {
    // Verify heading
    await expect(page.getByRole('heading', { name: 'What did you spot?' })).toBeVisible()

    // Verify Camera button with icon
    const cameraButton = page.getByRole('button', { name: /camera/i })
    await expect(cameraButton).toBeVisible()
    // Verify Camera icon (svg inside button)
    await expect(cameraButton.locator('svg')).toBeVisible()

    // Verify Gallery button with icon
    const galleryButton = page.getByRole('button', { name: /gallery/i })
    await expect(galleryButton).toBeVisible()
    // Verify Upload icon (svg inside button)
    await expect(galleryButton.locator('svg')).toBeVisible()

    // Verify close (X) button in top-left area
    const closeButton = page.locator('button').filter({ has: page.locator('svg') }).first()
    await expect(closeButton).toBeVisible()
  })

  test('Image Upload via Gallery', async ({ page }) => {
    // Set up file chooser handler before clicking
    const fileChooserPromise = page.waitForEvent('filechooser')

    // Click Gallery button
    await page.getByRole('button', { name: /gallery/i }).click()

    // Handle file chooser
    const fileChooser = await fileChooserPromise
    const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
    await fileChooser.setFiles(testImagePath)

    // Verify transitions to position step - ImagePositioner should appear
    // The position step has Done and Cancel buttons
    // Done button is a checkmark icon in the top right
await expect(page.locator('button:has(svg.lucide-check)')).toBeVisible({ timeout: 5000 })
    // Cancel button is an X icon in the top left
await expect(page.locator('button:has(svg.lucide-x)')).toBeVisible()
  })

  test('Position Step - Image Display and Controls', async ({ page }) => {
    // Upload image first
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /gallery/i }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'test-image.jpg'))

    // Verify we're in position step
    // Done button is a checkmark icon in the top right
await expect(page.locator('button:has(svg.lucide-check)')).toBeVisible({ timeout: 5000 })
    // Cancel button is an X icon in the top left
await expect(page.locator('button:has(svg.lucide-x)')).toBeVisible()

    // Verify image is displayed (the uploaded image has alt="Position your image")
    const image = page.getByRole('img', { name: 'Position your image' })
    await expect(image).toBeVisible()

    // Click Done to proceed to draw step
    await page.locator('button:has(svg.lucide-check)').click()

    // Verify we're now in draw step - look for "Draw what you see" heading
    await expect(page.getByText('Draw what you see')).toBeVisible({ timeout: 5000 })
  })

  test('Draw Step - Canvas and Controls', async ({ page }) => {
    // Upload image and proceed to draw step
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /gallery/i }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'test-image.jpg'))

    await page.locator('button:has(svg.lucide-check)').click({ timeout: 5000 })

    // Verify draw step UI
    await expect(page.getByText('Draw what you see')).toBeVisible({ timeout: 5000 })

    // Verify canvas is present (FabricCanvas renders a canvas element)
    const canvas = page.locator('canvas')
    await expect(canvas.first()).toBeVisible()

    // Verify Next button to proceed to details
    const nextButton = page.getByRole('button', { name: /next/i })
    await expect(nextButton).toBeVisible()

    // Click Next to proceed to details
    await nextButton.click()

    // Verify we're now in details step
    await expect(page.getByText('Post Details')).toBeVisible({ timeout: 5000 })
  })

  test('Details Step - Post Type Selection', async ({ page }) => {
    // Upload image and proceed to details step
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /gallery/i }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'test-image.jpg'))

    await page.locator('button:has(svg.lucide-check)').click({ timeout: 5000 })
    await page.getByRole('button', { name: /next/i }).click({ timeout: 5000 })

    // Verify Post Details heading
    await expect(page.getByText('Post Details')).toBeVisible({ timeout: 5000 })

    // Verify Post Type label
    await expect(page.getByText('Post Type')).toBeVisible()

    // Verify Persistent button (has MapPin icon and "Persistent" text)
    const persistentButton = page.getByRole('button', { name: /persistent/i })
    await expect(persistentButton).toBeVisible()
    // Persistent should be selected by default (has teal background)
    await expect(persistentButton).toHaveClass(/bg-eidola-teal/)

    // Verify Temporary button (has Clock icon)
    const temporaryButton = page.getByRole('button', { name: /temporary/i })
    await expect(temporaryButton).toBeVisible()

    // Verify Challenge button (has Trophy icon)
    const challengeButton = page.getByRole('button', { name: /challenge/i })
    await expect(challengeButton).toBeVisible()

    // Test clicking Temporary - should show selection and expiration options
    await temporaryButton.click()
    await expect(temporaryButton).toHaveClass(/bg-eidola-orange/)
    await expect(page.getByText('Expires in')).toBeVisible()

    // Test clicking Challenge - should show challenge settings
    await challengeButton.click()
    await expect(challengeButton).toHaveClass(/bg-eidola-magenta/)
    await expect(page.getByText('Challenge Settings')).toBeVisible()

    // Click back to Persistent
    await persistentButton.click()
    await expect(persistentButton).toHaveClass(/bg-eidola-teal/)
  })

  test('Location Picker - Opens for Persistent Posts', async ({ page }) => {
    // Upload image and proceed to details step
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /gallery/i }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'test-image.jpg'))

    await page.locator('button:has(svg.lucide-check)').click({ timeout: 5000 })
    await page.getByRole('button', { name: /next/i }).click({ timeout: 5000 })

    // Verify we're in details step with Persistent selected by default
    await expect(page.getByText('Post Details')).toBeVisible({ timeout: 5000 })

    // Click "Add Location" button
    const addLocationButton = page.getByRole('button', { name: /add location/i })
    await expect(addLocationButton).toBeVisible()
    await addLocationButton.click()

    // Verify LocationPicker opens - it should show a map (Leaflet renders a div with map)
    // LocationPicker has "Pick Location" or similar heading
    // The map container should have leaflet classes
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 })
  })

  test('Full Flow - Upload to Details', async ({ page }) => {
    // This test verifies the complete flow from upload to details
    // without actually submitting (to avoid creating test posts)

    // Step 1: Upload
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /gallery/i }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'test-image.jpg'))

    // Step 2: Position
    // Done button is a checkmark icon in the top right
await expect(page.locator('button:has(svg.lucide-check)')).toBeVisible({ timeout: 5000 })
    await page.locator('button:has(svg.lucide-check)').click()

    // Step 3: Draw
    await expect(page.getByText('Draw what you see')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: /next/i }).click()

    // Step 4: Details
    await expect(page.getByText('Post Details')).toBeVisible({ timeout: 5000 })

    // Verify all main elements are present
    await expect(page.getByText('What do you see?')).toBeVisible()
    await expect(page.getByPlaceholder(/i see a face/i)).toBeVisible()
    await expect(page.getByText('Post Type')).toBeVisible()
    await expect(page.getByRole('button', { name: /share/i })).toBeVisible()

    // Verify Tags section (use exact match to avoid matching "tags selected" text)
    await expect(page.getByText('Tags', { exact: true })).toBeVisible()

    // Verify NSFW toggle
    await expect(page.getByText('Mark as 18+')).toBeVisible()
  })
})
