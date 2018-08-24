'use strict';

class DetailedError extends Error {
  constructor(message, status, details, stack) {
    super(...arguments);
    this.message = message;
    this.stack = stack;
    this.status = status;
    this.details = details;
  }
}

class AlreadyExists extends DetailedError {
  constructor(varType, value) {
    super('already-exists', 409, { key: varType, value: value });
  }
}

class BadInput extends DetailedError {
  constructor(key, value) {
    super('bad-input', 406, { key: key, value: value });
  }
}

class Custom extends DetailedError {
  constructor(action, description, error) {
    super('custom-error', 500, { key: action, value: description }, error);
  }

  toString() {
    return `Error when trying ${this.details.key} ${this.details.value} (${this.stack.toString()})`;
  }
}
class Expired extends DetailedError {
  constructor(varName) {
    super('expired', 406, { key: varName });
  }
}

class Immutable extends DetailedError {
  constructor(varType) {
    super('immutable', 406, { key: varType });
  }
}

class MissingInput extends DetailedError {
  constructor(varName) {
    super('missing-input', 406, { key: varName });
  }
}

class NotFound extends DetailedError {
  constructor(type, id) {
    super('not-found', 404, { key: type, value: id });
  }

  toString() {
    return `${this.details.key} not Found: ${this.details.value}`;
  }
}

class NoPermissions extends DetailedError {
  constructor(actionName) {
    super('no-permissions', 401, { action: actionName });
  }
}

class SaveFailed extends DetailedError {
  constructor(varName, content, error) {
    super('save-failed', 500, { key: varName, value: content }, error);
  }
}

class System extends DetailedError {
  constructor(error, args, url) {
    super('system-error', 500, { args, error, url }, error);
  }
}

class TooLong extends DetailedError {
  constructor(varName, value, max = '?') {
    super('too-long', 406, { key: varName, value: value, max });
  }

  toString() {
    return `${this.details.key} is longer than ${this.details.max} (${
      this.details.value
    })`;
  }
}

class TooShort extends DetailedError {
  constructor(varName, value, min = '?') {
    super('too-short', 406, { key: varName, value: value, min });
  }

  toString() {
    return `${this.details.key} is shorter than ${this.details.min} (${
      this.details.value
    })`;
  }
}

class Unauthorized extends DetailedError {
  constructor() {
    super('unauthorized', 401);
  }
}

var Errors = {
  AlreadyExists,
  BadInput,
  Custom,
  Expired,
  Immutable,
  MissingInput,
  NotFound,
  NoPermissions,
  SaveFailed,
  System,
  TooLong,
  TooShort,
  Unauthorized
};

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
          errorList.push(new Errors.NotFound('controller not found', controller));
        }
      }
    }

    stack = stack.concat(Array.from(node.childNodes || []));
  }

  return errorList;
}

var DOMinion = { bind, update, map };

const delimiters = [{ start: '{{', end: '}}' }], // delimiters array as you switch to temporary delimiters and then revert back
  patterns = {
    templateAttribute: 'replace-with',
    template: new RegExp(
      '<template data-id="([\\s\\S]+?)">([\\s\\S]+?)</template>',
      'g'
    ),
    escape: new RegExp('[-\\[\\]\\/\\{\\}\\(\\)\\*\\+\\?\\.\\\\\\^$\\|]', 'gm'),
    voidElements: new RegExp('<(([a-zA-Z]+)[^<]*)/>', 'gm')
    // - /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/gm
  };

buildPatterns(delimiters[0].start, delimiters[0].end);

