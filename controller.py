import mss
import pyautogui
import time
import base64
import io
import pytesseract
from openai import OpenAI
from PIL import Image
from pynput import keyboard # Using the stable hotkey library

# --- ⚙️ Final Ollama Configuration ---
OLLAMA_API_URL = "http://localhost:1235/v1" # Your custom port
MODEL_NAME = "llava" # A powerful model that can see and think

# --- Hotkey setup using pynput ---
HOTKEY_COMBINATION = {
    keyboard.Key.cmd,
    keyboard.Key.shift,
    keyboard.KeyCode.from_char('8')
}
current_keys = set()

ACTIVE_NEXT_BUTTON_IMAGE = 'next_button_active.png'
automation_running = False

# --- Initialize ONE API Client for Ollama ---
client = OpenAI(base_url=OLLAMA_API_URL, api_key="ollama")

def toggle_automation():
    """Toggles the automation loop on/off."""
    global automation_running
    automation_running = not automation_running
    if automation_running:
        print("\n✅ Automation Started! Solving with Ollama on port 1235...")
    else:
        print("\n🛑 Automation Stopped by hotkey.")

def capture_screen_pil():
    """Captures the screen and returns it as a PIL Image object."""
    with mss.mss() as sct:
        sct_img = sct.grab(sct.monitors[1])
        return Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")

def pil_to_base64(pil_image):
    """Converts a PIL Image to a base64 string."""
    buffered = io.BytesIO()
    # Using JPEG with a quality of 80 is a good trade-off for speed and quality
    pil_image.save(buffered, format="JPEG", quality=80)
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

def get_answer_from_image(base64_image):
    """Uses the single multimodal model to analyze and solve the quiz question."""
    print(f"🧠 Asking {MODEL_NAME} to solve the quiz...")
    
    prompt = "You are an expert quiz solver. Analyze the question in the image and determine the correct answer. Provide the final action in one of these formats:\n- For multiple choice: CLICK:\"The exact text of the correct option\"\n- For fill-in-the-blank: TYPE:\"The text to be typed\""

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ],
                }
            ],
            max_tokens=200, # A smaller max_tokens can speed up response time
            temperature=0.2 # Lower temperature for more deterministic answers
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"❌ Error communicating with Ollama: {e}")
        return None

def find_and_click_text(pil_image, text_to_find):
    """Finds the location of text on the screen using OCR and clicks it."""
    print(f"🖱️ Searching for text '{text_to_find}' to click...")
    data = pytesseract.image_to_data(pil_image, output_type=pytesseract.Output.DICT)
    words = [i for i, conf in enumerate(data['conf']) if int(conf) > 60]
    
    for i in words:
        if text_to_find.lower() in data['text'][i].strip().lower():
            x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
            click_x, click_y = x + w // 2, y + h // 2
            pyautogui.moveTo(click_x, click_y, duration=0.2) # Faster mouse movement
            pyautogui.click()
            print(f"   -> Clicked at ({click_x}, {click_y})")
            return True
    print(f"   -> Could not find text '{text_to_find}' on screen.")
    return False

def is_next_button_active():
    """Checks if the active 'Next' button is visible on the screen."""
    try:
        return pyautogui.locateOnScreen(ACTIVE_NEXT_BUTTON_IMAGE, confidence=0.8) is not None
    except pyautogui.PyAutoGUIException:
        print(f"⚠️  Warning: Could not find '{ACTIVE_NEXT_BUTTON_IMAGE}'.")
        return False

def perform_action(action_command, pil_image):
    """Parses and executes the action, then clicks Next."""
    print(f"🎬 Performing action: {action_command}")
    
    if action_command.startswith('TYPE:'):
        pyautogui.typewrite(action_command.split(':', 1)[1].strip().strip('"'), interval=0.05) # Faster typing
    
    elif action_command.startswith('CLICK:'):
        find_and_click_text(pil_image, action_command.split(':', 1)[1].strip().strip('"'))
    
    else:
        print(f"❓ Unknown command: {action_command}"); return

    time.sleep(0.5) # Reduced wait time
    try:
        if (loc := pyautogui.locateCenterOnScreen(ACTIVE_NEXT_BUTTON_IMAGE, confidence=0.8)):
            pyautogui.click(loc); print("✅ Clicked 'Next' button.")
        else: print("Could not find 'Next' button to click.")
    except Exception as e: print(f"Error clicking next button: {e}")

def run_automation_loop():
    """The main loop that solves the quiz until the 'Next' button is gone."""
    global automation_running # <-- 1. Declare global at the top of the function

    while automation_running:
        if not is_next_button_active():
            print("\n🏁 'Next' button not active. Quiz finished. Stopping.")
            automation_running = False # <-- 2. Just change the value here
            break                  # <-- And break the loop

        screen_image = capture_screen_pil()
        b64_image = pil_to_base64(screen_image)
        answer_command = get_answer_from_image(b64_image)
        
        # Check if the hotkey was pressed while waiting for the model
        if not answer_command or not automation_running: 
            break

        perform_action(answer_command, screen_image)
        time.sleep(2.5) # Wait for next page to load fully

# --- New Hotkey Listener using pynput ---
def on_press(key):
    if key in HOTKEY_COMBINATION:
        current_keys.add(key)
        if all(k in current_keys for k in HOTKEY_COMBINATION):
            toggle_automation()
            if automation_running:
                # Use a separate thread to not block the listener
                import threading
                threading.Thread(target=run_automation_loop).start()

def on_release(key):
    try: current_keys.remove(key)
    except KeyError: pass

# --- Main Execution Block ---
if __name__ == "__main__":
    print("🚀 Quiz Solver is ready.")
    print(f"Connected to Ollama on port 1235. Model: {MODEL_NAME}")
    print("Press 'Command+Shift+8' to start or stop.")
    
    with keyboard.Listener(on_press=on_press, on_release=on_release) as listener:
        listener.join()