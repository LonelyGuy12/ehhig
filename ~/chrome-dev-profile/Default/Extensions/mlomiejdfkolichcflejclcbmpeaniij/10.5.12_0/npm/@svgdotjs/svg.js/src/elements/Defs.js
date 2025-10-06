import { register, nodeOrNew } from '../utils/adopter.js';
import Container from './Container.js';

class Defs extends Container {
  constructor(node, attrs = node) {
    super(nodeOrNew('defs', node), attrs);
  }

  flatten() {
    return this
  }

  ungroup() {
    return this
  }
}

register(Defs, 'Defs');

export { Defs as default };
