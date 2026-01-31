import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('Publish Post Flow', () => {
  test('Create post, verify in profile, then delete', async ({ page }) => {
    // Step 1: Create post through UI
    await page.goto('/create')

    // Upload image
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /gallery/i }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'test-image.jpg'))

    // Position step - click checkmark
    await page.locator('button:has(svg.lucide-check)').click({ timeout: 5000 })

    // Draw step - skip
    await expect(page.getByText('Draw what you see')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: /next/i }).click()

    // Details step
    await expect(page.getByText('Post Details')).toBeVisible({ timeout: 5000 })

    // Use unique caption to identify test post
    const testCaption = `E2E Test ${Date.now()}`
    await page.getByPlaceholder(/i see a face/i).fill(testCaption)

    // Select Temporary (auto-expires as safety net)
    await page.getByRole('button', { name: /temporary/i }).click()

    // Intercept POST response to get created post ID
    const responsePromise = page.waitForResponse(
      r => r.url().includes('/api/posts') && r.request().method() === 'POST'
    )

    // Click Share
    await page.getByRole('button', { name: /share/i }).click()

    // Get post ID from response
    const response = await responsePromise
    const { id: postId } = await response.json()
    expect(postId).toBeTruthy()

    // Step 2: Verify redirect to post detail
    await expect(page).toHaveURL(new RegExp(`/post/${postId}`), { timeout: 10000 })
    await expect(page.getByText(testCaption)).toBeVisible()

    // Step 3: Verify post appears in own profile
    await page.goto('/profile')
    await expect(page.locator(`a[href="/post/${postId}"]`)).toBeVisible({ timeout: 5000 })

    // Step 4: Cleanup - delete via UI
    // Go to post detail and delete
    await page.goto(`/post/${postId}`)

    // Set up dialog handler before triggering the confirm
    page.on('dialog', dialog => dialog.accept())

    // Open the menu - it's in the sticky header, which is the first generic div after main
    // The header contains: back link, avatar+username, menu button
    // Target the button that's a sibling after the username area
    const header = page.locator('main > div > div').first()
    await header.locator('button').last().click()

    // Click Delete button in the dropdown menu
    await page.getByRole('button', { name: /delete/i }).click()

    // Wait for redirect after deletion (usually to feed)
    await page.waitForURL(/\/feed/, { timeout: 5000 })

    // Verify deleted from profile
    await page.goto('/profile')
    await expect(page.locator(`a[href="/post/${postId}"]`)).not.toBeVisible()
  })
})
