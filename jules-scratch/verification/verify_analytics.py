
from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:5173/login")
        page.get_by_label("Email Address").fill("admin@axim.com")
        page.get_by_label("Password").fill("demo123")
        page.get_by_role("button", name="Sign In").click()
        page.goto("http://localhost:5173/analytics")
        expect(page).to_have_url("http://localhost:5173/analytics")
        page.screenshot(path="jules-scratch/verification/analytics_verification.png")
        browser.close()

run()