function buildPatterns(start, end) {
  // simple replace {{name}}
  patterns.std = new RegExp(start + '([^#]+?)' + end, 'g');

  // htmlReplace replace {{{name}}}
  patterns.htmlSafe = new RegExp(start + '{([^#]+?)}' + end, 'g');

  // translate the string {{#btn.ok}}
  patterns.lng = new RegExp(start + '#(.+?)' + end, 'g');

  // {{?showName}}{{name}}{{/showName}}
  patterns.if = new RegExp(
    start + '\\?(.+?)' + end + '([\\s\\S]+?)' + start + '[\\/$]\\1' + end,
    'g'
  );

  // {{?!hideName}}{{name}}{{/hideName}}
  patterns.ifNot = new RegExp(
    start + '\\?\\!(.+?)' + end + '([\\s\\S]+?)' + start + '\\/\\1' + end,
    'g'
  );

  // {{!--this is a comment--}}
  patterns.comment = new RegExp(start + '\\!--(.+?)--' + end, 'g');

  // loop {{user@users}} {{name}} {{/user@users}}
  patterns.loop = new RegExp(
    start +
      '([^@}]+?)@([\\s\\S]+?)(:([\\s\\S]+?))?' +
      end +
      '([\\s\\S]+?)' +
      start +
      '\\/\\1@\\2' +
      end,
    'g'
  );

  // subTemplate {{user:userTemplate}}
  patterns.inner = new RegExp(
    start + '\\@([\\s\\S]+?)' + end + '([\\s\\S]+?)' + start + '\\/\\1' + end,
    'g'
  );

  // temporarily replace delimiters (e.g. {{'startTag','endTag'}} ... '{{/'startTag','endTag'}})
  patterns.fix = new RegExp(
    start +
      "'([^'}]+?)','([\\s\\S]+?)'" +
      end +
      '([\\s\\S]+?)' +
      start +
      "\\/'\\1','\\2'" +
      end,
    'g'
  );
  patterns.quote = new RegExp("^'.*'$");
}

function render(templates, locale, data, templateName) {
  if (templates[templateName] === undefined) {
    throw new Errors.NotFound('template not found', templateName);
  }

  return populate(templates, locale, data, templates[templateName]);
}

function populate(templates, locale, data, string) {
  let item, smallDataSet;

  // 1. look for place where delimiters changed and process them first
  while ((item = patterns.fix.exec(string)) !== null) {
    let previousDelimiter = delimiters[delimiters.length - 1],
      delimiter = { start: escapeRegExp(item[1]), end: escapeRegExp(item[2]) };
    delimiters.push(delimiter);
    buildPatterns(delimiter.start, delimiter.end);
    string = string
      .split(item[0])
      .join(populate(templates, locale, data, item[3]));
    delimiters.pop();
    buildPatterns(previousDelimiter.start, previousDelimiter.end);
    patterns.fix.lastIndex = 0;
  }

  // 6. look for comments
  while ((item = find(patterns.comment, string)) !== null) {
    string = string.split(item[0]).join('');
  }

  // 2. look for sub-templates
  while ((item = find(patterns.inner, string)) !== null) {
    smallDataSet = getValue(templates, locale, data, item[1]);
    string = string
      .split(item[0])
      .join(populate(templates, locale, smallDataSet, item[2]));
  }

  // 3. look for loops
  while ((item = find(patterns.loop, string)) !== null) {
    let array = [],
      loop = getValue(templates, locale, data, item[2]),
      indexName = item[4],
      iterator,
      originalValue;

    if (Array.isArray(loop)) {
      iterator = item[1];

      // since we write to the main scope, which may have these variable,
      // we'll back them up
      originalValue = {
        element: data[iterator],
        idx: data[indexName]
      };

      for (let key in loop) {
        data[iterator] = loop[key];
        data[indexName] = key;
        array.push(populate(templates, locale, data, item[5]));
      }

      // restoring the original values -
      data[iterator] = originalValue.element;
      data[indexName] = originalValue.idx;
    } else if (loop !== undefined) {
      // loop is an object, loop through the main property
      if (loop[item[1]] !== undefined) {
        for (let key in loop[item[1]]) {
          let value = loop[item[1]][key];
          if (typeof val === 'object' && indexName !== undefined) {
            value[indexName] = key;
          }
          array.push(populate(templates, locale, value, item[5]));
        }
      } else {
        throw new Errors.BadInput('bad iterator', item[1]);
      }
    }

    string = string.split(item[0]).join(array.join(''));
  }

  // 4. look for negate conditions
  while ((item = find(patterns.ifNot, string)) !== null) {
    string = string
      .split(item[0])
      .join(!getValue(templates, locale, data, item[1]) ? item[2] : '');
  }

  // 5. look for conditions
  while ((item = find(patterns.if, string)) !== null) {
    string = string
      .split(item[0])
      .join(getValue(templates, locale, data, item[1]) ? item[2] : '');
  }

  // 6. look for an unescaped replacements
  while ((item = find(patterns.htmlSafe, string)) !== null) {
    string = string
      .split(item[0])
      .join(toString(getValue(templates, locale, data, item[1])));
  }
  
  // 7. look for standard replacements
  while ((item = find(patterns.std, string)) !== null) {
    string = string
      .split(item[0])
      .join(escapeHtml(toString(getValue(templates, locale, data, item[1]))));
  }

  // 8. look for translations
  while ((item = find(patterns.lng, string)) !== null) {
    string = string.split(item[0]).join(translate(locale, item[1]));
  }

  return string;
}

