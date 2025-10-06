import { ELEMENT_NODE } from './constants.js';
import { MIME, END, NEXT, PREV } from './symbols.js';

const $String = String;

const getEnd = node => node.nodeType === ELEMENT_NODE ? node[END] : node;

const ignoreCase = ({ownerDocument}) => ownerDocument[MIME].ignoreCase;

const knownAdjacent = (prev, next) => {
  prev[NEXT] = next;
  next[PREV] = prev;
};

const knownBoundaries = (prev, current, next) => {
  knownAdjacent(prev, current);
  knownAdjacent(getEnd(current), next);
};

const knownSegment = (prev, start, end, next) => {
  knownAdjacent(prev, start);
  knownAdjacent(getEnd(end), next);
};

const knownSiblings = (prev, current, next) => {
  knownAdjacent(prev, current);
  knownAdjacent(current, next);
};

const localCase = ({localName, ownerDocument}) => {
  return ownerDocument[MIME].ignoreCase ? localName.toUpperCase() : localName;
};

const setAdjacent = (prev, next) => {
  if (prev)
    prev[NEXT] = next;
  if (next)
    next[PREV] = prev;
};

/**
 * @param {import("../interface/document.js").Document} ownerDocument
 * @param {string} html
 * @return {import("../interface/document-fragment.js").DocumentFragment}
 */
const htmlToFragment = (ownerDocument, html) => {
  const fragment = ownerDocument.createDocumentFragment();

  const elem = ownerDocument.createElement('');
  elem.innerHTML = html;
  const { firstChild, lastChild } = elem;

  if (firstChild) {
    knownSegment(fragment, firstChild, lastChild, fragment[END]);

    let child = firstChild;
    do {
      child.parentNode = fragment;
    } while (child !== lastChild && (child = getEnd(child)[NEXT]));
  }

  return fragment;
};

export { $String as String, getEnd, htmlToFragment, ignoreCase, knownAdjacent, knownBoundaries, knownSegment, knownSiblings, localCase, setAdjacent };
