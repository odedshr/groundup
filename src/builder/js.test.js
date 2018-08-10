const assert = require('assert'),
  js = require('../../.bin/builder.js').js;

describe('builder.javascript', () => {
  describe('js.mapFile', () => {
    it('should get map file and its dependencies', done => {
      js.mapFile('./tests/resources/file1.js')
        .then(output => assert.equal(
          JSON.stringify(output),
          '["./tests/resources/file1.js","./tests/resources/file1.1.js"]'
        ))
        .then(done);
    });
  });

  describe('js.loadFile', () => {
    it('should get js file content with its imports embeded', done => {
      js.loadFile('./tests/resources/file1.js')
        .then(output => assert.equal(
          output.content.replace(/    /g, ''),
          `'use strict';\n\nObject.defineProperty(exports, '__esModule', { value: true });\n\nlet foo = 2,\nbar = 3;\n\nfunction test() {\nconsole.log(foo + bar);\n}\n\nvar file1_1 = /*#__PURE__*/Object.freeze({\ntest: test\n});\n\nexports.child = file1_1;\n`
        ))
        .then(done);
    });

    it('should get js file content with its imports embeded', done => {
      js.loadFile('./tests/resources/file1.js')
        .then(output => {
          assert.equal(output.files.length, 2);
          assert.equal(
            output.files[1].replace(process.cwd(), '.'),
            './tests/resources/file1.js'
          );
        })
        .then(done);
    });
  });

  describe('css.transpile', () => {
    it('should transpile es2015 to old javascript code', done => {
      js.transpile('let foo = (a,b) => a + b;')
        .then(css => assert.equal(
          css,
          '"use strict";\n\nvar foo = function foo(a, b) {\n  return a + b;\n};'
        ))
        .then(done);
    });

    it('should transpile es2015 to old javascript code and minify it', done => {
      js.transpile('let foo = (a,b) => a + b;', true)
        .then(css => assert.equal(
          css,
          '"use strict";var foo=function foo(a,b){return a+b};'
        ))
        .then(done);
    });

    it('should refuse to transpile bad code', done => {
      js.transpile('let foo = (a,b => a + b;')
        .then(
          () => assert.fail('should have failed'),
          error => assert.equal(
            error.message,
            'unknown: Unexpected token, expected , (1:23)'
          )
        )
        .then(done);
    });
  });

  describe('css.uglify', () => {
    it('should uglify code', done => {
      js.minify(
        '"use strict";\n\nvar foo = function foo(a, b) {\n  return a + b;\n};'
      )
        .then(css => assert.equal(css, '"use strict";var foo=function(r,t){return r+t};'))
        .then(done);
    });

    it('should refuse to uglify bad code', done => {
      js.minify(
        '"use strict";\n\nvar foo = function foo(a, b {\n  return a + b;\n};'
      )
        .then(
          () => assert.fail('should have failed'),
          error => assert.equal(
            error.message,
            'Unexpected token punc «{», expected punc «,»'
          )
        )
        .then(done);
    });
  });

  describe('js.compile', () => {
    it('should compile, transpile and uglify a file', done => {
      js.compile('./tests/./resources/file1.js')
        .then(output => assert.equal(
          output.content,
          '"use strict";Object.defineProperty(exports,"__esModule",{value:!0});var foo=2,bar=3;function test(){console.log(foo+bar)}var file1_1=Object.freeze({test:test});exports.child=file1_1;'
        ))
        .then(done);
    });

    it('should fail to compile bad js file', done => {
      js.onError(err =>
        assert.equal(err.toString(), "Error when trying loadFile ./tests/./resources/file-with-error.js (Error: Identifier \'x\' has already been declared)")
      );
      js.compile('./tests/./resources/file-with-error.js')
        .then(output => assert.equal(output.content, ''))
        .then(done);
    });

    it('should compile js file content with its external', done => {
      js.compile({ 
        source: './tests/resources/file-with-external.js', 
        external: 'vue.js'
      })
        .then(output => assert.equal(
          output.content,
          '"use strict";var _typeof="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(o){return typeof o}:function(o){return o&&"function"==typeof Symbol&&o.constructor===Symbol&&o!==Symbol.prototype?"symbol":typeof o};function _interopDefault(o){return o&&"object"===(void 0===o?"undefined":_typeof(o))&&"default"in o?o.default:o}var vue=_interopDefault(require("vue.js"));console.log(vue);'
        ))
        .then(done);
    });

    it('should compile js file content with external from package.json', done => {
      js.compile('./tests/resources/file-with-external2.js')
        .then(output => assert.equal(
          output.content,
          '"use strict";var _typeof="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(o){return typeof o}:function(o){return o&&"function"==typeof Symbol&&o.constructor===Symbol&&o!==Symbol.prototype?"symbol":typeof o};function _interopDefault(o){return o&&"object"===(void 0===o?"undefined":_typeof(o))&&"default"in o?o.default:o}var rollup=_interopDefault(require("rollup"));console.log(rollup);'
        ))
        .then(done);
    });
  });
});
