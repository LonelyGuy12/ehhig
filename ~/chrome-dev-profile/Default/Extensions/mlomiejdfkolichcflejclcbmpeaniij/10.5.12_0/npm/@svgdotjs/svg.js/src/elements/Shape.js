import { register } from '../utils/adopter.js';
import Element from './Element.js';

class Shape extends Element {}

register(Shape, 'Shape');

export { Shape as default };
