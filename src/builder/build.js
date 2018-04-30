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

/**
 * Runs `method()` and conole.time the time it took, along with `label`
 * @param {String} label 
 * @param {Function} method 
 */
function logged(label, method) {
  console.time(label);
  method();
  console.timeEnd(label);
}

/**
 * loads and parse application maps
 * @param {String} fileName 
 * @throws NotFoundError if file not found
 * TBD: check file content for required fields
 */
function readMapFile(fileName) {
  if (!fs.existsSync(fileName)) {
    throw errors.notFound('map.json', fileName);
  }

  return JSON.parse(fs.readFileSync(fileName, 'utf-8'));
}

/**
 * Returns an absolute path for a file
 * @param {String} path 
 * @param {String} file 
 */
function getAbsolutePath(path, file) {
  if (path.length > 0 && !path.match(/\/$/)) {
    path += '/';
  }
  return `${process.cwd()}/${(path + file).replace('//', '/')}`;
}

/**
 * Returns a Map of fileName => absolute values
 * @param {String} path 
 * @param {Strings[]} entries array of file name
 */
function getAbsolutePathes(path, entries) {
  let map = new Map();

  Object.keys(entries)
    .forEach(entry => map.set(entry, entries[entry].map( file => getAbsolutePath(path, file))));

  return map;
}

/**
 * Returns
 * @param {String} output fileName
 * @param {Strings[]} files to watch
 * @param {Function} mapFunc 
 * @param {String} target folder
 */
function getWatcherPromises(output, files, mapFunc, target) {
  return files.map(file => mapFunc(file)
    .then(
      results => getWatchers(results, output, target)
    )
  );
}

/**
 * Returns an array of objects { file(name), watcher }
 * @param {String[]} files files to watch
 * @param {String} output file name 
 * @param {String} target path
 */
function getWatchers(files, output, target) {
  return files.map(
    file => ({
      file,
      watcher: fs.watch(file, 
        (eventType, triggering) => logged(`${colors.FgGreen}✓${colors.Reset} ${colors.Dim}Recompiled${colors.Reset} ` +
        `${colors.FgCyan}${output}${colors.Reset}`, 
        () => writeToFile(
          target,
          output,
          files,
          getFileType(output),
          triggering
        )
      ))
    })
  );
}

/**
 * Returns a file's appropriate type from a fixed Map of files types
 * @param {String} fileName 
 */
function getFileType(fileName) {
  let type = Array.from(types.values()).find(type => type.regExp.test(fileName));

  return type || types.get('static');
}

/**
 * Compile and writes a file to the file-system. if file type is `static` and source is missing, it will remove target file
 * @param {String} targetPath 
 * @param {String} targetFileName 
 * @param {String} sourceFile 
 * @param {Object} fileTypeDef containing `id` and a `handler` that has a `compile` function (unless `id`===`static)
 * @param {String} triggeredByFile a source file which was deleted (and should be removed from target folder)
 */
function writeToFile(targetPath, targetFileName, sourceFile, fileTypeDef, triggeredByFile) {
  let absoluteTarget = getAbsolutePath(targetPath, targetFileName);

  if (fileTypeDef.id === 'static') {
    if (triggeredByFile !== undefined) {
      removeFileIfRedundant(triggeredByFile, sourceFile, `${targetPath}/${targetFileName}`);
    }
    return static.copy(sourceFile, getAbsolutePath(targetPath, targetFileName));
  } else {
    return fileTypeDef.handler.compile(sourceFile)
      .then(response => {
        files.addPath(absoluteTarget.substring(0, absoluteTarget.lastIndexOf('/')));
        fs.writeFileSync(absoluteTarget, response.content);
        return response;
      })
  }
}

/**
 * Removes a file if not found in source
 * @param {String} file 
 * @param {String[]} entries 
 * @param {String} destPath 
 */
function removeFileIfRedundant(file, entries, destPath) {
  if (!entries.find(entry => {
    if (entry === file) {
      // if entry is the actual file
      return fs.existsSync(entry);
    } else if (entry.substring(entry.length - 1) === '/') {
      // if entry is a folder containing the file
      return fs.existsSync(`${entry}${file}`);
    }
    return false;
  }) && fs.existsSync(`${destPath}/${file}`)) {
    fs.unlinkSync(`${destPath}/${file}`);
  }
}

/**
 * Builds destination folder according to appMap description
 * @param {Object} appMap 
 */
function once(appMap) {
  let source = appMap.source || '',
      target = appMap.target || '';

  return Promise.all(Object.keys(appMap.entries)
    .map(entry => writeToFile(
        target,
        entry,
        appMap.entries[entry].map(file => getAbsolutePath(source, file)),
        getFileType(entry))
      .catch(err => log(`skipping ${entry} due to error:`, err))));
}

/**
 * Creates watches to listen to sources files of appMap description
 * @param {Object} appMap 
 */
function live(appMap) {
  let target = appMap.target || '',
      entries = getAbsolutePathes(appMap.source || '', appMap.entries);
  
  return Promise.all(Array.from(entries.keys())
    .map(entry => getWatcherPromises(entry,
      entries.get(entry),
      getFileType(entry).handler.mapFile,
      target) )
    .reduce((acc, promise) => acc.concat(promise), [])
  ).then(watcheArrays => watcheArrays.reduce((acc, watches) => acc.concat(watches), []));
}

class Builder {
  /**
   * Reads appMap file and build it
   * @param {String} appMap file name
   */
  once(appMap) {
    return once((typeof appMap === 'string') ? readMapFile(appMap) : appMap);
  }

  /**
   * Reads appMap file and set watches for it
   * @param {String} appMap 
   */
  live(appMap) {
    return live((typeof appMap === 'string') ? readMapFile(appMap) : appMap);
  }
}

module.exports = new Builder();