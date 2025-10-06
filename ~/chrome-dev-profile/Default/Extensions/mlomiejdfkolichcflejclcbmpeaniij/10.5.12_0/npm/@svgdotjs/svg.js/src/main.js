import './modules/optional/arrange.js';
import './modules/optional/class.js';
import './modules/optional/css.js';
import './modules/optional/data.js';
import './modules/optional/memory.js';
import './modules/optional/sugar.js';
import './modules/optional/transform.js';
import { extend, makeInstance } from './utils/adopter.js';
export { adopt, assignNewId, create, eid, getClass, nodeOrNew, register, root, wrapWithAttrCheck } from './utils/adopter.js';
import { getMethodsFor, getMethodNames } from './utils/methods.js';
import Box from './types/Box.js';
import Color from './types/Color.js';
import Container from './elements/Container.js';
import Defs from './elements/Defs.js';
import Dom from './elements/Dom.js';
import Element from './elements/Element.js';
import Ellipse from './elements/Ellipse.js';
import EventTarget from './types/EventTarget.js';
import Fragment from './elements/Fragment.js';
import Gradient from './elements/Gradient.js';
import Image from './elements/Image.js';
import Line from './elements/Line.js';
import List from './types/List.js';
import Marker from './elements/Marker.js';
import Matrix from './types/Matrix.js';
import { registerMorphableType, makeMorphable } from './animation/Morphable.js';
export { default as Morphable, NonMorphable, ObjectBag, TransformBag } from './animation/Morphable.js';
import Path from './elements/Path.js';
import PathArray from './types/PathArray.js';
import Pattern from './elements/Pattern.js';
import PointArray from './types/PointArray.js';
import Point from './types/Point.js';
import Polygon from './elements/Polygon.js';
import Polyline from './elements/Polyline.js';
import Rect from './elements/Rect.js';
import Runner from './animation/Runner.js';
import SVGArray from './types/SVGArray.js';
import SVGNumber from './types/SVGNumber.js';
import Shape from './elements/Shape.js';
import Svg from './elements/Svg.js';
import Symbol$1 from './elements/Symbol.js';
import Text from './elements/Text.js';
import Tspan from './elements/Tspan.js';
export { Controller, Ease, PID, Spring, easing } from './animation/Controller.js';
export { default as Timeline } from './animation/Timeline.js';
export { default as Circle } from './elements/Circle.js';
export { default as ClipPath } from './elements/ClipPath.js';
export { default as ForeignObject } from './elements/ForeignObject.js';
export { default as G } from './elements/G.js';
export { default as A } from './elements/A.js';
export { default as Mask } from './elements/Mask.js';
export { default as Stop } from './elements/Stop.js';
export { default as Style } from './elements/Style.js';
export { default as TextPath } from './elements/TextPath.js';
export { default as Use } from './elements/Use.js';

/* Optional Modules */
const SVG = makeInstance;

extend([Svg, Symbol$1, Image, Pattern, Marker], getMethodsFor('viewbox'));

extend([Line, Polyline, Polygon, Path], getMethodsFor('marker'));

extend(Text, getMethodsFor('Text'));
extend(Path, getMethodsFor('Path'));

extend(Defs, getMethodsFor('Defs'));

extend([Text, Tspan], getMethodsFor('Tspan'));

extend([Rect, Ellipse, Gradient, Runner], getMethodsFor('radius'));

extend(EventTarget, getMethodsFor('EventTarget'));
extend(Dom, getMethodsFor('Dom'));
extend(Element, getMethodsFor('Element'));
extend(Shape, getMethodsFor('Shape'));
extend([Container, Fragment], getMethodsFor('Container'));
extend(Gradient, getMethodsFor('Gradient'));

extend(Runner, getMethodsFor('Runner'));

List.extend(getMethodNames());

registerMorphableType([
  SVGNumber,
  Color,
  Box,
  Matrix,
  SVGArray,
  PointArray,
  PathArray,
  Point
]);

makeMorphable();

export { SVGArray as Array, Box, Color, Container, Defs, Dom, Element, Ellipse, EventTarget, Fragment, Gradient, Image, Line, List, Marker, Matrix, SVGNumber as Number, Path, PathArray, Pattern, Point, PointArray, Polygon, Polyline, Rect, Runner, SVG, Shape, Svg, Symbol$1 as Symbol, Text, Tspan, extend, makeInstance, makeMorphable, registerMorphableType };
