import { extend, wrapWithAttrCheck, register, nodeOrNew } from '../utils/adopter.js';
import { registerMethods } from '../utils/methods.js';
import { ry, rx } from '../modules/core/circled.js';
import Shape from './Shape.js';

class Rect extends Shape {
  // Initialize node
  constructor(node, attrs = node) {
    super(nodeOrNew('rect', node), attrs);
  }
}

extend(Rect, { rx, ry });

registerMethods({
  Container: {
    // Create a rect element
    rect: wrapWithAttrCheck(function (width, height) {
      return this.put(new Rect()).size(width, height)
    })
  }
});

register(Rect, 'Rect');

export { Rect as default };
