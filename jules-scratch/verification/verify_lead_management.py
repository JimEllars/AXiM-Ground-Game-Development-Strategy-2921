
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

    # Navigate to leads page
    page.get_by_role("button", name="Leads").click()
    expect(page.get_by_text("Lead Management")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/lead_management.png")

    # Open the details dialog
    page.get_by_role("tab", name="View Leads").click()
    page.get_by_role("button", name="View").first.click()
    expect(page.get_by_text("Lead Details")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/lead_details.png")

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
