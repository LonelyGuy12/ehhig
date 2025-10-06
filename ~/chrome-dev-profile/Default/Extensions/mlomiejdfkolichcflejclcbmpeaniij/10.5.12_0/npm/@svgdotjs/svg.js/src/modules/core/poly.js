import { proportionalSize } from '../../utils/utils.js';
import PointArray from '../../types/PointArray.js';

// Get array
function array() {
  return this._array || (this._array = new PointArray(this.attr('points')))
}

// Clear array cache
function clear() {
  delete this._array;
  return this
}

// Move by left top corner
function move(x, y) {
  return this.attr('points', this.array().move(x, y))
}

// Plot new path
function plot(p) {
  return p == null
    ? this.array()
    : this.clear().attr(
        'points',
        typeof p === 'string' ? p : (this._array = new PointArray(p))
      )
}

// Set element size to given width and height
function size(width, height) {
  const p = proportionalSize(this, width, height);
  return this.attr('points', this.array().size(p.width, p.height))
}

export { array, clear, move, plot, size };
