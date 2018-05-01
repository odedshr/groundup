const assert = require('assert'),
  css = require('../../bin/builder.js').css;

describe('css builder', () => {
  describe('css.mapFile', () => {
    it('should get map file and its dependencies', done => {
      css.mapFile('./tests/resources/file2.scss')
      .then(output => {
        assert.equal(JSON.stringify(output), '["./tests/resources/file2.scss","./tests/resources/subfolder/file2.1.scss"]');
        done();
      })
      .catch(done);
    });
  });

  describe('css.loadFile', () => {
    it('should get css file content with its imports embeded', done => {
      css.loadFile('./tests/resources/file1.scss')
      .then(output => {
        assert.equal(output.content, 'h2 { color: green; }\n\nh1 { color: red; }');
        done();
      })
      .catch(done);
    });

    it('should get handle subfolders bravely', done => {
      css.loadFile('./tests/resources/file2.scss')
      .then(output => {
        assert.equal(output.content, 'h4 { color: green; }\n\nh3 { color: red; }');
        done();
      })
      .catch(done);
    });
  });

  describe('css.sass', () => {
    it('should resolve nesting', done => {
      css.sass('body{ color: red; div { color: blue}}')
      .then(css => {
        assert.equal(css, 'body {\n  color: red; }\n  body div {\n    color: blue; }\n');
        done();
      })
      .catch(done);
    });

    it('should resolve variables', done => {
      css.sass('$red: red; body{ color: $red;}')
      .then(css => {
        assert.equal(css, 'body {\n  color: red; }\n');
        done();
      })
      .catch(done);
    });
  });

  describe('css.prefix', () => {
    it('should add browser\'s custom prefixes', done => {
      css.prefix('::placeholder {color: gray;}')
        .then(css => {
          assert.equal(css, '::-webkit-input-placeholder {color: gray;}\n:-ms-input-placeholder {color: gray;}\n::-ms-input-placeholder {color: gray;}\n::placeholder {color: gray;}');
          done();
        })
        .catch(done);
    });
  });

  describe('css.minify', () => {
    it('should remove all extra spaces', done => {
      css.minify('body {\n\tbackground: red; \n\t}\n')
        .then(css => {
          assert.equal(css, 'body{background:red}');
          done();
        })
        .catch(done);
    });

    it('should remove all duplicates', done => {
      css.minify('div { background: blue; color: red; } div { font-color: blue; color: red;} div { background: blue;}')
        .then(css => {
          assert.equal(css, 'div{background:#00f;font-color:#00f;color:red}');
          done();
        })
        .catch(done);
    });
  });

  describe('css.compile', () => {
    it('should compile, prefix and minify a file', done => {
      css.compile('./tests/resources/file1.scss')
      .then(output => {
        assert.equal(output.content, 'h2{color:green}h1{color:red}');
        done();
      })
      .catch(done);
    });
  });
});