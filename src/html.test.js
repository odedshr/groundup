const assert = require('assert'),
  html = require('./html.js');

describe('html compiler', () => {
  describe('html.flattenHTML', () => {
    it('should get html file content with its imports embeded', done => {
      html.getFlatten('./tests/file1.html')
      .then(html => {
        assert.equal(html, '<html>\n  <head>\n    <style>\n  body {\n    color: red;\n  }\n</style>\n  </head>\n</html>');
        done();
      })
      .catch(done);
    });

    it('should get handle subfolders bravely', done => {
      html.getFlatten('./tests/file2.html')
      .then(html => {
        assert.equal(html, '<html>\n  <head>\n    <style>\n  body {\n    color: blue;\n  }\n</style>\n  </head>\n</html>');
        done();
      })
      .catch(done);
    });
  });

  describe('html.minify', () => {
    it('should remove all extra spaces', done => {
      html.minify('<html>\n  <head class="bla bla">\n    <style class="moo">\n  body {\n    color: blue;\n  }\n</style>\n  </head>\n</html>')
        .then(html => {
          assert.equal(html, '<html>\n<head class="bla bla">\n<style class=moo>body{color:#00f}</style>\n</head>\n</html>');
          done();
        })
        .catch(done);
    });
  });
});