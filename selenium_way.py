from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager

# --- This sets up the connection to the browser we opened from the terminal ---
options = ChromeOptions()
options.add_experimental_option("debuggerAddress", "127.0.0.1:9222")

service = ChromeService(ChromeDriverManager().install())

# --- This connects to your existing browser instead of opening a new one ---
print("🚀 Connecting to your open Chrome browser...")
driver = webdriver.Chrome(service=service, options=options)
print("✅ Connected!")

# --- Now, let's find the correct tab ---
found_tab = False
# Get a list of all open tabs
all_tabs = driver.window_handles

print(f"🔎 Found {len(all_tabs)} open tabs. Searching for the quiz...")

for tab in all_tabs:
    # Switch the driver's focus to the next tab
    driver.switch_to.window(tab)
    
    # Check if the URL of the current tab is the one we want
    if "newtonschool.co" in driver.current_url and "assessment" in driver.current_url:
        print(f"🎯 Found it! The quiz is at: {driver.current_url}")
        found_tab = True
        break # Stop looping once we've found the tab

if not found_tab:
    print("❌ Could not find an open tab with 'newtonschool.co' and 'assessment' in the URL.")
    driver.quit()

# The 'driver' object is now focused on your quiz tab, ready for the next commands.
# For now, we'll just quit to show it worked.
if found_tab:
    print("\n(Next step will be to extract data from this tab... for now, quitting.)")
    # driver.quit() # We'll keep it open for now so you can see it's focused.