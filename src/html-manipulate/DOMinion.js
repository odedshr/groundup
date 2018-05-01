function update(current, plan) {
  const map = {};

  addCurrentElementsToMap(current, map);
  addPlannedElementsToMap(plan, map);
  rebuildTree(current, map);
}

function addCurrentElementsToMap (root, map) {
  let stack = [root];

  while (stack.length) {
    let node = stack.pop(),
        nodeIdentifier = node === root ? 'root' : getNodeIdentifier(node);

    stack = stack.concat([].slice.call(node.childNodes || []));

    if (node.tagName) {
      map[nodeIdentifier] = { node: node };
    }
  }
}

function addPlannedElementsToMap(root, map) {
  let stack = [root];

  while (stack.length) {
    let node = stack.pop(),
        nodeIdentifier = node === root ? 'root' : getNodeIdentifier(node),
        children = [].slice.call(node.childNodes || []);

    stack = stack.concat(children);

    if (map[nodeIdentifier]) {
      let oldNode = map[nodeIdentifier];
      oldNode.textContent = node.textContent;

      if (node.attributes) {
        setAttributes(oldNode, node.attributes);
      }

      node = oldNode.node;
    }

    map[nodeIdentifier] = { 
      node: node,
      children: children.map(getNodeIdentifier)
    };
  }

  return map;
}

function rebuildTree(root, map) {
  const getNodeFromMap = nodeId => map[nodeId].node,
        appendChild = (node, child) => node.appendChild(child);
  let stack = [root];

  while (stack.length) {
    let node = stack.pop(),
        nodeIdentifier = node === root ? 'root' : getNodeIdentifier(node);

    while (node.lastChild) {
      node.removeChild(node.lastChild);
    }

    let childNodes = map[nodeIdentifier].children.map(getNodeFromMap);
    childNodes.forEach(appendChild.bind({},node));
    stack = stack.concat(childNodes);
  }
}

function setAttributes (node, attributes) {
  if (!node.setAttribute) {
    return;
  }

  for (let i=0; i < attributes.length; i++) {
    if (attributes[i].nodeName !== 'id') {
      node.setAttribute(attributes[i].nodeName, attributes[i].value);
    }
  }
}

function getNodeIdentifierFromAttributes(node) {
  let partialKey,
      identifier = '';

  ['name','src','href'].forEach(attribute => {
    if ((partialKey = node.getAttribute(attribute)) !== null) {
      identifier += '|' + attribute + ':' + partialKey;
    }
  });

  return identifier.length ? identifier : null;
}

function getNodeIdentifier (node) {
  let identifier = '',
      partialKey;

  if (node.attributes === undefined) {
    return getNodeIdentifier(node.parentNode) + 
      '>' + [].slice.call(node.parentNode.childNodes).indexOf(node);
  }

  if ((partialKey = node.getAttribute('id')) !== null) {
    identifier = '#' + partialKey;
  } else if ((partialKey = getNodeIdentifierFromAttributes(node)) !== null) {
    identifier = partialKey;
  } else if ((partialKey = node.textContent) !== null) {
    identifier = '=' + partialKey.replace(/\s/gm,'');
  } else {
    identifier = '%' + Math.floor(Math.random() * 10000);
  }

  return node.tagName + identifier;
}

export default { update };

