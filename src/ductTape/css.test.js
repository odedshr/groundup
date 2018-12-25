const assert = require('assert'),
  css = require('../../.bin/ductTape.js').css;

describe('ductTape.css', () => {
  describe('css.mapFile', () => {
    it('should get map file and its dependencies', () => {
      const map = css.mapFile('./tests/resources/file2.less');

      assert.equal(
        JSON.stringify(map),
        '["./tests/resources/file2.less","./tests/resources/subfolder/file2.1.less"]'
      );
    });

    it('should ignore missing dependencies', () => {
      css.onError(err =>
        assert.equal(
          err.details.value,
          "./tests/resources/import-doesn't-exists.less"
        )
      );

      const map = css.mapFile('./tests/resources/file2.less');
      assert.equal(
        JSON.stringify(map),
        '["./tests/resources/file2.less","./tests/resources/subfolder/file2.1.less"]'
      );
    });
  });

  describe('css.loadFile', () => {
    it('should get css file content with its imports embeded', done => {
      css
        .loadFile('./tests/resources/file1.less')
        .then(output => {
          assert.equal(
            output.content,
            'h2 { color: green; }\n\nh1 { color: red; }'
          );
          done();
        })
        .catch(done);
    });

    it('should get handle subfolders bravely', done => {
      css
        .loadFile('./tests/resources/file2.less')
        .then(output => {
          assert.equal(
            output.content,
            'h4 { color: green; }\n\nh3 { color: red; }'
          );
          done();
        })
        .catch(done);
    });

    it('should ignore missing dependenceis', done => {
      css.onError(err =>
        assert.equal(
          err.details.value,
          "./tests/resources/import-doesn't-exists.less"
        )
      );
      css
        .loadFile('./tests/resources/missing-import.less')
        .then(output => {
          assert.equal(
            output.content,
            'h4 { color: green; }\n\n\nh1 { color: red; }'
          );
          done();
        })
        .catch(done);
    });
  });

  describe('css.render', () => {
    it('should resolve nesting', done => {
      css
        .render('body{ color: red; div { color: blue}}')
        .then(css => {
          assert.equal(
            css,
            'body {\n  color: red;\n}\nbody div {\n  color: blue;\n}\n'
          );
          done();
        })
        .catch(done);
    });

    it('should resolve variables', done => {
      css
        .render('@red: red; body{ color: @red;}')
        .then(css => assert.equal(css, 'body {\n  color: red;\n}\n'))
        .catch(err => console.error(err))
        .then(done);
    });

    it("should add browser's custom prefixes", done => {
      css
        .render('::placeholder {color: gray;}')
        .then(css =>
          assert.equal(
            css,
            '::-webkit-input-placeholder {\n  color: gray;\n}\n::-ms-input-placeholder {\n  color: gray;\n}\n::placeholder {\n  color: gray;\n}\n'
          )
        )
        .catch(err => console.error(err))
        .then(done);
    });
  });

  describe('css.minify', () => {
    it('should remove all extra spaces', done => {
      css
        .minify('body {\n\tbackground: red; \n\t}\n')
        .then(css => assert.equal(css, 'body{background:red}'))
        .catch(err => console.error(err))
        .then(done);
    });

    it('should remove all duplicates', done => {
      css
        .minify(
          'div { background: blue; color: red; } div { font-color: blue; color: red;} div { background: blue;}'
        )
        .then(css => {
          assert.equal(css, 'div{background:#00f;font-color:#00f;color:red}');
          done();
        })
        .catch(done);
    });
  });

  describe('css.compile', () => {
    it('should compile, prefix and minify a file', done => {
      css
        .compile('./tests/resources/file1.less')
        .then(output => {
          assert.equal(output.content, 'h2{color:green}h1{color:red}');
          done();
        })
        .catch(done);
    });

    it('should compile a file with an error', done => {
      css.onError(err =>
        assert.equal(
          err.message,
          'Unrecognised input. Possibly missing something'
        )
      );
      css
        .compile('./tests/resources/file-with-error.less')
        .then(output => {
          assert.equal(output.content, '');
          done();
        })
        .catch(done);
    });
  });
});
