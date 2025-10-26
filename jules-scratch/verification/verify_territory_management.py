
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Admin login
    page.goto("http://localhost:5173/")
    page.get_by_label("Email").fill("admin@axim.com")
    page.get_by_label("Password").fill("demo123")
    page.get_by_role("button", name="Sign In").click()

    # Navigate to territories page
    page.get_by_role("button", name="Territories").click()
    expect(page.get_by_text("Territory Management")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/territory_management.png")

    # Open the map dialog
    page.get_by_role("button", name="Add Territory").click()
    expect(page.get_by_text("Create Territory")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/territory_map.png")

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
