// content.js (updated for direct execution and SPA support)
console.log('Content script injected on:', location.href);  // Immediate log to confirm injection

function findElementByText(text) {
  console.log(`Searching for element with text: ${text}`);
  const elements = document.querySelectorAll('button, label, div, span, input');
  for (let el of elements) {
    if (el.textContent && el.textContent.trim().includes(text)) {
      console.log(`Found element: ${el.tagName} with text "${el.textContent.trim()}"`);
      return el;
    }
  }
  console.warn(`No element found with text: ${text}`);
  return null;
}

function executeInstructions(instructions) {
  console.log('Executing instructions:', instructions);
  let delay = 0;
  instructions.forEach((instr) => {
    setTimeout(() => {
      let element = null;
      if (instr.selector) {
        element = document.querySelector(instr.selector);
        console.log(`Selector "${instr.selector}" found: ${!!element}`);
      } else if (instr.text) {
        element = findElementByText(instr.text);
      }

      if (!element) {
        console.error('Element not found for instruction:', instr);
        return;
      }

      switch (instr.action) {
        case 'click':
          console.log(`Clicking element: ${element.tagName}`);
          element.click();
          break;
        case 'type':
          console.log(`Typing "${instr.value}" into element: ${element.tagName}`);
          element.value = instr.value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        // Add more actions as needed
      }
    }, delay);
    delay += instr.delay || 1000; // Default delay of 1 second between actions
  });
}

function processPage() {
  console.log('Processing page:', location.href);
  if (/\/assessment\//.test(location.pathname)) {
    console.log('Assessment page detected. Scraping and sending to server...');
    const pageContent = document.documentElement.outerHTML;
    fetch('http://localhost:8000/process', {  // Replace if your FastAPI URL is different
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: pageContent })
    })
    .then(response => {
      console.log('Server response status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('Received data from server:', data);
      if (data.instructions && data.instructions.length > 0) {
        executeInstructions(data.instructions);
      } else {
        console.log('No instructions received; possibly the last question or quiz complete.');
      }
    })
    .catch(error => console.error('Fetch error:', error));
  } else {
    console.log('Not an assessment page; no action taken.');
  }
}

// Run immediately
processPage();

// For SPA support: Watch for DOM changes (e.g., question navigation)
const observer = new MutationObserver((mutations) => {
  for (let mutation of mutations) {
    if (mutation.type === 'childList' || mutation.type === 'subtree') {
      console.log('DOM change detected; re-processing page...');
      processPage();
      break;  // Avoid multiple triggers
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });