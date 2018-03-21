const fs = require('fs'),
  colors = require('./console-colors.js'),
  css = require('./css.js'),
  html = require('./html.js'),
  js = require('./js.js'),
  static = require('./static.js'),
  
  log = console.log,

  types = new Map([['js', { regExp: /\.js$/, id: 'js', handler: js }],
    ['css', { regExp: /\.css$/, id: 'css', handler: css }],
    ['html', { regExp: /\.html$/,id: 'html', handler: html }],
    ['static', { regExp: /\/$/, id: 'static', handler: static }]]);

function logged(label, method) {
  console.time(label);
  method();
  console.timeEnd(label);
}

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
    let target = appMap.target || '',
        entries = this.buildPaths(appMap.source || '', appMap.entries);
    
    return Promise.all(Array.from(entries.keys())
      .map(entry => this.getWatcherPromises(entry,
        entries.get(entry),
        this.getFileType(entry).handler.mapFile,
        target) )
      .reduce((acc, promise) => acc.concat(promise), [])
    ).then(watcheArrays => watcheArrays.reduce((acc, watches) => acc.concat(watches), []));
  },

  getWatcherPromises(entry, files, mapFunc, target) {
    return files.map(file => mapFunc(file)
      .then(
        results => this.getWatchers(entry, results, target)
      )
    );
  },

  getWatchers(entry, files, target) {
    return files.map(
      file => fs.watch(file, 
        (eventType, triggering) => logged(`${colors.FgGreen}✓${colors.Reset} ${colors.Dim}Recompiled${colors.Reset} ` +
          `${colors.FgCyan}${entry}${colors.Reset}`, 
          () => this.writeToFile(
            target,
            entry,
            files,
            this.getFileType(entry),
            triggering
          )
        )
      )
    );
  },

  getFileType(fileName) {
    let type = Array.from(types.values()).find(type => type.regExp.test(fileName));

    return type || types.get('static');
  },

  buildPath(path, file) {
    if (path.length > 0 && !path.match(/\/$/)) {
      path += '/';
    }
    return (path + file).replace('//', '/');
  },

  buildPaths(path, entries) {
    let map = new Map();
  
    Object.keys(entries)
      .forEach(entry => map.set(entry, entries[entry].map( file => this.buildPath(path, file))));
  
    return map;
  },

  writeToFile(target, entry, entries, fileTypeDef, triggeredByFile) {
    if (fileTypeDef.id === 'static') {
      if (triggeredByFile !== undefined) {
        this.removeFileIfRedundant(triggeredByFile, entries, `${target}/${entry}`);
      }
      return static.copy(entries, this.buildPath(target, entry));
    } else {
      return fileTypeDef.handler.compile(entries)
        .then(response => {
          fs.writeFileSync(this.buildPath(target, entry), response.content);
        });
    }
  },

  removeFileIfRedundant(file, entries, target) {
    if (!entries.find(entry => {
      if (entry === file) {
        // if entry is the actual file
        return fs.existsSync(entry);
      } else if (entry.substring(entry.length - 1) === '/') {
        // if entry is a folder containing the file
        return fs.existsSync(`${entry}${file}`);
      }
      return false;
    })) {
      fs.unlinkSync(`${target}/${file}`);
    }
  }
};

module.exports = new Builder();