import { wrapWithAttrCheck, register, nodeOrNew } from '../utils/adopter.js';
import { registerMethods } from '../utils/methods.js';
import Container from './Container.js';

let Symbol$1 = class Symbol extends Container {
  // Initialize node
  constructor(node, attrs = node) {
    super(nodeOrNew('symbol', node), attrs);
  }
};

registerMethods({
  Container: {
    symbol: wrapWithAttrCheck(function () {
      return this.put(new Symbol$1())
    })
  }
});

register(Symbol$1, 'Symbol');

export { Symbol$1 as default };
