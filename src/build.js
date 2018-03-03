const fs = require('fs'),
  css = require('./css.js'),
  html = require('./html.js'),
  js = require('./js.js'),
  static = require('./static.js'),
  
  log = console.log,

  types = [{ regExp: /\.js$/, id: 'js', compiler: js.compile },
    { regExp: /\.css$/, id: 'css', compiler: css.compile },
    { regExp: /\.html$/,id: 'html', compiler: html.compile },
    { regExp: /\/$/, id: 'static', compiler: static.copy }];

function Builder () {}

Builder.prototype = {
  once(appMap) {
    let target = appMap.target || '';

    Object.keys(appMap.entries).forEach(entry => {
      try {
        this.writeToFile(target, entry, appMap.entries, this.getFileType(entry));
      }
      catch(err) {
        log('Skippin entry for producing the following entry: ', err);
      }
    });
  },

  getFileType(fileName) {
    let type = types.find(type => type.regExp.test(fileName));

    if (type !== undefined) {
      return type;
    }

    throw new Error('UnknownFileType:' + fileName);
  },

  getEntryTarget(folder, file) {
    if (folder.length > 0 && !folder.match(/\/$/)) {
      folder += '/';
    }
    return (folder + file).replace('//', '/');
  },

  writeToFile(target, entry, entries, fileTypeDef) {
    if (fileTypeDef.id === 'static') {
      static.copy(entries[entry], this.getEntryTarget(target, entry));
    } else {
      fs.writeFileSync(this.getEntryTarget(target, entry), fileTypeDef.compiler(entries[entry]));
    }
  }
};

module.exports = new Builder();