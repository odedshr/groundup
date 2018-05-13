import { existsSync, readFileSync, unlinkSync,  watch, writeFileSync } from 'fs';
import errors from '../etc/errors.js';
import colors from '../etc/console-colors.js';
import css from './css.js';
import html from './html.js';
import js from './js.js';
import files from './files.js';
  
const log = console.log,

  types = new Map([['js', { regExp: /\.js$/, id: 'js', handler: js }],
    ['css', { regExp: /\.css$/, id: 'css', handler: css }],
    ['html', { regExp: /\.html$/,id: 'html', handler: html }],
    ['files', { regExp: /\/$/, id: 'files', handler: files }]]);

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
  if (!existsSync(fileName)) {
    throw errors.notFound('map.json', fileName);
  }

  return JSON.parse(readFileSync(fileName, 'utf-8'));
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
    .forEach(entry => map.set(entry, getMappedEntries(path, entries[entry])));

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
  let external = [];

  if (files.source) {
    external = files.external;
    files = files.source;
  }
  return files.map(file => mapFunc(file, external)
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
      watcher: watch(file, 
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

  return type || types.get('files');
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
  let { path: absoluteTarget, args } = extractArgumentsFromPath(getAbsolutePath(targetPath, targetFileName));

  if (fileTypeDef.id === 'files') {
    if (triggeredByFile !== undefined) {
      removeFileIfRedundant(triggeredByFile, sourceFile, `${targetPath}/${targetFileName}`);
    }
    return files.copy(sourceFile, getAbsolutePath(targetPath, targetFileName));
  } else {
    return fileTypeDef.handler.compile(sourceFile, ...args)
      .then(response => {
        files.addPath(absoluteTarget.substring(0, absoluteTarget.lastIndexOf('/')));
        writeFileSync(absoluteTarget, response.content);
        return response;
      })
  }
}

/**
 * extracts path and array of strings from a compouneded string whereas items are seperated by a delimiter
 * If there are additional ';;' they'll be treated like a single semi-color
 * for example: path/file.js;;param1;param2 == path/file.js;;param1;;param2
 * @param {String} compoundedString
 * @param {String} delimiter
 */
function extractArgumentsFromPath(compoundedString, delimiter = ';') {
  let [path, ...args] = compoundedString.split(delimiter);
  return { path, args };
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
      return existsSync(entry);
    } else if (entry.substring(entry.length - 1) === '/') {
      // if entry is a folder containing the file
      return existsSync(`${entry}${file}`);
    }
    return false;
  }) && existsSync(`${destPath}${file}`)) {
    unlinkSync(`${destPath}${file}`);
  }
}

/**
 * Builds destination folder according to appMap description
 * @param {Object} appMap OR filename
 */
function once(appMap) {
  if (typeof appMap === 'string') {
    appMap = readMapFile(appMap);
  }

  let source = appMap.source || '',
      target = appMap.target || '';

  return Promise.all(Object.keys(appMap.entries)
    .map(entry => writeToFile(
        target,
        entry,
        getMappedEntries(source, appMap.entries[entry]),
        getFileType(entry))
      .catch(err => log(`skipping ${entry} due to error:`, err))));
}

/**
 * return an array of source from app.map.json "entries" object
 * @param {Object} entry 
 */
function getMappedEntries (source, entry) {
  let sources;

  if (entry instanceof Object) {
    if (Array.isArray(entry)) {
      sources = entry;
    } else {
      let entryCopy = { ...entry };
      entryCopy.source = getMappedEntries(source, entryCopy.source);
      return entryCopy;
    }
  } else {
    sources = [entry];
  }

  return sources.map(file => getAbsolutePath(source, file));
}

/**
 * Creates watches to listen to sources files of appMap description
 * @param {Object} appMap OR filename
 */
function live(appMap) {
  if (typeof appMap === 'string') {
    appMap = readMapFile(appMap);
  }

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

const builder = { once, live };

export { builder as default, once, live };