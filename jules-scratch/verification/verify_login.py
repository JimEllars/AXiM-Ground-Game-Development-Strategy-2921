
import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Listen for all console events and print them
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
        # Listen for page errors
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        await page.goto("http://localhost:5173/")

        # Use the new data-testid for a more robust selector
        login_button = page.get_by_test_id("login-button")

        # Wait for the button to be visible, with a timeout
        try:
            await expect(login_button).to_be_visible(timeout=15000)
            print("Login button is visible.")
        except Exception as e:
            print("Timeout waiting for login button. Taking failure screenshot.")
            await page.screenshot(path="jules-scratch/verification/login_failure.png")
            print(f"Playwright assertion failed: {e}")
            await browser.close()
            return

        await page.get_by_label("Email").fill("admin@axim.com")
        await page.get_by_label("Password").fill("demo123")
        await login_button.click()

        # Wait for the dashboard to load after login
        await expect(page.get_by_text("Admin Dashboard")).to_be_visible()

        await page.screenshot(path="jules-scratch/verification/login_success.png")
        await browser.close()

asyncio.run(main())
