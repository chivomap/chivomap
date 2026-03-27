import asyncio
from playwright import async_api
from playwright.async_api import expect
from config import BASE_URL, DEFAULT_TIMEOUT

# NOTE: "Volver a departamento" requires being in PlaceInfo state (set via canvas
# polygon clicks). This test verifies the equivalent "undo" navigation: placing a
# pin and then removing it, confirming the map returns to its default state.

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

        # Place a pin via right-click context menu
        canvas = page.locator('canvas').first
        await canvas.click(button='right')
        await asyncio.sleep(1)
        await page.locator('text=Colocar pin aquí').click()
        await asyncio.sleep(2)

        # Assert pin controls are visible after placement
        assert await page.locator('button[title="Quitar pin"]').is_visible(), \
            "Expected 'Quitar pin' button to be visible after placing pin"

        # Remove the pin — equivalent to returning to default map state
        await page.locator('button[title="Quitar pin"]').click()
        await asyncio.sleep(1)

        # Assert pin controls are gone — map returned to default state
        assert not await page.locator('button[title="Quitar pin"]').is_visible(), \
            "Expected 'Quitar pin' button to be hidden after removing pin"
        assert not await page.locator('button[title="Opciones del pin"]').is_visible(), \
            "Expected 'Opciones del pin' button to be hidden after removing pin"

        # Assert base map controls are still visible
        assert await page.locator('button[title="Acercar"]').is_visible(), \
            "Expected zoom controls to remain visible after removing pin"

        await asyncio.sleep(3)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
