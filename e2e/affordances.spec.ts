import { test, expect } from '@playwright/test'

test.describe('newly-wired affordances', () => {
  test('caption hashtags open seeded search', async ({ page }) => {
    await page.goto('/')
    const tag = page.locator('article').first().getByRole('button', { name: /^#/ }).first()
    const tagText = ((await tag.textContent()) ?? '').trim().replace(/^#/, '')
    await tag.click()

    await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Search' })).toHaveValue(tagText)
  })

  test('the Following tab filters the feed (empty when you follow no one)', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('article').first()).toBeVisible()

    await page.getByRole('tab', { name: 'Following' }).click()
    await expect(page.getByText('No posts from people you follow yet')).toBeVisible()

    await page.getByRole('tab', { name: 'For you' }).click()
    await expect(page.locator('article').first()).toBeVisible()
  })

  test('"Suggest a caption" fills the composer', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Add a photo' }).click()
    const dialog = page.getByRole('dialog', { name: 'Create a post' })
    await dialog
      .locator('button')
      .filter({ has: page.locator('img') })
      .first()
      .click()

    const caption = page.getByPlaceholder(/write a caption/i)
    await expect(caption).toHaveValue('')
    await page.getByRole('button', { name: 'Suggest a caption' }).click()
    await expect(caption).not.toHaveValue('')
  })

  test('Explore category chips filter the mosaic', async ({ page }) => {
    await page.goto('/explore')
    const tiles = page.getByRole('button', { name: /^Post by/ })
    await expect(tiles.first()).toBeVisible() // wait for the lazy mosaic to render
    const all = await tiles.count()
    expect(all).toBeGreaterThan(5)

    await page.getByRole('button', { name: 'Architecture', exact: true }).click()
    await expect.poll(() => tiles.count()).toBeLessThan(all)

    await page.getByRole('button', { name: 'For you', exact: true }).click()
    await expect.poll(() => tiles.count()).toBe(all)
  })
})
