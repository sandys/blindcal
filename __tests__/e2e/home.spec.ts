import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/')
    // Root path redirects to /login for unauthenticated users
    await expect(page).toHaveURL(/\/login/)
  })

  test('should load login page', async ({ page }) => {
    await page.goto('/login')
    // Check that the page loads without errors
    await expect(page.locator('body')).toBeVisible()
    // Check for login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})
