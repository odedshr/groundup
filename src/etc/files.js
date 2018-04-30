const fs = require('fs');

class Files {
  /**
   * Verifies path exists by creating each folder if not already exists
   * @param {String} path 
   */
  addPath(path) {
    path.split('/').reduce((acc, folder) => {
      acc += folder;

      // when path is absolute ('/Volumes...') the first acc ==='' so we shouldn't try to create it
      if (acc.length && !fs.existsSync(acc)) {
        fs.mkdirSync(acc);
      }
      return acc + '/';
    }, '');
  }
  
  /**
   * Removes a file or folder and its content recursively
   * @param {String} path 
   */
  removePath(path) {
    let curPath;

    if (fs.existsSync(path)) {
      fs.readdirSync(path)
        .forEach(file => {
          curPath = path + '/' + file;

          if(fs.statSync(curPath).isDirectory()) { // recursive
            this.removePath(curPath);
          } else { // delete file
            fs.unlinkSync(curPath);
          }
        });
      fs.rmdirSync(path);
    }
  }
}

module.exports = new Files();