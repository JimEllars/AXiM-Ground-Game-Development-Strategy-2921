
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:5173/login")
        page.screenshot(path="jules-scratch/verification/01_login_page.png")

        page.get_by_label("Email").fill("admin@axim.com")
        page.get_by_label("Password").fill("demo123")
        page.screenshot(path="jules-scratch/verification/02_login_filled.png")

        page.get_by_role("button", name="Login").click()

        # Wait for navigation to complete
        page.wait_for_url("http://localhost:5173/#/")
        page.screenshot(path="jules-scratch/verification/03_dashboard.png")
        print("Login successful!")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
