const globals = {
  window: typeof window === 'undefined' ? null : window,
  document: typeof document === 'undefined' ? null : document
};

function getWindow() {
  return globals.window
}

export { getWindow, globals };
