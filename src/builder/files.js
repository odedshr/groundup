import { copyFileSync, existsSync, mkdirSync, lstatSync, readdirSync, statSync, unlinkSync, rmdirSync } from 'fs';
import glob from 'glob';

/**
 * Return the file's target path by merging by omitting merging the string and ommitting the file's actual name
 * @param {String} file 
 * @param {String} targetPath 
 */
function getFileTargt (file, targetPath) {
  if (targetPath.match(/\/$/)) {
    return targetPath + file.substr(file.lastIndexOf('/') + 1);
  }

  return targetPath;
}

export default {
  /**
   * copy source files to target
   * @param {String[]} source (or a single string)
   * @param {String} target 
   */
  copy(source, target) {
    let sources = Array.isArray(source) ? source : [source];

    this.addPath(target.substring(0, target.lastIndexOf('/')));

    return Promise.all(sources.map(source => {
      glob.sync(source, {})
        .forEach(file => {
          let fileTarget = getFileTargt(file, target),
            err = copyFileSync(file, fileTarget);

          if (!lstatSync(target).isDirectory() || err) {
            return new Promise((resolve, reject) => (err ? reject(err): resolve()));
          } else {
            return this.copy(file + '/*.*', fileTarget + '/');
          }
        });
    }));
  },

  /**
   * Returns a promise for a list of all files matching the fileName pattern
   * @param {String} fileName 
   */
  mapFile(fileName) {
    return new Promise(resolve => resolve(glob.sync(fileName, {})));
  },

    /**
   * Verifies path exists by creating each folder if not already exists
   * @param {String} path 
   */
  addPath(path) {
    path.split('/').reduce((acc, folder) => {
      acc += folder;

      // when path is absolute ('/Volumes...') the first acc ==='' so we shouldn't try to create it
      if (acc.length && !existsSync(acc)) {
        mkdirSync(acc);
      }
      return acc + '/';
    }, '');
  },
  
  /**
   * Removes a file or folder and its content recursively
   * @param {String} path 
   */
  removePath(path) {
    let curPath;

    if (existsSync(path)) {
      readdirSync(path)
        .forEach(file => {
          curPath = path + '/' + file;

          if(statSync(curPath).isDirectory()) { // recursive
            this.removePath(curPath);
          } else { // delete file
            unlinkSync(curPath);
          }
        });
      rmdirSync(path);
    }
  }
};