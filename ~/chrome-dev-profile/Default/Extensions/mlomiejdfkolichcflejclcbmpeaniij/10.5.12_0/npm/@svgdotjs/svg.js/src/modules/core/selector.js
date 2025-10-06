import { adopt } from '../../utils/adopter.js';
import { globals } from '../../utils/window.js';
import { map } from '../../utils/utils.js';
import List from '../../types/List.js';

function baseFind(query, parent) {
  return new List(
    map((parent || globals.document).querySelectorAll(query), function (node) {
      return adopt(node)
    })
  )
}

// Scoped find method
function find(query) {
  return baseFind(query, this.node)
}

function findOne(query) {
  return adopt(this.node.querySelector(query))
}

export { baseFind as default, find, findOne };
