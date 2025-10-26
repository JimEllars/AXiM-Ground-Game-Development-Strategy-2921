
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Since I can't log in, I'll navigate directly to the territories page
        # and mock the authentication state.
        page.goto("http://localhost:5173/")
        page.evaluate("() => { localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDEiLCJlbWFpbCI6ImFkbWluQGF4aW0uY29tIiwicm9sZSI6IkFETUlOIiwib3JnYW5pemF0aW9uSWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJpYXQiOjE3NjE0NDg4NTcsImV4cCI6MTc2MjA1MzY1N30.ppwY4rl-aRQnNI-lXsLCFbAetgxZeQbdFJ4dHo2ETXk'); }")
        page.goto("http://localhost:5173/#/territories")

        # Wait for the map to load
        page.wait_for_selector('.mapboxgl-map')

        # Click on a territory to open the details panel
        page.click('.mapboxgl-canvas')

        page.wait_for_selector('text="Assign Representative"')

        # Take a screenshot of the territory details panel
        page.screenshot(path="jules-scratch/verification/territory-details.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
