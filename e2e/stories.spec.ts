import { test, expect } from '@playwright/test'

test.describe('stories', () => {
  test('open a story, advance a frame, and close it', async ({ page }) => {
    await page.goto('/')

    await page
      .getByRole('button', { name: /View .+'s story/ })
      .first()
      .click()
    const viewer = page.getByRole('dialog')
    await expect(viewer).toBeVisible()

    // Tap forward — still in the viewer (there are several reels to page through).
    await viewer.getByRole('button', { name: 'Next' }).click()
    await expect(viewer).toBeVisible()

    await viewer.getByRole('button', { name: 'Close stories' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('"Your story" opens the composer', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Add to your story' }).click()
    await expect(page.getByRole('dialog', { name: 'Create a post' })).toBeVisible()
  })
})
