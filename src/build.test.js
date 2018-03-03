const assert = require('assert'),
  fs = require('fs'),
  build = require('./build.js');
  

describe('build.js', () => {
  describe('getFileType()', () => {
    it('should detect js files', () => {
      assert.equal(build.getFileType('index.js').id, 'js');
    });

    it('should detect css files', () => {
      assert.equal(build.getFileType('index.css').id, 'css');
    });

    it('should detect html files', () => {
      assert.equal(build.getFileType('index.html').id, 'html');
    });

    it('should detect folders', () => {
      assert.equal(build.getFileType('folder/').id, 'static');
    });

    it('throw error for unknown type', () => {
      let errorThrowingFunction = () => build.getFileType('unknown.type');
      assert.throws(errorThrowingFunction, Error, 'UnknownFileType:unknown.type');
    });
  });

  describe('getEntryTarget()', () => {
    it('should concatanate no folder and file start with \'/\'', () => {
      assert.equal(build.getEntryTarget('', '/file'), '/file');
    });

    it('should concatanate folder and file start with \'/\'', () => {
      assert.equal(build.getEntryTarget('folder', '/file'), 'folder/file');
    });

    it('should concatanate folder and file start with \'/\'', () => {
      assert.equal(build.getEntryTarget('folder/', '/file'), 'folder/file');
    });
  });

  xdescribe('once()', () => {
    it('should build a dist', done => {
      let appMap = JSON.parse(fs.readFileSync('./tests/app.map.json', 'utf-8'));
      build.once(appMap);
      done();
    });
  });
});