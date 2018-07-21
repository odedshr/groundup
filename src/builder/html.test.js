const assert = require('assert'),
  html = require('../../dist/builder.js').html;

describe('builder.html', () => {
  describe('html.mapFile', () => {
    it('should get map file and its dependencies', done => {
      html
        .mapFile('./tests/resources/file2.html')
        .then(output => {
          assert.equal(
            JSON.stringify(output),
            '["./tests/resources/file2.html","./tests/resources/subfolder/file2.1.html"]'
          );
        })
        .then(done);
    });
  });

  describe('html.loadFile', () => {
    it('should get 2 html files', done => {
      html
        .loadFile('./tests/resources/file1.html')
        .then(output => {
          assert.equal(output.files.length, 2);
          assert.equal(output.files[1], './tests/resources/file1.1.html');
        })
        .then(done);
    });

    it('should get html file content with its imports embeded', done => {
      html
        .loadFile('./tests/resources/file1.html')
        .then(output => {
          assert.equal(
            output.content,
            '<html>\n  <head>\n    <style>\n  body {\n    color: red;\n  }\n</style>\n  </head>\n</html>'
          );
        })
        .then(done);
    });

    it('should get handle subfolders bravely', done => {
      html
        .loadFile('./tests/resources/file2.html')
        .then(output => {
          assert.equal(
            output.content,
            '<html>\n  <head>\n    <style>\n  body {\n    color: blue;\n  }\n</style>\n  </head>\n</html>'
          );
        })
        .then(done);
    });
  });

  describe('html.minify', () => {
    it('should remove all extra spaces', done => {
      html
        .minify(
          '<html>\n  <head class="bla bla">\n    <style class="moo">\n  body {\n    color: blue;\n  }\n</style>\n  </head>\n</html>'
        )
        .then(html => {
          assert.equal(
            html,
            '<html>\n<head class="bla bla">\n<style class=moo>body{color:#00f}</style>\n</head>\n</html>'
          );
        })
        .then(done);
    });
  });

  describe('html.compile', () => {
    it('should compile, minify a file', done => {
      html
        .compile('./tests/resources/file1.html')
        .then(output => {
          assert.equal(
            output.content,
            '<html>\n<head>\n<style>body{color:red}</style>\n</head>\n</html>'
          );
        })
        .then(done);
    });
  });
});
