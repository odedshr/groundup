const fs = require('fs'),
  files = require('../etc/files.js'),
  glob = require('glob');

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
class Static {
  /**
   * copy source files to target
   * @param {String[]} source (or a single string)
   * @param {String} target 
   */
  copy(source, target) {
    let sources = Array.isArray(source) ? source : [source];

    files.addPath(target.substring(0, target.lastIndexOf('/')));

    return Promise.all(sources.map(source => {
      glob.sync(source, {})
        .forEach(file => {
          let fileTarget = getFileTargt(file, target),
            err = fs.copyFileSync(file, fileTarget);

          if (!fs.lstatSync(target).isDirectory() || err) {
            return new Promise((resolve, reject) => (err ? reject(err): resolve()));
          } else {
            return this.copy(file + '/*.*', fileTarget + '/');
          }
        });
    }));
  }

  /**
   * Returns a promise for a list of all files matching the fileName pattern
   * @param {String} fileName 
   */
  mapFile(fileName) {
    return new Promise(resolve => resolve(glob.sync(fileName, {})));
  }
}

module.exports = new Static();