function escapeHtml(unsafe) {
    return unsafe.replace(/</g, '&lt;');
        // for whatever readon, xmldom.DOMParser.parseFromString convert &gt; to >
        // so it causes a mess and better leave it unescaped
        // .replace(/&/g, '&amp;')
        // .replace(/"/g, '&quot;')
        // .replace(/'/g, '&#039;');
        //         .replace(/>/g, '&gt;')
 }

function translate(locale, value) {
  var translated = locale[value];
  if (typeof translated !== 'undefined') {
    return toString(translated);
  }

  return toString(value.substr(value.indexOf('.') + 1));
}

function toString(value) {
  if (typeof value === 'function') {
    return value();
  } else if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value;
}

function getValue(templates, locale, data, key) {
  let value = false,
    keyAndTemplate = key.split(':'),
    templateName = keyAndTemplate[1],
    nested;

  key = keyAndTemplate[0];

  if (key === '.') {
    value = data;
  } else if (data === undefined) {
    return undefined;
  } else {
    nested = key.split('.');
    if (data.hasOwnProperty(nested[0])) {
      value = data[nested.pop()];
    } else if (nested[0] === '.') {
      value = data;
    } else {
      value = '';
    }

    nested.forEach(key => {
      if (value.hasOwnProperty(key)) {
        value = value[key];
      } else {
        value = '';
      }
    });
  }

  if (templateName) {
    if (templateName.match(patterns.quote)) {
      templateName = templateName.replace(/'/g, '');
    } else {
      templateName = getValue(templates, locale, data, templateName);
    }
    // this might end up with no templateName, in which case we'll return value
  }

  if (templateName) {
    if (key !== '.') {
      value = data[key];
    }

    return render(templates, locale, value, templateName);
  }

  return value;
}

function escapeRegExp(string) {
  return string.replace(patterns.escape, '\\$&');
}

function find(pattern, string) {
  pattern.lastIndex = 0;
  return pattern.exec(string);
}

function fixVoidElements(string) {
  // void elements are xml elements with no children (e.g. <br />) and usually
  // represented with no closing tag. HTML allows only certain tags to be void
  // so we need to fix all the rest
  const pattern = patterns.voidElements,
    legalVoidElements = [
      'area',
      'base',
      'br',
      'col',
      'embed',
      'hr',
      'img',
      'input',
      'link',
      'meta',
      'param',
      'source',
      'track',
      'wbr'
    ];

  let match;

  pattern.lastIndex = 0;

  while ((match = pattern.exec(string)) !== null) {
    if (!legalVoidElements.includes(match[2])) {
      string = string.split(match[0]).join(`<${match[1]}></${match[2]}>`);
    }
  }

  return string;
}

class HTMLCompiler {
  /**
   * Use either the browser parser/serializer or XMLDOM from `npm i xmldom`
   * e.g. import { DOMParser, XMLSerializer } from 'xmldom';
   *      import { HTMLCompiler } from 'HTMLCompiler';
   *  let HtmlCompiler = new HTMLCompiler(new DOMParser(), new XMLSerializer());
   * @param {DOMParser} domParser
   * @param {XMLSerializer} xmlSerializer
   */
  constructor(domParser, xmlSerializer) {
    if (domParser === undefined) {
      throw new Errors.MissingInput('domParser');
    }

    if (xmlSerializer === undefined) {
      throw new Errors.MissingInput('xmlSerializer');
    }

    this.domParser = domParser;
    this.xmlSerializer = xmlSerializer;
  }

  /** return a (stringified) xml document of the seedString, with the data compiled in
   * @param {JSON} JSON Object with [key->strings representing xml elements]
   * @param {JSON} locale JSON object with [key->strings representing strings in particular language]
   * @param {JSON} data JSON obect with contextual data
   * @param {DOMNode} targetNode
   *
   * It will first try to render the seedString, then convert it to xml and look for children that needs to be replaced
   * The string of every child needing to be replaced will also be rendered first, recursively.
   */
  compile(templates, locale, data, targetNode) {
    if (targetNode.tagName) {
      let tag, renderedTemplate, compileNode;

      if (targetNode.childNodes !== null) {
        Array.from(targetNode.childNodes).forEach(childNode =>
          this.compile(templates, locale, data, childNode)
        );
      }

      if ((tag = targetNode.getAttribute(patterns.templateAttribute)) !== '') {
        renderedTemplate = render(
          templates,
          locale,
          data,
          getValue(templates, locale, data, tag)
        );
        compileNode = this.domParser.parseFromString(renderedTemplate);
        targetNode.parentNode.replaceChild(compileNode, targetNode);
      }
    }

    return targetNode;
  }

  /** Returns a (stringified) xml document of the seedString, with the data compiled in
   * @param {JSON} JSON Object with [key->strings representing xml elements]
   * @param {JSON} locale JSON object with [key->strings representing strings in particular language]
   * @param {JSON} data JSON obect with contextual data
   * @param {String} seedString the original sting that is being parsed
   *
   * It will first try to render the seedString, then convert it to xml and look for children that needs to be replaced
   * The string of every child needing to be replaced will also be rendered first, recursively.
   */
  compileToString(templates, locale, data, seedString) {
    let compiledXML = this.compileToXML(templates, locale, data, '<html-compiler>'+seedString+'</html-compiler>');

    return fixVoidElements(this.xmlSerializer.serializeToString(compiledXML)
      .replace(/^<html-compiler>(.*)<\/html-compiler>$/,'$1'));
  }

  compileToXML(templates, locale, data, seedString) {
    let renderedSeedString = populate(templates, locale, data, seedString);

    return this.compile(
      templates,
      locale,
      data,
      this.domParser.parseFromString(renderedSeedString)
    );
  }
}

var colors = {
  Reset: '\x1b[0m',
  Bright: '\x1b[1m',
  Dim: '\x1b[2m',
  Underscore: '\x1b[4m',
  Blink: '\x1b[5m',
  Reverse: '\x1b[7m',
  Hidden: '\x1b[8m',

  FgBlack: '\x1b[30m',
  FgRed: '\x1b[31m',
  FgGreen: '\x1b[32m',
  FgYellow: '\x1b[33m',
  FgBlue: '\x1b[34m',
  FgMagenta: '\x1b[35m',
  FgCyan: '\x1b[36m',
  FgWhite: '\x1b[37m',

  BgBlack: '\x1b[40m',
  BgRed: '\x1b[41m',
  BgGreen: '\x1b[42m',
  BgYellow: '\x1b[43m',
  BgBlue: '\x1b[44m',
  BgMagenta: '\x1b[45m',
  BgCyan: '\x1b[46m',
  BgWhite: '\x1b[47m',

  sets: [
    ['bgBlack', 'white'],
    ['bgBlack', 'red'],
    ['bgBlack', 'green'],
    ['black', 'blue'],
    ['bgBlack', 'yellow'],
    ['bgBlack', 'magenta'],
    ['bgBlack', 'cyan'],
    ['bgWhite', 'red'],
    ['bgWhite', 'green'],
    ['bgWhite', 'blue'],
    ['bgWhite', 'magenta'],
    ['bgWhite', 'cyan'],
    ['bgWhite', 'black']
  ],
};

var index = { colors, Errors, HtmlCompiler: HTMLCompiler, DOMinion };

module.exports = index;
