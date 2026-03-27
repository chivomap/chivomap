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

        search_input = page.get_by_placeholder("Buscar rutas, hospitales, restaurantes...")
        await search_input.fill('42')
        await asyncio.sleep(5)

        route_result = page.locator('form [class*="overflow-y-auto"] div.group').first
        await route_result.click()
        await asyncio.sleep(3)

        regreso_btn = page.locator('button:has-text("Regreso")')
        await regreso_btn.click()
        await asyncio.sleep(2)

        assert await page.locator('button:has-text("Regreso")').is_visible(), "Expected 'Regreso' button to be visible"
        assert await page.locator('text=km').first.is_visible(), "Expected km distance to be visible"
        await asyncio.sleep(3)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
