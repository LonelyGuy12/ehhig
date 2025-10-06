// Adaptive content.js - Works regardless of HTML structure changes
console.log('Adaptive content script injected');

// Smart element finder with multiple strategies
function findElementSmart(instruction) {
  console.log('Finding element with instruction:', instruction);
  
  if (instruction.strategy === 'fuzzy_text_match') {
    return findByFuzzyText(instruction.text, instruction.fallback_patterns);
  } else if (instruction.strategy === 'button_text_match') {
    return findButtonByText(instruction.text, instruction.fallback_patterns);
  } else if (instruction.strategy === 'smart_input_find') {
    return findSmartInput(instruction.selectors);
  } else if (instruction.selector) {
    return document.querySelector(instruction.selector);
  }
  
  return null;
}

// Specialized button finder
function findButtonByText(targetText, fallbackPatterns = []) {
  console.log(`Searching for button with text: "${targetText}"`);
  
  const normalize = (text) => text.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Get all buttons
  const buttons = document.querySelectorAll('button, a[role="button"], [class*="button"], [class*="btn"]');
  
  // Try exact match first
  for (let btn of buttons) {
    const btnText = btn.textContent.trim();
    if (btnText === targetText) {
      console.log('Found exact button match:', btn);
      return btn;
    }
  }
  
  // Try normalized match
  const normalizedTarget = normalize(targetText);
  for (let btn of buttons) {
    const normalizedText = normalize(btn.textContent);
    if (normalizedText === normalizedTarget) {
      console.log('Found normalized button match:', btn);
      return btn;
    }
  }
  
  // Try fallback patterns
  if (fallbackPatterns) {
    for (let pattern of fallbackPatterns) {
      if (pattern.startsWith('exact:')) {
        const searchText = pattern.split(':')[1];
        for (let btn of buttons) {
          if (btn.textContent.trim() === searchText) {
            console.log('Found button via exact fallback:', btn);
            return btn;
          }
        }
      } else if (pattern.startsWith('contains:')) {
        const searchText = normalize(pattern.split(':')[1]);
        for (let btn of buttons) {
          if (normalize(btn.textContent).includes(searchText)) {
            console.log('Found button via contains fallback:', btn);
            return btn;
          }
        }
      }
    }
  }
  
  console.warn('No button found for text:', targetText);
  return null;
}

// Fuzzy text matching - finds elements even with minor text differences
function findByFuzzyText(targetText, fallbackPatterns = []) {
  console.log(`Searching for text: "${targetText}"`);
  
  // Normalize text for comparison
  const normalize = (text) => text.toLowerCase().trim().replace(/\s+/g, ' ');
  const normalizedTarget = normalize(targetText);
  
  // Strategy 1: Exact match
  const allElements = document.querySelectorAll('*');
  for (let el of allElements) {
    // Skip if element has children (we want leaf nodes)
    if (el.children.length === 0 && el.textContent) {
      const normalizedContent = normalize(el.textContent);
      if (normalizedContent === normalizedTarget) {
        console.log('Found exact match:', el);
        return el;
      }
    }
  }
  
  // Strategy 2: Parent of text node (for clickable parents)
  for (let el of allElements) {
    const normalizedContent = normalize(el.textContent);
    if (normalizedContent === normalizedTarget && isClickable(el)) {
      console.log('Found clickable parent with exact text:', el);
      return el;
    }
  }
  
  // Strategy 3: Contains match
  for (let el of allElements) {
    const normalizedContent = normalize(el.textContent);
    if (normalizedContent.includes(normalizedTarget) && isClickable(el)) {
      console.log('Found element containing text:', el);
      return el;
    }
  }
  
  // Strategy 4: Fallback patterns
  if (fallbackPatterns) {
    for (let pattern of fallbackPatterns) {
      if (pattern.startsWith('contains:')) {
        const searchText = normalize(pattern.split(':')[1]);
        for (let el of allElements) {
          const normalizedContent = normalize(el.textContent);
          if (normalizedContent.includes(searchText) && isClickable(el)) {
            console.log('Found via fallback pattern:', el);
            return el;
          }
        }
      } else if (pattern.startsWith('startswith:')) {
        const searchText = normalize(pattern.split(':')[1]);
        for (let el of allElements) {
          const normalizedContent = normalize(el.textContent);
          if (normalizedContent.startsWith(searchText) && isClickable(el)) {
            console.log('Found via startswith pattern:', el);
            return el;
          }
        }
      }
    }
  }
  
  console.warn('No element found for text:', targetText);
  return null;
}

