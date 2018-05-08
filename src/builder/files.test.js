/*global afterEach */
const assert = require('assert'),
  fs = require('fs'),
  files = require('../../bin/builder.js').files;

describe('builder.files', () => {
  describe('files.copy()', () => {
    afterEach(() => {
      if (fs.existsSync('tests/dist/')) {
        files.removePath('tests/dist/');
      }
    });
    
    it('should copy file to target folder', () => {
      files.copy('tests/resources/file1.js', 'tests/dist/');
      assert.equal(fs.existsSync('tests/dist/file1.js'), true);
    });

    it('should copy file to target folder to a different name', () => {
      files.copy('tests/resources/file1.js', 'tests/dist/newName.js');
      assert.equal(fs.existsSync('tests/dist/newName.js'), true);
    });

    it('should copy folder to target folder', () => {
      files.copy('tests/resources/subfolder', 'tests/dist/');
      assert.equal(fs.existsSync('tests/dist/subfolder/file2.1.html'), true);
    });

    it('should copy file withing folder to target folder', () => {
      files.copy('tests/resources/subfolder/file2.1.html', 'tests/dist/');
      assert.equal(fs.existsSync('tests/dist/file2.1.html'), true);
    });
  });
});