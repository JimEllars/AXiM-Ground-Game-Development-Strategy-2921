
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Admin login
    page.goto("http://localhost:5173/")
    page.wait_for_load_state("networkidle")
    page.get_by_label("Email").fill("admin@axim.com")
    page.get_by_label("Password").fill("demo123")
    page.get_by_role("button", name="Sign In").click()
    expect(page.get_by_text("Admin Dashboard")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/admin_dashboard.png")
    page.get_by_role("button", name="Admin User").click()
    page.get_by_role("menuitem", name="Logout").click()

    # Manager login
    page.goto("http://localhost:5173/")
    page.get_by_label("Email").fill("manager@axim.com")
    page.get_by_label("Password").fill("demo123")
    page.get_by_role("button", name="Sign In").click()
    expect(page.get_by_text("Manager Dashboard")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/manager_dashboard.png")
    page.get_by_role("button", name="Manager User").click()
    page.get_by_role("menuitem", name="Logout").click()

    # Rep login
    page.goto("http://localhost:5173/")
    page.get_by_label("Email").fill("rep@axim.com")
    page.get_by_label("Password").fill("demo123")
    page.get_by_role("button", name="Sign In").click()
    expect(page.get_by_text("Rep Dashboard")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/rep_dashboard.png")
    page.get_by_role("button", name="Rep User").click()
    page.get_by_role("menuitem", name="Logout").click()

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