// Check if element is clickable
function isClickable(el) {
  const clickableTags = ['BUTTON', 'A', 'INPUT', 'LABEL', 'DIV', 'SPAN'];
  if (clickableTags.includes(el.tagName)) return true;
  
  // Check if it has click handler or pointer cursor
  const style = window.getComputedStyle(el);
  if (style.cursor === 'pointer') return true;
  
  // Check if it's inside a clickable parent
  if (el.closest('button, a, label, [onclick]')) return true;
  
  return false;
}

// Smart input finder - finds input fields by multiple criteria
function findSmartInput(selectors) {
  console.log('Finding input with selectors:', selectors);
  
  // Try each selector in order
  for (let selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      console.log('Found input via selector:', selector);
      return el;
    }
  }
  
  // Fallback: Find the most visible input
  const allInputs = document.querySelectorAll('input, textarea');
  for (let input of allInputs) {
    if (isVisible(input) && !input.disabled && !input.readOnly) {
      console.log('Found visible input as fallback:', input);
      return input;
    }
  }
  
  console.warn('No input found');
  return null;
}

// Check if element is visible
function isVisible(el) {
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         el.offsetWidth > 0 && 
         el.offsetHeight > 0;
}

// Execute instructions with smart element finding
function executeInstructions(instructions) {
  console.log('Executing adaptive instructions:', instructions);
  
  let delay = 0;
  instructions.forEach((instr, index) => {
    setTimeout(() => {
      console.log(`\n--- Executing instruction ${index + 1}/${instructions.length} ---`);
      
      const element = findElementSmart(instr);
      
      if (!element) {
        console.error('❌ Element not found for instruction:', instr);
        return;
      }
      
      console.log('✓ Element found:', element.tagName, element);
      
      switch (instr.action) {
        case 'click':
          console.log('Clicking element...');
          
          // Try multiple click methods for reliability
          try {
            // Method 1: Direct click
            element.click();
            console.log('✓ Clicked successfully');
          } catch (e1) {
            try {
              // Method 2: Mouse event
              element.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              }));
              console.log('✓ Clicked via MouseEvent');
            } catch (e2) {
              // Method 3: Click parent if element itself fails
              const clickableParent = element.closest('button, a, label, [onclick]');
              if (clickableParent) {
                clickableParent.click();
                console.log('✓ Clicked parent element');
              } else {
                console.error('Failed to click:', e2);
              }
            }
          }
          break;
          
        case 'type':
          console.log(`Typing "${instr.value}" into element...`);
          
          // Validate the value isn't garbage
          if (!instr.value || instr.value.trim() === '' || instr.value.includes('<think>')) {
            console.error('❌ Invalid value to type:', instr.value);
            break;
          }
          
          const cleanValue = instr.value.trim();
          console.log(`Clean value to type: "${cleanValue}"`);
          
          // Focus the element first
          element.focus();
          
          // Clear existing value
          element.value = '';
          
          // Small delay for UI update
          setTimeout(() => {
            // Type the value
            element.value = cleanValue;
            
            // Trigger all necessary events
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
            
            // Trigger React-specific events if present
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(element, cleanValue);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            
            console.log('✓ Typed successfully:', element.value);
          }, 100);
          break;
          
        default:
          console.warn('Unknown action:', instr.action);
      }
    }, delay);
    
    delay += instr.delay || 1000;
  });
}

// Process the page
function processPage() {
  console.log('\n=== Processing page ===');
  console.log('URL:', location.href);
  
  // Check if we're on an assessment page
  if (!/\/assessment\//.test(location.pathname)) {
    console.log('Not an assessment page, skipping...');
    return;
  }
  
  console.log('✓ Assessment page detected');
  console.log('Sending page content to server...');
  
  const pageContent = document.documentElement.outerHTML;
  
  fetch('http://localhost:8000/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: pageContent })
  })
  .then(response => response.json())
  .then(data => {
    console.log('✓ Received response from server:', data);
    
    if (data.debug) {
      console.log('Debug info:', data.debug);
    }
    
    if (data.instructions && data.instructions.length > 0) {
      console.log(`Found ${data.instructions.length} instructions to execute`);
      executeInstructions(data.instructions);
    } else {
      console.log('No instructions to execute (possibly last question or error)');
    }
  })
  .catch(error => {
    console.error('❌ Fetch error:', error);
  });
}

// Run immediately on load
processPage();

// Watch for DOM changes (for SPA navigation)
let processingTimeout;
const observer = new MutationObserver(() => {
  // Debounce: wait 500ms after last change before processing
  clearTimeout(processingTimeout);
  processingTimeout = setTimeout(() => {
    console.log('DOM changed, checking if we need to reprocess...');
    processPage();
  }, 500);
});

observer.observe(document.body, { 
  childList: true, 
  subtree: true 
});

console.log('✓ Adaptive content script ready and watching for changes');