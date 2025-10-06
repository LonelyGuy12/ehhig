from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from bs4 import BeautifulSoup
import requests
import json
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PageData(BaseModel):
    content: str

LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"

def extract_quiz_data(soup):
    """Extract quiz data in a structure-agnostic way"""
    data = {
        'question_text': '',
        'question_number': '',
        'total_questions': '',
        'options': [],
        'input_fields': [],
        'buttons': [],
        'code_blocks': []
    }
    
    # Find question number
    question_pattern = r'QUESTION\s+(\d+)/(\d+)'
    text_content = soup.get_text()
    match = re.search(question_pattern, text_content, re.IGNORECASE)
    if match:
        data['question_number'] = match.group(1)
        data['total_questions'] = match.group(2)
    
    # Extract ALL text content for question
    question_area = soup.find('div', class_='question') or soup.body
    if question_area:
        data['question_text'] = question_area.get_text(separator='\n').strip()
    
    # Extract code blocks specifically
    for code_elem in soup.find_all(['code', 'pre']):
        code_text = code_elem.get_text().strip()
        if code_text:
            data['code_blocks'].append(code_text)
    
    # Find options (MCQ)
    option_pattern = r'^([A-D])\s+'
    for elem in soup.find_all(['div', 'label', 'button', 'span']):
        text = elem.get_text().strip()
        if re.match(option_pattern, text) and len(text) < 200:
            data['options'].append({
                'label': text[0],
                'text': text,
                'full_text': elem.get_text().strip()
            })
    
    # Find input fields
    for input_elem in soup.find_all('input'):
        placeholder = input_elem.get('placeholder', '')
        input_type = input_elem.get('type', 'text')
        data['input_fields'].append({
            'type': input_type,
            'placeholder': placeholder
        })
    
    # Find buttons
    for button in soup.find_all(['button', 'a']):
        btn_text = button.get_text().strip()
        if btn_text:
            data['buttons'].append(btn_text)
    
    return data

def clean_llm_response(response_text):
    """Extract clean answer from LLM response, removing think tags and explanations"""
    print(f"Raw response to clean: '{response_text}'")
    
    # CRITICAL: Remove <think> tags and their content (most aggressive approach)
    # This regex handles multiline content inside think tags
    cleaned = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL | re.IGNORECASE)
    
    # Also handle if there's just opening tag without closing
    cleaned = re.sub(r'<think>.*', '', cleaned, flags=re.DOTALL | re.IGNORECASE)
    
    # Remove any remaining XML-like tags
    cleaned = re.sub(r'<[^>]+>', '', cleaned)
    
    # Remove common explanation phrases at the start
    cleaned = re.sub(r'^(The answer is|Therefore|Thus|So|Hence|Output|Answer|Final answer|Result):\s*', '', cleaned, flags=re.IGNORECASE | re.MULTILINE)
    
    # Remove markdown code blocks
    cleaned = re.sub(r'```[\s\S]*?```', '', cleaned)
    
    # Remove quotes if answer is quoted
    cleaned = cleaned.strip('"\'')
    
    # Remove extra whitespace and newlines
    cleaned = cleaned.strip()
    
    # If there are multiple lines, extract just the answer part
    lines = [line.strip() for line in cleaned.split('\n') if line.strip() and not line.startswith('#')]
    
    if not lines:
        print("WARNING: No lines after cleaning!")
        return ""
    
    # Strategy: The answer is usually:
    # 1. A single number/word
    # 2. The shortest line
    # 3. The last line (after thinking)
    
    # Find lines that look like simple answers (short, alphanumeric)
    simple_answers = [l for l in lines if len(l) <= 50 and not any(word in l.lower() for word in ['the', 'is', 'are', 'because', 'since', 'therefore'])]
    
    if simple_answers:
        # Return the shortest simple answer
        final_answer = min(simple_answers, key=len)
    else:
        # Fallback: return the last line
        final_answer = lines[-1]
    
    print(f"Final cleaned answer: '{final_answer}'")
    return final_answer

