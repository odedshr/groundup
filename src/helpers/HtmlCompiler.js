import errors from '../etc/errors.js';
  
  const delimiters = [{ start: '{{', end: '}}' }], // delimiters array as you switch to temporary delimiters and then revert back
        patterns = {
          templateAttribute: 'replace-with',
          template: new RegExp('<template data-id="([\\s\\S]+?)">([\\s\\S]+?)</template>','g'),
          escape: new RegExp('[\-\\[\\]\\/\\{\\}\\(\\)\\*\\+\\?\\.\\\\\\^\$\\|]','gm'),
          voidElements: new RegExp('<(([a-zA-Z]+)[^<]*)\/>','gm')
          // - /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/gm
        };

  buildPatterns(delimiters[0].start, delimiters[0].end);
        
  function buildPatterns(start, end) {
    // simple replace {{name}}
    patterns.std = new RegExp(start + '([^#]+?)' + end, 'g');
    
    // translate the string {{#btn.ok}}
    patterns.lng = new RegExp(start+'#(.+?)' + end, 'g');
    
    // {{?showName}}{{name}}{{/showName}}
    patterns.if = new RegExp(start+'\\?(.+?)' + end + '([\\s\\S]+?)' + start + '[\\/$]\\1' + end, 'g');
    
    // {{?!hideName}}{{name}}{{/hideName}}
    patterns.ifNot = new RegExp(start+'\\?\\!(.+?)' + end + '([\\s\\S]+?)' + start + '\\/\\1' + end, 'g');
    
    // {{!--this is a comment--}}
    patterns.comment = new RegExp(start+'\\!--(.+?)--' + end,'g');

    // loop {{user@users}} {{name}} {{/user@users}}
    patterns.loop = new RegExp(start+'([^@}]+?)@([\\s\\S]+?)(:([\\s\\S]+?))?' + end + '([\\s\\S]+?)' + start + '\\/\\1@\\2' + end, 'g');
    
    // subTemplate {{user:userTemplate}}
    patterns.inner = new RegExp(start+'\\@([\\s\\S]+?)' + end + '([\\s\\S]+?)' + start + '\\/\\1' + end, 'g');
    
    // temporarily replace delimiters (e.g. {{'startTag','endTag'}} ... '{{/'startTag','endTag'}})
    patterns.fix = new RegExp(start+'\'([^\'}]+?)\',\'([\\s\\S]+?)\'' + end + '([\\s\\S]+?)' + start + '\\/\'\\1\',\'\\2\'' + end, 'g');
    patterns.quote = new RegExp('^\'.*\'$');
  }

  function render (templates, locale, data, templateName) {
    if (templates[templateName] === undefined) {
      throw errors.notFound('template not found', templateName);
    }

    return populate(templates, locale, data, templates[templateName]);
  }

  function populate (templates, locale, data, string) {
    let item, smallDataSet;

    // 1. look for place where delimiters changed and process them first
    while ((item = patterns.fix.exec(string)) !== null) {
      let previousDelimiter = delimiters[delimiters.length-1],
          delimiter = { start: escapeRegExp(item[1]), end: escapeRegExp(item[2]) };
      delimiters.push(delimiter);
      buildPatterns(delimiter.start, delimiter.end);
      string = string.split(item[0])
                     .join( populate(templates, locale, data, item[3]) );
      delimiters.pop();
      buildPatterns(previousDelimiter.start, previousDelimiter.end);
      patterns.fix.lastIndex = 0;
    }

    // 6. look for comments
    while ((item = find (patterns.comment, string)) !== null) {
      string = string.split(item[0]).join('');
    }

    // 2. look for sub-templates
    while ((item = find (patterns.inner, string)) !== null) {
      smallDataSet = getValue(templates, locale, data, item[1]);
      string = string.split(item[0])
                     .join( populate(templates, locale, smallDataSet, item[2]));
    }

    // 3. look for loops
    while ((item = find (patterns.loop, string)) !== null) {
      let array = [],
          loop = getValue(templates, locale, data, item[2]),
          indexName = item[4],
          iterator,
          originalValue;

      if (Array.isArray(loop)) {
        iterator = item[1];

        // since we write to the main scope, which may have these variable,
        // we'll back them up
        originalValue = { element: data[iterator],
                          idx: data[indexName] };

        for (let key in loop) {
          data[iterator] = loop[key];
          data[indexName] = key;
          array.push (populate(templates, locale, data, item[5]));
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
          throw errors.badInput('bad iterator', item[1]);
        }
      }

      string = string.split(item[0]).join( array.join(''));
    }
    
    // 4. look for negate conditions
    while ((item = find (patterns.ifNot, string)) !== null) {
      string = string.split(item[0])
                     .join( !getValue(templates, locale, data,item[1]) ? item[2] : '' );
    }

    // 5. look for conditions
    while ((item = find (patterns.if, string)) !== null) {
      string = string.split(item[0])
                     .join( getValue(templates, locale, data,item[1]) ? item[2] : '' );
    }

    // 6. look for standard replacements
    while ((item = find (patterns.std, string)) !== null) {
      string = string.split(item[0])
                     .join( toString(getValue(templates, locale, data,item[1])));
    }

    // 7. look for translations
    while ((item = find (patterns.lng, string)) !== null) {
      string = string.split(item[0])
                     .join(translate(locale, item[1]));
    }

    return string;
  }

  function translate (locale, value) {
    var translated = locale[value];
    if ((typeof translated !== 'undefined')) {
      return toString(translated);
    }

    return toString(value.substr(value.indexOf('.') + 1));
  }

  function toString (value) {
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
        templateName = templateName.replace(/'/g,'');
      } else {
        templateName = getValue(templates, locale, data, templateName);
      }
      // this might end up with no templateName, in which case we'll return value
    }

    if (templateName) {
      if (key !== '.') {
        value = data[key];
      }

      return render(templates, locale, value ,templateName);
    }

    return value;
  }

  function escapeRegExp (string) {
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
          legalVoidElements = [ 'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 
            'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
    
    let match;
    
    pattern.lastIndex = 0;

    while ((match = pattern.exec(string)) !== null) {
      if (!legalVoidElements.includes(match[2])) {
        string = string.split(match[0])
          .join( `<${match[1]}></${match[2]}>` );
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
      throw errors.missingInput('domParser');
    }

    if (xmlSerializer === undefined) {
      throw errors.missingInput('xmlSerializer');
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
        Array.from(targetNode.childNodes)
          .forEach(childNode => this.compile(templates, locale, data, childNode));
      }

      if ((tag = targetNode.getAttribute(patterns.templateAttribute)) !== '') {
        renderedTemplate = render(templates, locale, data, 
                                  getValue(templates, locale, data,tag));
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
  compileToString (templates, locale, data, seedString) {
    let compiledXML = this.compileToXML(templates, locale, data, seedString);

    if (compiledXML.childNodes[0].tagName === undefined) {
      // it looks like xml but it's actually simple text
      return compiledXML.childNodes[0].data;
    }
    
    return fixVoidElements(this.xmlSerializer.serializeToString(compiledXML));
  }

  compileToXML(templates, locale, data, seedString) {
    let renderedSeedXML = populate(templates, locale, data, seedString);

    return this.compile(templates, locale, data, this.domParser.parseFromString(renderedSeedXML));
  }
}

export default HTMLCompiler;