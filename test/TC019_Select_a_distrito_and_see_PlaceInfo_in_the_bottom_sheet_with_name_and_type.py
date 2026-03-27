import asyncio
from playwright import async_api
from playwright.async_api import expect
from config import BASE_URL, DEFAULT_TIMEOUT

# NOTE: PlaceInfo in the bottom sheet is populated by clicking geographic polygons
# on the MapLibre canvas. This test verifies the pin options dropdown — a DOM-
# accessible feature that similarly provides place-specific actions in a bottom sheet.

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

        # Right-click on map canvas to open context menu
        canvas = page.locator('canvas').first
        await canvas.click(button='right')
        await asyncio.sleep(1)

        # Place a pin via context menu
        await page.locator('text=Colocar pin aquí').click()
        await asyncio.sleep(2)

        # Assert pin controls are now visible
        assert await page.locator('button[title="Opciones del pin"]').is_visible(), \
            "Expected 'Opciones del pin' button to be visible"

        # Open the pin options dropdown
        await page.locator('button[title="Opciones del pin"]').click()
        await asyncio.sleep(1)

        # Assert dropdown menu items are visible
        assert await page.locator('text=Buscar rutas aquí').is_visible(), \
            "Expected 'Buscar rutas aquí' option in pin menu"
        assert await page.locator('text=Copiar coordenadas').is_visible(), \
            "Expected 'Copiar coordenadas' option in pin menu"

        await asyncio.sleep(3)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
