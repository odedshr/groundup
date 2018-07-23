import errors from '../etc/errors.js';

const rootIdentifier = 'root';

/**
 * Return an updated node tree with minimal replacement of nodes
 * All the original nodes are kept intact so any reference to them stays valid.
 * @param {Node} current
 * @param {Node} plan
 */
function update(current, plan, controllers, forceBind = false) {
  const oldMap = map(current),
    newMap = map(plan);

  rebuildTree(oldMap, newMap);

  if (controllers) {
    bind(current, controllers, forceBind);
  }
}

/**
 * Returns a flat Map(id=>{ node, parentId, children[id] }))
 * @param {Node} root
 */
function map(root) {
  const map = new Map(),
    reverseMap = new Map(),
    mapChild = (id, node) => ({ node, parentId: id });

  let stack = [{ node: root, parentId: '' }];

  while (stack.length) {
    let { node, parentId } = stack.pop(),
      id = node === root ? rootIdentifier : getNodeId(parentId, node),
      children = Array.from(node.childNodes || []);

    stack = stack.concat(children.map(mapChild.bind({}, id)));

    map.set(id, { id, node, parentId, children });
    reverseMap.set(node, id);
  }

  map.forEach(item => {
    item.children = item.children.map(node => reverseMap.get(node));
  });

  return map;
}

const nodeTypes = {
  1: 'Element',
  2: 'Attribute',
  3: 'Text',
  4: 'CDATA Section',
  5: 'Entity Reference',
  6: 'Entity',
  7: 'Processing Instruction',
  8: 'Comment',
  9: 'Document',
  10: 'Document Type',
  11: 'Document Fragment',
  12: 'Notation'
};

function rebuildTree(oldMap, newMap) {
  const idToNode = id =>
    (oldMap.has(id) ? oldMap.get(id) : newMap.get(id)).node;

  // our updates are done bottom-up, so we'll first scan the entire tree to map the updates
  // and only then run over them in reversed order
  let updates = [],
    stack = ['root'];

  while (stack.length) {
    let id = stack.pop(),
      oldItem = oldMap.get(id),
      newItem = newMap.get(id);

    if (oldItem !== undefined && newItem !== undefined) {
      let task = {
        node: oldItem.node,
        attributes: newItem.node.attributes || []
      };

      if (oldItem.children.join() !== newItem.children.join()) {
        task.children = newItem.children.map(idToNode);
      }

      updates.push(task);
    }

    stack = stack.concat((newItem || oldItem).children);
  }

  performUpdates(updates);
}

function performUpdates(updates) {
  while (updates.length) {
    let update = updates.pop();

    setAttributes(update.node, update.attributes);

    if (update.children) {
      replaceChildren(update.node, update.children);
    }
  }
}

function replaceChildren(node, children) {
  let idx = node.childNodes.length,
    newChildCount = children.length;

  while (idx--) {
    let newChild = children[idx];
    if (newChild === undefined) {
      node.removeChild(node.lastChild);
    } else if (newChild !== node.childNodes[idx]) {
      node.replaceChild(newChild, node.childNodes[idx]);
    }
  }

  for (idx = node.childNodes.length; idx < newChildCount; idx++) {
    node.appendChild(children[idx]);
  }
}

function setAttributes(node, attributes) {
  if (!node.setAttribute) {
    return;
  }

  Array.from(attributes).forEach(attribute => {
    if (attribute.nodeName !== 'id') {
      node.setAttribute(attribute.nodeName, attribute.value);
    }
  });
}

function getNodeIdFromAttributes(node) {
  let partialKey,
    identifier = '';

  if (node.getAttribute !== undefined) {
    ['name', 'src', 'href'].forEach(attribute => {
      if (
        (partialKey = node.getAttribute(attribute)) !== null &&
        partialKey.length
      ) {
        identifier += '|' + attribute + ':' + partialKey;
      }
    });
  }

  return identifier.length ? identifier : null;
}

function getNodeId(parentNode, node) {
  let partialKey;

  if (
    node.nodeType !== 3 &&
    node.attributes !== undefined &&
    node.getAttribute !== undefined
  ) {
    if ((partialKey = node.getAttribute('id')) !== null && partialKey.length) {
      return `${node.tagName}#${partialKey}`;
    } else if (
      (partialKey = getNodeIdFromAttributes(node)) !== null &&
      partialKey.length
    ) {
      return `${node.tagName}${partialKey}`;
    } else if (
      isNodeOnlyContainText(node) &&
      (partialKey = node.textContent) !== null &&
      partialKey.length
    ) {
      return `${node.tagName}=${partialKey.replace(/\s/gm, '')}`;
    }
  }

  return getNodeIdentifierByItsParent(parentNode, node);
}

function isNodeOnlyContainText(node) {
  return node.childNodes.length === 1 && node.childNodes[0].nodeType === 3;
}

function getNodeIdentifierByItsParent(parentNode, node) {
  let tagName = node.tagName;

  if (tagName === undefined) {
    tagName = nodeTypes[node.nodeType];
  }

  return `${parentNode}>${tagName}[${Array.from(
    node.parentNode.childNodes
  ).indexOf(node)}]`;
}


function bind (root, controllers, force = false) {
  const errorList = [];

  let stack = [root];

  while (stack.length) {
    let node = stack.pop();

    if (node.getAttribute) {
      let controller = node.getAttribute('data-js');

      if (controller) {
        if (controllers[controller]) {
          if (force || !node.getAttribute('data-js-binded')) {
            controllers[controller](node);
            node.setAttribute('data-js-binded', true);  
          }
        } else {
          errorList.push(new errors.NotFound('controller not found', controller));
        }
      }
    }

    stack = stack.concat(Array.from(node.childNodes || []));
  }

  return errorList;
}

export default { bind, update, map };
