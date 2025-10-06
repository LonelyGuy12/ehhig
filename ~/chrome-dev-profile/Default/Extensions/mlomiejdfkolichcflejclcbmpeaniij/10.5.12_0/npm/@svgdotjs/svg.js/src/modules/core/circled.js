import SVGNumber from '../../types/SVGNumber.js';

// Radius x value
function rx(rx) {
  return this.attr('rx', rx)
}

// Radius y value
function ry(ry) {
  return this.attr('ry', ry)
}

// Move over x-axis
function x(x) {
  return x == null ? this.cx() - this.rx() : this.cx(x + this.rx())
}

// Move over y-axis
function y(y) {
  return y == null ? this.cy() - this.ry() : this.cy(y + this.ry())
}

// Move by center over x-axis
function cx(x) {
  return this.attr('cx', x)
}

// Move by center over y-axis
function cy(y) {
  return this.attr('cy', y)
}

// Set width of element
function width(width) {
  return width == null ? this.rx() * 2 : this.rx(new SVGNumber(width).divide(2))
}

// Set height of element
function height(height) {
  return height == null
    ? this.ry() * 2
    : this.ry(new SVGNumber(height).divide(2))
}

export { cx, cy, height, rx, ry, width, x, y };
