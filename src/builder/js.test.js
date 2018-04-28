const assert = require('assert'),
  js = require('./js.js');

describe('javascript compiler', () => {
  describe('js.mapFile', () => {
    it('should get map file and its dependencies', done => {
      js.mapFile('./tests/resources/file1.js')
      .then(output => {
        assert.equal(JSON.stringify(output), '["./tests/resources/file1.js","./tests/resources/file1.1.js"]');
        done();
      })
      .catch(done);
    });
  });
  
  describe('js.loadFile', () => {
    it('should get js file content with its imports embeded', done => {
      js.loadFile('./tests/resources/file1.js')
      .then(output => {
        assert.equal(output.content.replace(/    /g,''), `'use strict';\n\nObject.defineProperty(exports, '__esModule', { value: true });\n\nlet foo = 2,\nbar = 3;\n\nfunction test() {\nconsole.log(foo + bar);\n}\n\nvar file1_1 = /*#__PURE__*/Object.freeze({\ntest: test\n});\n\nexports.child = file1_1;\n`);
        done();
      })
      .catch(done);
    });

    it('should get css file content with its imports embeded', done => {
      js.loadFile('./tests/resources/file1.js')
      .then(output => {
        assert.equal(output.files.length, 2);
        assert.equal(output.files[1].replace(process.cwd(), '.'), './tests/resources/file1.js');
        done();
      })
      .catch(done);
    });
  });

  describe('css.transpile', () => {
    it('should transpile es2015 to old javascript code', done => {
      js.transpile('let foo = (a,b) => a + b;')
        .then(css => {
          assert.equal(css, '"use strict";\n\nvar foo = function foo(a, b) {\n  return a + b;\n};');
          done();
        })
        .catch(done);
    });

    it('should transpile es2015 to old javascript code and minify it', done => {
      js.transpile('let foo = (a,b) => a + b;', true)
        .then(css => {
          assert.equal(css, '"use strict";var foo=function foo(a,b){return a+b};');
          done();
        })
        .catch(done);
    });
  });

  describe('css.uglify', () => {
    it('should uglify code', done => {
      js.minify('"use strict";\n\nvar foo = function foo(a, b) {\n  return a + b;\n};')
        .then(css => {
          assert.equal(css, '"use strict";var foo=function(r,t){return r+t};');
          done();
        })
        .catch(done);
    });
  });

  describe('js.compile', () => {
    it('should compile, transpile and uglify a file', done => {
      js.compile('./tests/./resources/file1.js')
      .then(output => {
        assert.equal(output.content, '"use strict";Object.defineProperty(exports,"__esModule",{value:!0});var foo=2,bar=3;function test(){console.log(foo+bar)}var file1_1=Object.freeze({test:test});exports.child=file1_1;');
        done();
      })
      .catch(done);
    });

    it('should fail to compile bad js file', done => {
      js.compile('./tests/./resources/file-with-error.js')
      .then(output => {
        assert.fail('it should have thrown an error');
      }, error => {
        assert.equal(error.message, 'Identifier \'x\' has already been declared');
        done();
      })
      .catch(done);
    });
  });
});