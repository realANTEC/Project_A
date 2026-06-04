import { test, expect, type Page } from '@playwright/test'

const MORPH_NAME = 'aurora-post-media'

/** First post's clickable media in the feed (the element that opens the lightbox). */
function firstPostMedia(page: Page) {
  return page
    .locator('article [role="button"]')
    .filter({ has: page.locator('img') })
    .first()
}

/** How many elements currently hold the shared morph view-transition-name. */
function morphHolderCount(page: Page) {
  return page.evaluate(
    (name) =>
      [...document.querySelectorAll('*')].filter(
        (el) => (el as HTMLElement).style?.viewTransitionName === name,
      ).length,
    MORPH_NAME,
  )
}

test.describe('post lightbox — modal-as-route + shared-element morph', () => {
  test.beforeEach(async ({ page }) => {
    // Count View-Transition invocations, installed before any app code runs.
    await page.addInitScript(() => {
      const w = window as unknown as { __vtCount: number }
      w.__vtCount = 0
      const d = document as unknown as { startViewTransition?: (cb: () => void) => unknown }
      const orig = d.startViewTransition
      if (typeof orig === 'function') {
        d.startViewTransition = (cb: () => void) => {
          w.__vtCount++
          return orig.call(document, cb)
        }
      }
    })
    await page.goto('/')
    // Local/mock mode → the curated feed renders immediately (no auth gate).
    await expect(firstPostMedia(page)).toBeVisible()
  })

  test('opening a post fires the View-Transition morph and pins the URL to /p/:id', async ({ page }) => {
    await firstPostMedia(page).click()

    await expect(page).toHaveURL(/\/p\/.+/)
    await expect(page.getByRole('dialog')).toBeVisible()

    // The morph actually ran (this is the path happy-dom unit tests can't cover).
    const vtCount = await page.evaluate(() => (window as unknown as { __vtCount: number }).__vtCount)
    expect(vtCount).toBeGreaterThan(0)

    // Exactly one element holds the morph name — the lightbox image (source released).
    expect(await morphHolderCount(page)).toBe(1)
    const holderInDialog = await page.evaluate((name) => {
      const holder = [...document.querySelectorAll('*')].find(
        (el) => (el as HTMLElement).style?.viewTransitionName === name,
      )
      return !!holder && !!holder.closest('[role="dialog"]') && holder.tagName === 'IMG'
    }, MORPH_NAME)
    expect(holderInDialog).toBe(true)

    // The feed stays mounted underneath the lightbox (background-location pattern).
    expect(await page.locator('article').count()).toBeGreaterThan(0)
  })

  test('Back closes the lightbox; Forward re-opens it', async ({ page }) => {
    await firstPostMedia(page).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.goBack()
    await expect(page).not.toHaveURL(/\/p\//)
    await expect(page.getByRole('dialog')).toBeHidden()

    await page.goForward()
    await expect(page).toHaveURL(/\/p\/.+/)
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('Escape closes the lightbox and returns to the feed', async ({ page }) => {
    await firstPostMedia(page).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    // The open commits inside the View-Transition callback, so the effects that
    // attach the Escape handler run a beat after the dialog paints. Wait for the
    // focus-trap to move focus INTO the dialog (its rAF fires after those effects)
    // so the keypress can't race the open and get dropped.
    await expect(page.locator('[role="dialog"] :focus')).toBeAttached()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page).not.toHaveURL(/\/p\//)
  })

  test('a direct /p/:id link renders the full page, not the modal', async ({ page }) => {
    await page.goto('/p/p1') // p1 = first curated seed post
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('without the View Transitions API, the lightbox falls back to the motion layoutId path (Firefox)', async ({
    page,
  }) => {
    // Disable startViewTransition before any app code runs, so `supportsViewTransitions`
    // evaluates false and openPost takes the non-VT motion-layoutId branch (the Firefox path).
    // Override the instance property too — it runs after the beforeEach VT-spy (which sets an
    // own property) and so wins, leaving the app to genuinely see no View Transitions API.
    await page.addInitScript(() => {
      const undef = { configurable: true, value: undefined }
      try {
        Object.defineProperty(Document.prototype, 'startViewTransition', undef)
      } catch {
        /* ignore */
      }
      try {
        Object.defineProperty(document, 'startViewTransition', undef)
      } catch {
        /* ignore */
      }
    })
    await page.goto('/')
    await expect(firstPostMedia(page)).toBeVisible()

    await firstPostMedia(page).click()

    // The modal-route still works without the View Transitions API…
    await expect(page).toHaveURL(/\/p\/.+/)
    await expect(page.getByRole('dialog')).toBeVisible()
    // …no View Transition was invoked…
    const vtCount = await page.evaluate(() => (window as unknown as { __vtCount: number }).__vtCount)
    expect(vtCount).toBe(0)
    // …and nothing carries the VT morph-name (the fallback animates via motion layoutId instead)…
    expect(await morphHolderCount(page)).toBe(0)
    // …with the feed still mounted underneath (background-location pattern holds).
    expect(await page.locator('article').count()).toBeGreaterThan(0)
  })
})
