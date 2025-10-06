import { height, width, cy, cx, y, x } from '../modules/core/circled.js';
import { extend, wrapWithAttrCheck, register, nodeOrNew } from '../utils/adopter.js';
import { registerMethods } from '../utils/methods.js';
import SVGNumber from '../types/SVGNumber.js';
import Shape from './Shape.js';

class Circle extends Shape {
  constructor(node, attrs = node) {
    super(nodeOrNew('circle', node), attrs);
  }

  radius(r) {
    return this.attr('r', r)
  }

  // Radius x value
  rx(rx) {
    return this.attr('r', rx)
  }

  // Alias radius x value
  ry(ry) {
    return this.rx(ry)
  }

  size(size) {
    return this.radius(new SVGNumber(size).divide(2))
  }
}

extend(Circle, { x, y, cx, cy, width, height });

registerMethods({
  Container: {
    // Create circle element
    circle: wrapWithAttrCheck(function (size = 0) {
      return this.put(new Circle()).size(size).move(0, 0)
    })
  }
});

register(Circle, 'Circle');

export { Circle as default };
