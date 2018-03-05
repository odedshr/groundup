const assert = require('assert'),
  js = require('./js.js');

describe('javascript compiler', () => {
  describe('html.mapFile', () => {
    it('should get map file and its dependencies', done => {
      js.mapFile('./tests/file1.js')
      .then(output => {
        assert.equal(JSON.stringify(output), '["./tests/file1.js","./tests/./file1.1.js"]');
        done();
      })
      .catch(done);
    });
  });
  
  describe('js.loadFile', () => {
    it('should get js file content with its imports embeded', done => {
      js.loadFile('./tests/file1.js')
      .then(output => {
        assert.equal(output.content, '!function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{configurable:!1,enumerable:!0,get:r})},n.r=function(e){Object.defineProperty(e,"__esModule",{value:!0})},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=1)}([function(e,t){e.exports={test(){console.log(5)}}},function(e,t,n){const r=n(0);e.exports={child:r}}]);');
        done();
      })
      .catch(done);
    });

    it('should get css file content with its imports embeded', done => {
      js.loadFile('./tests/file1.js')
      .then(output => {
        assert.equal(output.files.length, 2);
        assert.equal(output.files[1].replace(process.cwd(), ''), '/tests/file1.js');
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
      js.compile('./tests/file1.js')
      .then(output => {
        assert.equal(output.content, '"use strict";!function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{configurable:!1,enumerable:!0,get:r})},n.r=function(e){Object.defineProperty(e,"__esModule",{value:!0})},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=1)}([function(e,t){e.exports={test:function(){console.log(5)}}},function(e,t,n){var r=n(0);e.exports={child:r}}]);');
        done();
      })
      .catch(done);
    });
  });
});