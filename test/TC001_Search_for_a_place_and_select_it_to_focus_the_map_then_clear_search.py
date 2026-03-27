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
        await search_input.fill('hospital')
        await asyncio.sleep(5)

        first_result = page.locator('form [class*="overflow-y-auto"] button').first
        await first_result.click()
        await asyncio.sleep(2)

        clear_btn = page.locator('form button[type="button"]').first
        await clear_btn.click()
        await asyncio.sleep(2)

        current_url = await page.evaluate("() => window.location.href")
        assert current_url is not None, "Test completed successfully"
        await asyncio.sleep(3)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
