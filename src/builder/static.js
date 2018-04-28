const fs = require('fs'),
  files = require('../etc/files.js'),
  glob = require('glob');

function Static () {}

Static.prototype = {
  copy(source, target) {
    let sources = Array.isArray(source) ? source : [source];

    files.addPath(target.substring(0, target.lastIndexOf('/')));

    return Promise.all(sources.map(source => {
      glob.sync(source, {})
        .forEach(file => {
          let fileTarget = this._getFileTargt(file, target),
            err = fs.copyFileSync(file, fileTarget);

          if (!fs.lstatSync(target).isDirectory() || err) {
            return new Promise((resolve, reject) => (err ? reject(err): resolve()));
          } else {
            return this.copy(file + '/*.*', fileTarget + '/');
          }
        });
    }));
  },

  mapFile(fileName) {
    return new Promise(resolve => resolve(glob.sync(fileName, {})));
  },

  getFileTargt(file, target) {
    return this._getFileTargt(file, target);
  },

  _getFileTargt(file, target) {
    if (target.match(/\/$/)) {
      target += file.substr(file.lastIndexOf('/') + 1);
    }
  
    return target;
  }
};

module.exports = new Static();