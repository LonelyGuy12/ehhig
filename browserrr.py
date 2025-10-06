# server.py (Updated to Handle Embedded JSON)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from bs4 import BeautifulSoup
import requests
import json
import re

app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development (restrict in production)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

class PageData(BaseModel):
    content: str

LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"  # Adjust if LM Studio port changes

@app.post("/process")
async def process_page(data: PageData):
    soup = BeautifulSoup(data.content, 'html.parser')
    # Extract only relevant text to reduce payload size
    question_section = soup.find('div', class_='question') or soup  # Adjust selector if needed
    page_text = question_section.get_text(separator="\n").strip() if question_section else soup.get_text()

    # System prompt for strict JSON output
    system_prompt = """
    You are an expert quiz solver. Output ONLY a valid JSON object with the key "instructions" containing an array of action objects. Do not include any <think> tags, explanations, or additional text.
    """

    # User prompt with detailed instructions
    user_prompt = f"""
    Analyze this quiz page text: {page_text}
    Steps:
    1. Determine question type: 'text' for open-ended input, 'mcq' for multiple choice.
    2. Parse question number (e.g., 'QUESTION 1/5') to check if it's the last (current == total).
    3. Solve the question accurately.
    4. For 'mcq', provide the exact option text to click (e.g., 'A P∧(Q∨R)').
    5. For 'text', provide the exact answer value.
    6. Generate JSON: {{"instructions": [array of dicts]}}
       - Example for text: [{{"action": "type", "selector": "input[placeholder='Enter your answer here']", "value": "5"}}]
       - Example for mcq: [{{"action": "click", "text": "A P∧(Q∨R)"}}]
       - If not the last question, append: {{"action": "click", "text": "Next >", "delay": 2000}}
    Output ONLY the JSON object. No <think> tags or extra text.
    """

    # API payload aligned with working curl test
    payload = {
        "model": "qwen3-14b",  # Match the model from your successful curl test
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.1,  # Low for determinism
        "max_tokens": 1024,  # Increased to ensure complete response
        "stream": False,
    }

    try:
        response = requests.post(LM_STUDIO_URL, headers={"Content-Type": "application/json"}, data=json.dumps(payload))
        response.raise_for_status()
        llm_output = response.json()
        print("LM Studio Response:", llm_output)  # Debug: Log full response

        # Extract JSON from the content, handling potential <think> tags
        content = llm_output["choices"][0]["message"]["content"]
        # Use regex to find the JSON string within the response
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            instructions_data = json.loads(json_match.group())
        else:
            raise json.JSONDecodeError("No valid JSON found in response", content, 0)

        return instructions_data
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP Error: {http_err.response.status_code} - {http_err.response.text}")
        return {"instructions": []}
    except json.JSONDecodeError as json_err:
        print(f"JSON Decode Error: {json_err} - Raw response: {content if 'content' in locals() else 'No response'}")
        return {"instructions": []}
    except Exception as e:
        print(f"Unexpected Error: {e}")
        return {"instructions": []}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)