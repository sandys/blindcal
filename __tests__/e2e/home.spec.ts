import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/BlindCal|Next.js/)
  })

  test('should have main content', async ({ page }) => {
    await page.goto('/')
    // Check that the page loads without errors
    await expect(page.locator('body')).toBeVisible()
  })
})
