/*global afterEach */
const assert = require('assert'),
  fs = require('fs'),
  static = require('./static.js');

describe('static.js', () => {
  describe('static.getFileTargt()', () => {
    it('should keep file name in target\'s folder', () => {
      assert.equal(static.getFileTargt('tests/file1.js', 'target/'), 'target/file1.js');
    });

    it('should rename target file', () => {
      static.getFileTargt('tests/file1.js', 'tests/dest', 'tests/dest');
    });
  });

  describe('static.copy()', () => {
    afterEach(() => {
      if (fs.existsSync('tests/dest/')) {
        static.removeFolder('tests/dest/');
      }
    });
    
    it('should copy file to target folder', () => {
      static.copy('tests/file1.js', 'tests/dest/');
      assert.equal(fs.existsSync('tests/dest/file1.js'), true);
    });

    it('should copy file to target folder to a different name', () => {
      static.copy('tests/file1.js', 'tests/dest/newName.js');
      assert.equal(fs.existsSync('tests/dest/newName.js'), true);
    });

    it('should copy folder to target folder', () => {
      static.copy('tests/subfolder', 'tests/dest/');
      assert.equal(fs.existsSync('tests/dest/subfolder/file2.1.html'), true);
    });

    it('should copy file withing folder to target folder', () => {
      static.copy('tests/subfolder/file2.1.html', 'tests/dest/');
      assert.equal(fs.existsSync('tests/dest/file2.1.html'), true);
    });
  });
});