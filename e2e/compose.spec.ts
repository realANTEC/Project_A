import { test, expect } from '@playwright/test'

test.describe('create-post (compose) flow', () => {
  test('pick a photo, write a caption, and it lands at the top of the feed', async ({ page }) => {
    await page.goto('/')

    // Open the composer from the feed-top teaser.
    await page.getByRole('button', { name: 'Add a photo' }).click()
    const dialog = page.getByRole('dialog', { name: 'Create a post' })
    await expect(dialog).toBeVisible()

    // Pick the first gallery photo (the Upload tile has no <img>, so it's skipped).
    await dialog.locator('button').filter({ has: page.locator('img') }).first().click()

    // Write a caption and share.
    const caption = 'a quiet morning by the lake'
    await page.getByPlaceholder(/write a caption/i).fill(caption)
    await page.getByRole('button', { name: 'Share post' }).click()

    // Modal closes, we are back on the feed, and the new post is first.
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('article').first()).toContainText(caption)
  })
})
