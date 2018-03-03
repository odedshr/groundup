const fs = require('fs'),
  glob = require('glob');

function Static () {}

Static.prototype = {
  copy(source, target) {
    let fileTarget,
        sources = Array.isArray(source) ? source : [source];

    this.validatePathExists(target.substring(0, target.lastIndexOf('/')));
    sources.forEach( source => {
      glob.sync(source, {})
        .forEach(file => {
          fileTarget = this.getFileTargt(file, target);
          fs.copyFileSync(file, fileTarget);

          if (fs.lstatSync(target).isDirectory()) {
            this.copy(file + '/*.*', fileTarget + '/');
          }
        });
    });
  },

  getFileTargt(file, target) {
    if (target.match(/\/$/)) {
      target += file.substr(file.lastIndexOf('/') + 1);
    }

    return target;
  },

  validatePathExists(path) {
    path.split('/').reduce((acc, folder) => {
      acc += folder;
      if (!fs.existsSync(acc)) {
        fs.mkdirSync(acc);
      }
      return acc + '/';
    }, '');
  },

  removeFolder(path) {
    let curPath;

    if (fs.existsSync(path)) {
      fs.readdirSync(path)
        .forEach(file => {
          curPath = path + '/' + file;

          if(fs.statSync(curPath).isDirectory()) { // recurse
            this.removeFolder(curPath);
          } else { // delete file
            fs.unlinkSync(curPath);
          }
        });
      fs.rmdirSync(path);
    }
  }
};

module.exports = new Static();