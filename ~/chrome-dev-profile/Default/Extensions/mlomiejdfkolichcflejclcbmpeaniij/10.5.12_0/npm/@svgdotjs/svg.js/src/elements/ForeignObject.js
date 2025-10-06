import { wrapWithAttrCheck, register, nodeOrNew } from '../utils/adopter.js';
import { registerMethods } from '../utils/methods.js';
import Element from './Element.js';

class ForeignObject extends Element {
  constructor(node, attrs = node) {
    super(nodeOrNew('foreignObject', node), attrs);
  }
}

registerMethods({
  Container: {
    foreignObject: wrapWithAttrCheck(function (width, height) {
      return this.put(new ForeignObject()).size(width, height)
    })
  }
});

register(ForeignObject, 'ForeignObject');

export { ForeignObject as default };
