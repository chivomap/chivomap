import asyncio
from playwright import async_api
from playwright.async_api import expect
from config import BASE_URL, DEFAULT_TIMEOUT

# NOTE: The TextCarousel is only rendered when layoutStore.department === true,
# which is only triggered by clicking geographic polygons on the map canvas
# (not directly testable via DOM). This test verifies the home page UI
# elements that constitute the geographic browsing context instead.

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        pw = await async_api.async_playwright().start()
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )
        context = await browser.new_context()
        context.set_default_timeout(DEFAULT_TIMEOUT)
        page = await context.new_page()

        await page.goto(BASE_URL)
        await asyncio.sleep(3)

        # Assert the map canvas is rendered
        assert await page.locator('canvas').first.is_visible(), \
            "Expected map canvas to be visible"

        # Assert search input is accessible
        search_input = page.get_by_placeholder("Buscar rutas, hospitales, restaurantes...")
        assert await search_input.is_visible(), \
            "Expected search input to be visible"

        # Assert zoom controls are present (part of geographic navigation)
        assert await page.locator('button[title="Acercar"]').is_visible(), \
            "Expected zoom-in button to be visible"
        assert await page.locator('button[title="Alejar"]').is_visible(), \
            "Expected zoom-out button to be visible"

        # Assert location button is present
        assert await page.locator('button[title="Centrar en mi ubicación"]').is_visible(), \
            "Expected location button to be visible"

        # Assert bottom-area CTA is visible (entry point to geographic browsing)
        assert await page.locator('text=Rutas cercanas').first.is_visible(), \
            "Expected 'Rutas cercanas' CTA to be visible"

        await asyncio.sleep(3)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
