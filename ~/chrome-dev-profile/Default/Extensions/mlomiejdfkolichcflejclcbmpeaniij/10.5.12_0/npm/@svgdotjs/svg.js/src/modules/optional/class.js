import { delimiter } from '../core/regex.js';
import { registerMethods } from '../../utils/methods.js';

// Return array of classes on the node
function classes() {
  const attr = this.attr('class');
  return attr == null ? [] : attr.trim().split(delimiter)
}

// Return true if class exists on the node, false otherwise
function hasClass(name) {
  return this.classes().indexOf(name) !== -1
}

// Add class to the node
function addClass(name) {
  if (!this.hasClass(name)) {
    const array = this.classes();
    array.push(name);
    this.attr('class', array.join(' '));
  }

  return this
}

// Remove class from the node
function removeClass(name) {
  if (this.hasClass(name)) {
    this.attr(
      'class',
      this.classes()
        .filter(function (c) {
          return c !== name
        })
        .join(' ')
    );
  }

  return this
}

// Toggle the presence of a class on the node
function toggleClass(name) {
  return this.hasClass(name) ? this.removeClass(name) : this.addClass(name)
}

registerMethods('Dom', {
  classes,
  hasClass,
  addClass,
  removeClass,
  toggleClass
});

export { addClass, classes, hasClass, removeClass, toggleClass };