def create_adaptive_instructions(quiz_data, llm_answer):
    """Create instructions that work regardless of HTML structure"""
    instructions = []
    
    question_type = 'mcq' if quiz_data['options'] else 'text'
    is_last = (quiz_data['question_number'] == quiz_data['total_questions'])
    
    print(f"Question type: {question_type}, Is last: {is_last}")
    print(f"Clean answer: '{llm_answer}'")
    
    if question_type == 'mcq':
        instructions.append({
            "action": "click",
            "text": llm_answer,
            "strategy": "fuzzy_text_match",
            "fallback_patterns": [
                f"contains:{llm_answer[:15]}",
                f"startswith:{llm_answer[0]}"
            ]
        })
    else:
        instructions.append({
            "action": "type",
            "value": llm_answer,
            "strategy": "smart_input_find",
            "selectors": [
                "input[type='text']",
                "input[type='number']",
                "input[placeholder*='answer']",
                "input[placeholder*='Answer']",
                "textarea"
            ]
        })
    
    # Add Next button click if not last question
    if not is_last:
        instructions.append({
            "action": "click",
            "text": "Next",
            "strategy": "button_text_match",
            "fallback_patterns": [
                "exact:Next >",
                "exact:Next",
                "contains:Next"
            ],
            "delay": 2000
        })
    
    return instructions

@app.post("/process")
async def process_page(data: PageData):
    soup = BeautifulSoup(data.content, 'html.parser')
    quiz_data = extract_quiz_data(soup)
    
    # Ultra-strict system prompt
    system_prompt = """You are a quiz answer bot. Output format: ANSWER ONLY.

CRITICAL RULES:
1. NO <think> tags - FORBIDDEN
2. NO explanations - FORBIDDEN  
3. NO reasoning - FORBIDDEN
4. NO extra words - FORBIDDEN

For MCQ: Output "A OptionText" format
For text: Output the number/text only

Example MCQ: "A P∧(Q∨R)"
Example text: "42"

ONE LINE ANSWER ONLY."""
    
    # Build question context with explicit instruction
    question_context = f"""Question {quiz_data['question_number']}/{quiz_data['total_questions']}

{quiz_data['question_text']}
"""
    
    if quiz_data['code_blocks']:
        question_context += "\n\nCode:\n" + "\n".join(quiz_data['code_blocks'])
    
    if quiz_data['options']:
        question_context += "\n\nOptions:\n"
        for opt in quiz_data['options']:
            question_context += f"{opt['full_text']}\n"
        question_context += "\n>>> Output the complete option (letter + text) and NOTHING else"
    else:
        question_context += "\n>>> Output ONLY the answer value (number/text) and NOTHING else"
    
    print("=" * 50)
    print("QUESTION SENT TO LLM:")
    print(question_context)
    print("=" * 50)
    
    payload = {
        "model": "qwen3-14b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question_context}
        ],
        "temperature": 0.0,
        "max_tokens": 50,    # Even shorter to prevent thinking
        "stream": False,
        "stop": ["<think>", "\n\n", "Explanation", "Therefore", "because", "Since", "Let", "First", "Step"],
        "top_p": 0.1,        # More focused
        "frequency_penalty": 2.0,  # Discourage repetition
        "presence_penalty": 2.0    # Discourage verbose responses
    }
    
    try:
        response = requests.post(LM_STUDIO_URL, headers={"Content-Type": "application/json"}, data=json.dumps(payload))
        response.raise_for_status()
        llm_output = response.json()
        
        raw_answer = llm_output["choices"][0]["message"]["content"]
        print(f"Raw LLM output: '{raw_answer}'")
        
        # Clean the answer
        clean_answer = clean_llm_response(raw_answer)
        print(f"Cleaned answer: '{clean_answer}'")
        
        if not clean_answer:
            print("WARNING: Empty answer after cleaning!")
            return {"instructions": [], "error": "Empty answer from LLM"}
        
        instructions = create_adaptive_instructions(quiz_data, clean_answer)
        
        return {
            "instructions": instructions,
            "debug": {
                "question_type": "mcq" if quiz_data['options'] else "text",
                "question_num": quiz_data['question_number'],
                "total": quiz_data['total_questions'],
                "raw_answer": raw_answer,
                "clean_answer": clean_answer
            }
        }
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return {"instructions": [], "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)