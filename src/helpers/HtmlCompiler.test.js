const assert = require('assert'),
  xmldom = require('xmldom'),
  HtmlCompiler = require('../../.bin/groundup.js').HtmlCompiler,
  html = new HtmlCompiler(new xmldom.DOMParser(), new xmldom.XMLSerializer());

describe('html compiler', () => {
  describe('constructor', () => {
    it('should fail on missing domParser', () => {
      assert.throws(() => new HtmlCompiler(), Error);
    });

    it('should fail on missing XMLSerializer', () => {
      assert.throws(() => new HtmlCompiler(new xmldom.DOMParser()), Error);
    });

    it('should create a new compiler', () => {
      let html = new HtmlCompiler(
        new xmldom.DOMParser(),
        new xmldom.XMLSerializer()
      );
      assert.equal(
        JSON.stringify(Object.keys(html)),
        JSON.stringify(['domParser', 'xmlSerializer'])
      );
    });
  });

  describe('html.compileToXML', () => {
    it('should return simple xml', () => {
      let result = html.compileToXML({}, {}, {}, '<div>simple text</div>');
      assert.equal(result.toString(), '<div>simple text</div>');
    });
  });

  describe('html.compileToString', () => {
    it('should return simple texts', () => {
      let result = html.compileToString({}, {}, {}, 'simple text');
      assert.equal(result, 'simple text');
    });

    it('return simple xml', () => {
      let result = html.compileToString({}, {}, {}, '<div>simple</div>');
      assert.equal(result, '<div>simple</div>');
    });

    it('return empty xml', () => {
      let result = html.compileToString({}, {}, {}, '<div></div>');
      assert.equal(result, '<div></div>');
    });

    it('return xml with void element', () => {
      let result = html.compileToString({}, {}, {}, '<br />');
      assert.equal(result, '<br/>');
    });

    it('return the right template', () => {
      let result = html.compileToString(
        { template: '<div>my template</div>' },
        {},
        {},
        "{{.:'template'}}"
      );
      assert.equal(result, '<div>my template</div>');
    });

    it('return throw an Error if not found', () => {
      assert.throws(
        () =>
          html.compileToString(
            { template: '<div>my template</div>' },
            {},
            {},
            "{{.:'template2'}}"
          ),
        Error
      );
    });
  });

  describe('html.compile transformations', () => {
    it('should return translated texts', () => {
      let result = html.compileToString(
        {},
        { hello: 'hola' },
        {},
        '{{#hello}} world'
      );
      assert.equal(result, 'hola world');
    });

    it('should return a variable', () => {
      let result = html.compileToString(
        {},
        {},
        { name: 'world' },
        'Hello {{name}}'
      );
      assert.equal(result, 'Hello world');
    });

    it('should iterate a list of items', () => {
      let result = html.compileToString(
        {},
        {},
        { beatles: { beatle: ['Paul', 'John', 'Ringo', 'George'] } },
        '{{beatle@beatles}}{{.}}; {{/beatle@beatles}}'
      );
      assert.equal(result, 'Paul; John; Ringo; George; ');
    });

    it('should fail iterating a list with wrong identifier', () => {
      assert.throws(
        () =>
          html.compileToString(
            {},
            {},
            { beatles: { beatle: ['Paul', 'John', 'Ringo', 'George'] } },
            '{{name@beatles}}{{.}}; {{/name@beatles}}'
          ),
        Error
      );
    });

    it('should iterate a straightforward array', () => {
      let result = html.compileToString(
        {},
        {},
        { names: ['Paul', 'John', 'Ringo', 'George'] },
        '{{name@names}}{{name}}; {{/name@names}}'
      );
      assert.equal(result, 'Paul; John; Ringo; George; ');
    });

    it('should use conditionals', () => {
      let data = { showName: true, name: 'what' };
      assert.equal(
        html.compileToString(
          {},
          {},
          data,
          'my name is {{?showName}}{{name}}{{/showName}}'
        ),
        'my name is what'
      );

      data.showName = false;
      assert.equal(
        html.compileToString(
          {},
          {},
          data,
          'my name is {{?showName}}{{name}}{{/showName}}'
        ),
        'my name is '
      );
    });

    it('should use negate-conditionals', () => {
      let data = { showName: true, name: 'what' };
      assert.equal(
        html.compileToString(
          {},
          {},
          data,
          'my name is {{?!showName}}{{name}}{{/showName}}'
        ),
        'my name is '
      );

      data.showName = false;
      assert.equal(
        html.compileToString(
          {},
          {},
          data,
          'my name is {{?!showName}}{{name}}{{/showName}}'
        ),
        'my name is what'
      );
    });

    it('should return translated texts', () => {
      let result = html.compileToString(
        {},
        {},
        { value1: 'aa', value2: 'bb', value3: 'cc' },
        "{{value1}}{{'[',']'}}[value2]{{/'[',']'}}{{value3}}"
      );
      assert.equal(result, 'aabbcc');
    });

    it('should ignore comments', () => {
      let result = html.compileToString(
        {},
        {},
        {},
        'hello {{!--This is a comment--}}world'
      );
      assert.equal(result, 'hello world');
    });

    it('should ignore comments with internal code', () => {
      let result = html.compileToString(
        {},
        {},
        {
          foo: () => {
            throw new Error("this code shouldn't have run");
          }
        },
        'hello {{!--This is a {{foo}}--}}world'
      );
      assert.equal(result, 'hello world');
    });
  });
});
