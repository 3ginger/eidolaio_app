import { chromium } from '@playwright/test'

/**
 * Interactive script to generate auth.json for e2e tests.
 * Launches a headed browser, navigates to eidola.io,
 * and waits for you to log in as the test user.
 *
 * Usage: npm run test:e2e:setup-auth
 */

const TEST_EMAIL = 'e2e-test@eidola.io'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || ''

async function setupAuth() {
  console.log('Launching browser for auth setup...')
  console.log('Test user:', TEST_EMAIL)

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Navigate to the app
    await page.goto('https://eidola.io')
    console.log('Navigated to eidola.io')

    // Wait for sign-in button or already logged in state
    await page.waitForLoadState('networkidle')

    // Check if already logged in (profile link present)
    const profileLink = page.locator('a[href="/profile"]')
    const isLoggedIn = await profileLink.isVisible({ timeout: 2000 }).catch(() => false)

    if (isLoggedIn) {
      console.log('Already logged in! Saving auth state...')
    } else {
      console.log('\nPlease log in as the test user in the browser.')
      console.log('Email:', TEST_EMAIL)
      console.log('\nWaiting for login to complete...')

      // Wait for user to complete login (profile link becomes visible)
      await profileLink.waitFor({ state: 'visible', timeout: 300000 }) // 5 minutes
      console.log('Login detected!')
    }

    // Save the storage state
    const authPath = new URL('./auth.json', import.meta.url).pathname
    await context.storageState({ path: authPath })
    console.log('\nAuth state saved to e2e/auth.json')

    // Verify the saved auth
    const fs = await import('fs')
    const authData = JSON.parse(fs.readFileSync(authPath, 'utf-8'))
    const clerkCookie = authData.cookies?.find((c: { name: string }) => c.name === '__client_uat')

    if (clerkCookie && clerkCookie.value !== '0') {
      console.log('Auth verification passed: Clerk session is valid')
    } else {
      console.warn('Warning: Auth may not be valid. __client_uat cookie is missing or zero.')
    }
  } catch (error) {
    console.error('Error during auth setup:', error)
    throw error
  } finally {
    await browser.close()
    console.log('\nBrowser closed. Auth setup complete.')
  }
}

setupAuth().catch((error) => {
  console.error('Auth setup failed:', error)
  process.exit(1)
})
