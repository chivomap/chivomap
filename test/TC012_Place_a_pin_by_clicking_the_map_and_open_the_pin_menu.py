import asyncio
from playwright import async_api
from playwright.async_api import expect
from config import BASE_URL, DEFAULT_TIMEOUT

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

        # Right-click on the map canvas to trigger the context menu
        canvas = page.locator('canvas').first
        await canvas.click(button='right')
        await asyncio.sleep(1)

        # Select "Colocar pin aquí" from the context menu
        await page.locator('text=Colocar pin aquí').click()
        await asyncio.sleep(2)

        # Assert pin controls appear in MapControls after placement
        assert await page.locator('button[title="Quitar pin"]').is_visible(), \
            "Expected 'Quitar pin' button to be visible after placing pin"
        assert await page.locator('button[title="Opciones del pin"]').is_visible(), \
            "Expected 'Opciones del pin' button to be visible after placing pin"
        await asyncio.sleep(3)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
