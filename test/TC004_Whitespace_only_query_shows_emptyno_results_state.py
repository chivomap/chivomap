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
        await search_input.fill('     ')
        await asyncio.sleep(2)

        # Whitespace-only query should NOT produce any search results
        route_results = page.locator('form [class*="overflow-y-auto"] div.group')
        assert await route_results.count() == 0, \
            "Expected no route results for whitespace-only query"

        place_results = page.locator('form [class*="overflow-y-auto"] [class*="overflow-y-auto"] button')
        assert await place_results.count() == 0, \
            "Expected no place results for whitespace-only query"
        await asyncio.sleep(3)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
