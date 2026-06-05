import { test, expect, type Page } from '@playwright/test'

function openFirstPost(page: Page) {
  return page
    .locator('article [role="button"]')
    .filter({ has: page.locator('img') })
    .first()
    .click()
}

test.describe('comment emoji picker', () => {
  test('picking an emoji inserts it into the comment box', async ({ page }) => {
    await page.goto('/')
    await openFirstPost(page)
    await expect(page.getByRole('dialog')).toBeVisible()

    const input = page.getByRole('textbox', { name: 'Add a comment' })
    await page.getByRole('button', { name: 'Add emoji' }).click()

    const picker = page.getByRole('menu', { name: 'Emoji picker' })
    await expect(picker).toBeVisible()

    const firstEmoji = picker.getByRole('button').first()
    // The emoji renders as an <img alt="😀"> (static Noto), so read it from alt;
    // fall back to text content for the glyph case (a missing asset → 404 fallback).
    const img = firstEmoji.locator('img')
    const emojiChar = (await img.count())
      ? ((await img.getAttribute('alt')) ?? '')
      : ((await firstEmoji.textContent()) ?? '').trim()
    await firstEmoji.click()

    await expect(input).toHaveValue(emojiChar)
  })

  test('Escape closes the picker but keeps the lightbox open', async ({ page }) => {
    await page.goto('/')
    await openFirstPost(page)
    await page.getByRole('button', { name: 'Add emoji' }).click()
    await expect(page.getByRole('menu', { name: 'Emoji picker' })).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(page.getByRole('menu', { name: 'Emoji picker' })).toBeHidden()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page).toHaveURL(/\/p\/.+/)
  })
})
