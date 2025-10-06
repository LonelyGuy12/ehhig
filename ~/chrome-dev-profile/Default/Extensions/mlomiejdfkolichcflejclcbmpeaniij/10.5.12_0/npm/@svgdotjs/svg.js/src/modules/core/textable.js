import { globals } from '../../utils/window.js';

// Create plain text node
function plain(text) {
  // clear if build mode is disabled
  if (this._build === false) {
    this.clear();
  }

  // create text node
  this.node.appendChild(globals.document.createTextNode(text));

  return this
}

// Get length of text element
function length() {
  return this.node.getComputedTextLength()
}

// Move over x-axis
// Text is moved by its bounding box
// text-anchor does NOT matter
function x(x, box = this.bbox()) {
  if (x == null) {
    return box.x
  }

  return this.attr('x', this.attr('x') + x - box.x)
}

// Move over y-axis
function y(y, box = this.bbox()) {
  if (y == null) {
    return box.y
  }

  return this.attr('y', this.attr('y') + y - box.y)
}

function move(x, y, box = this.bbox()) {
  return this.x(x, box).y(y, box)
}

// Move center over x-axis
function cx(x, box = this.bbox()) {
  if (x == null) {
    return box.cx
  }

  return this.attr('x', this.attr('x') + x - box.cx)
}

// Move center over y-axis
function cy(y, box = this.bbox()) {
  if (y == null) {
    return box.cy
  }

  return this.attr('y', this.attr('y') + y - box.cy)
}

function center(x, y, box = this.bbox()) {
  return this.cx(x, box).cy(y, box)
}

function ax(x) {
  return this.attr('x', x)
}

function ay(y) {
  return this.attr('y', y)
}

function amove(x, y) {
  return this.ax(x).ay(y)
}

// Enable / disable build mode
function build(build) {
  this._build = !!build;
  return this
}

export { amove, ax, ay, build, center, cx, cy, length, move, plain, x, y };
