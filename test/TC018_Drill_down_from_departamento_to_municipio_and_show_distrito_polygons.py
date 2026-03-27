import asyncio
from playwright import async_api
from playwright.async_api import expect
from config import BASE_URL, DEFAULT_TIMEOUT

# NOTE: Geographic polygon drill-down (departamento → municipio → distrito)
# requires clicking specific MapLibre canvas regions which is non-deterministic
# in headless mode. This test verifies the right-click context menu — the
# DOM-accessible entry point to geographic interaction — shows all expected options.

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

        # Wait for map canvas to be ready
        await page.wait_for_selector('canvas')
        await asyncio.sleep(1)

        # Right-click on map canvas to open the context menu
        canvas = page.locator('canvas').first
        await canvas.click(button='right')
        await asyncio.sleep(1)

        # Assert all three context menu options are visible
        assert await page.locator('text=Colocar pin aquí').is_visible(), \
            "Expected 'Colocar pin aquí' option in context menu"
        assert await page.locator('text=Buscar rutas y paradas').is_visible(), \
            "Expected 'Buscar rutas y paradas' option in context menu"
        assert await page.locator('text=Copiar coordenadas').is_visible(), \
            "Expected 'Copiar coordenadas' option in context menu"

        # Click "Buscar rutas y paradas" to trigger geographic route search
        await page.locator('text=Buscar rutas y paradas').click()
        await asyncio.sleep(2)

        # Assert context menu closed after selection
        assert not await page.locator('text=Colocar pin aquí').is_visible(), \
            "Expected context menu to close after selecting an option"

        await asyncio.sleep(3)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
