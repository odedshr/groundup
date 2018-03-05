const fs = require('fs'),
  css = require('./css.js'),
  html = require('./html.js'),
  js = require('./js.js'),
  static = require('./static.js'),
  
  log = console.log,

  types = [{ regExp: /\.js$/, id: 'js', handler: js },
    { regExp: /\.css$/, id: 'css', handler: css },
    { regExp: /\.html$/,id: 'html', handler: html },
    { regExp: /\/$/, id: 'static', handler: static }];

function Builder () {}

Builder.prototype = {
  once(appMap) {
    let source = appMap.source || '',
        target = appMap.target || '';

    return Promise.all(Object.keys(appMap.entries)
      .map(entry => this.writeToFile(
          target,
          entry,
          appMap.entries[entry].map(file => this.buildPath(source, file)),
          this.getFileType(entry))
        .catch(err => log('skipping entering due to error:', err))));
  },

  live(appMap) {
    let source = appMap.source || '',
        target = appMap.target || '';
    
    return new Promise(resolve => {
      Object.keys(appMap.entries).map(entry => {
        this.getFileType(entry)
          .handler
          .mapFile(this.buildPath(source, appMap.entries[entry]))
          .then(results => results.map(file => fs.watch(file, () => this.writeToFile(
              target,
              entry,
              appMap.entries[entry].map(file => this.buildPath(source, file)),
              this.getFileType(entry))
            .then( () => log (`recompiled ${entry}`)))));
      });
      resolve();
    });
  },

  getFileType(fileName) {
    let type = types.find(type => type.regExp.test(fileName));

    if (type !== undefined) {
      return type;
    }

    throw new Error('UnknownFileType:' + fileName);
  },

  buildPath(folder, file) {
    if (folder.length > 0 && !folder.match(/\/$/)) {
      folder += '/';
    }
    return (folder + file).replace('//', '/');
  },

  writeToFile(target, entry, entries, fileTypeDef) {
    if (fileTypeDef.id === 'static') {
      return static.copy(entries, this.buildPath(target, entry));
    } else {
      return fileTypeDef.handler.compile(entries).then(response => {
        fs.writeFileSync(this.buildPath(target, entry), response.content);
      });
    }
  }
};

module.exports = new Builder();