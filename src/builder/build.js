const fs = require('fs'),
  files = require('../etc/files.js'),
  errors = require('../etc/errors.js'),
  colors = require('../etc/console-colors.js'),
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

function readMapFile(fileName) {
  if (!fs.existsSync(fileName)) {
    throw errors.notFound('map.json', fileName);
  }

  return JSON.parse(fs.readFileSync(fileName, 'utf-8'));
}

function buildPath(path, file) {
  if (path.length > 0 && !path.match(/\/$/)) {
    path += '/';
  }
  return `${process.cwd()}/${(path + file).replace('//', '/')}`;
}

function buildPaths(path, entries) {
  let map = new Map();

  Object.keys(entries)
    .forEach(entry => map.set(entry, entries[entry].map( file => buildPath(path, file))));

  return map;
}

function getWatcherPromises(entry, files, mapFunc, target) {
  return files.map(file => mapFunc(file)
    .then(
      results => getWatchers(entry, results, target)
    )
  );
}

function getWatchers(entry, files, target) {
  return files.map(
    file => ({
      file,
      watcher: fs.watch(file, 
        (eventType, triggering) => logged(`${colors.FgGreen}✓${colors.Reset} ${colors.Dim}Recompiled${colors.Reset} ` +
        `${colors.FgCyan}${entry}${colors.Reset}`, 
        () => writeToFile(
          target,
          entry,
          files,
          getFileType(entry),
          triggering
        )
      ))
    })
  );
}

function getFileType(fileName) {
  let type = Array.from(types.values()).find(type => type.regExp.test(fileName));

  return type || types.get('static');
}

function writeToFile(target, entry, entries, fileTypeDef, triggeredByFile) {
  let targetFile = buildPath(target, entry);

  if (fileTypeDef.id === 'static') {
    if (triggeredByFile !== undefined) {
      removeFileIfRedundant(triggeredByFile, entries, `${target}/${entry}`);
    }
    return static.copy(entries, buildPath(target, entry));
  } else {
    return fileTypeDef.handler.compile(entries)
      .then(response => {
        files.addPath(targetFile.substring(0, targetFile.lastIndexOf('/')));
        fs.writeFileSync(buildPath(target, entry), response.content);
        return response;
      })
  }
}

function removeFileIfRedundant(file, entries, target) {
  if (!entries.find(entry => {
    if (entry === file) {
      // if entry is the actual file
      return fs.existsSync(entry);
    } else if (entry.substring(entry.length - 1) === '/') {
      // if entry is a folder containing the file
      return fs.existsSync(`${entry}${file}`);
    }
    return false;
  }) && fs.existsSync(`${target}/${file}`)) {
    fs.unlinkSync(`${target}/${file}`);
  }
}

function once(appMap) {
  let source = appMap.source || '',
      target = appMap.target || '';

  return Promise.all(Object.keys(appMap.entries)
    .map(entry => writeToFile(
        target,
        entry,
        appMap.entries[entry].map(file => buildPath(source, file)),
        getFileType(entry))
      .catch(err => log(`skipping ${entry} due to error:`, err))));
}

function live(appMap) {
  let target = appMap.target || '',
      entries = buildPaths(appMap.source || '', appMap.entries);
  
  return Promise.all(Array.from(entries.keys())
    .map(entry => getWatcherPromises(entry,
      entries.get(entry),
      getFileType(entry).handler.mapFile,
      target) )
    .reduce((acc, promise) => acc.concat(promise), [])
  ).then(watcheArrays => watcheArrays.reduce((acc, watches) => acc.concat(watches), []));
}

class Builder {
  once(appMap) {
    return once((typeof appMap === 'string') ? readMapFile(appMap) : appMap);
  }

  live(appMap) {
    return live((typeof appMap === 'string') ? readMapFile(appMap) : appMap);
  }
}

module.exports = new Builder();