
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { watch } from 'chokidar';
import Errors from '../etc/Errors.js';
import colors from '../etc/console-colors.js';
import css from './css.js';
import html from './html.js';
import js from './js.js';
import files from './files.js';

const defaultHandleError = error => console.error(getLogLabel('An error has occoured', `(${error.message})`, 'error'), error),
  mapHandler = {
    mapFile(file) {
      return [file];
    },

    compile(file) {
      throw Errors.BadInput('mapFile', file);
    }
  },
  // handler is an object { mapFile, compile(optional) }
  types = new Map([
    ['map', { regExp: /^\*$/, id: 'map', handler: mapHandler }],
    ['js', { regExp: /\.js$/, id: 'js', handler: js }],
    ['css', { regExp: /\.css$/, id: 'css', handler: css }],
    ['html', { regExp: /\.html$/, id: 'html', handler: html }],
    ['files', { regExp: /\/$/, id: 'files', handler: files }]
  ]);

function getLogIcon (type='info') {
  switch (type) {
    case 'error': return `${colors.FgRed}✖${colors.Reset}`;
    default: return `${colors.FgGreen}✓${colors.Reset}`;
  }
}
function getLogLabel(verb, subject, type) {
  const time = new Date();

  return `${padTwoDigits(time.getHours())}:${padTwoDigits(time.getMinutes())}:` +
    `${padTwoDigits(time.getSeconds())} ${getLogIcon(type)} ` +
    `${colors.Dim}${verb}${colors.Reset} ${colors.FgCyan}${subject}${colors.Reset}`;
}
/**
 * Runs `method()` and conole.time the time it took, along with `label`
 * @param {String} label
 * @param {Function} method
 */
function logged(verb, subject, method, handleError) {
  const label = getLogLabel(verb, subject);

  console.time(label);

  try {
    method();
  }
  catch (err) {
    handleError(err);
  }

  console.timeEnd(label);
}

function padTwoDigits(num) {
  return ('00' + num).slice(-2);
}

/**
 * loads and parse application maps
 * @param {String} fileName
 * @throws NotFoundError if file not found
 */
function readMapFile(mapFileName) {
  if (!existsSync(mapFileName)) {
    throw new Errors.NotFound('map.json', mapFileName);
  }

  return JSON.parse(readFileSync(mapFileName, 'utf-8')).ductTape || {};
}

/**
 * Returns a file's appropriate type from a fixed Map of files types
 * @param {String} fileName
 */
function getFileType(fileName) {
  let type = Array.from(types.values()).find(type =>
    type.regExp.test(fileName)
  );

  return type || types.get('files');
}

/**
 * Writes a file to the file-system. if file type is `static` and source is missing, it will remove target file
 * @param {String} targetFile
 * @param {String} sourceFile
 * @param {Object} fileTypeDef containing `id` and a `handler` that has a `compile` function (unless `id`===`files')
 */
function writeToFile(targetFile, sourceFile, fileTypeDef) {
  switch (fileTypeDef.id) {
    case 'map': return new Promise(resolve => resolve());
    case 'files': return files.copy(sourceFile, targetFile);
    default: return compileToFile(targetFile, sourceFile, fileTypeDef);
  }
}

/**
 * Compile and writes a file to the file-system. if file type is `static` and source is missing, it will remove target
 * file
 * @param {String} targetFile
 * @param {String} sourceFile
 * @param {Object} fileTypeDef containing `id` and a `handler` that has a `compile` function (unless `id`===`files')
 */
function compileToFile(targetFile, sourceFile, fileTypeDef) {
  return fileTypeDef.handler.compile(sourceFile).then(response => {
    files.addPath(
      targetFile.substring(0, targetFile.lastIndexOf('/'))
    );

    writeFileSync(targetFile, response.content);

    return response;
  });
}

/**
 * Removes a file if not found in source
 * @param {String} targetFile
 * @param {String} entry
 * @param {String} sourceFile is the actual item which we've listened to
 */
function getFileToRemove(targetFile, entry, sourceFile) {
  if (entry === sourceFile) {
    return targetFile;
  }

  // targetFile is a folder and one of its sub-files was remove, so we need to remove it
  entry = `${entry.replace(/\/$/, '')}/`; // verify entry ends with '/'

  return `${targetFile}${sourceFile.replace(entry, '')}`;
}

class Builder {
  constructor() {
    this.handleError = defaultHandleError;
    this.watchers = [];
  }

  /**
   * Builds destination folder according to appMap description
   * @param {Object} appMap OR filename
   */
  build(mapFile, handleError = defaultHandleError) {
    const appMap = (typeof mapFile === 'string') ? readMapFile(mapFile) : mapFile;

    let source = appMap.source || '',
        target = appMap.target || '';

    if (appMap.entries === undefined) {
      handleError(new Errors.BadInput(mapFile, 'Missing `entries` property'));
    }

    return Promise.all(
      Object.keys(appMap.entries).map(entry =>
        writeToFile(
          this._getAbsolutePath(target, entry),
          this._getMappedEntries(source, appMap.entries[entry]),
          getFileType(entry)
        ).catch(handleError)
      )
    );
  }

  /**
   * Creates watches to listen to sources files of appMap description
   * @param {Object} appMap OR filename
   */
  watch(appMap, handleError = defaultHandleError) {
    this.stopWatching();
    this.appMap = appMap;

    if (typeof appMap === 'string') {
      appMap = readMapFile(appMap);
    }

    if (appMap.entries === undefined) {
      handleError(new Errors.BadInput(mapFile, 'Missing `source` property'));
    }

    let target = appMap.target || '',
      entries = this._getAbsolutePathes(appMap.source || '', appMap.entries);

    return this.watchers = Array.from(entries.keys())
      .map(entry =>
        this._getEntryWatchers(
          entry,
          entries.get(entry),
          getFileType(entry).handler.mapFile,
          target,
          handleError
        )
      )
      .reduce((acc, entry) => acc.concat(...entry), []);
  }

  stopWatching() {
    (this.watchers || []).forEach(watcher => watcher.watch.close());
  }

  buildAndWatch(appMap, handleError = defaultHandleError) {
    return this
      .build(appMap, handleError)
      .then(() => this.watch(appMap, handleError));
  }

  /** Sets a handler to call upon on error event
   * @param {Function} handler delegate
   */
  onError(handler) {
    this.handleError = handler;
    css.onError(handler);
    html.onError(handler);
    js.onError(handler);
  }

  getFacade() {
    return {
      build: this.build.bind(this),
      watch: this.watch.bind(this),
      buildAndWatch: this.buildAndWatch.bind(this),
      onError: this.onError.bind(this),
      stopWatching: this.stopWatching.bind(this)
    };
  }

  /**
   * return an array of all the sources of a entry from app.map.json "entries" object
   * @param {String} source - full path prefixes to be added to each source
   * @param {Object} entry - can be either [fileNames], { source : [fileNames] }, or { source : fileName } or just a
   * simple string
   */
  _getMappedEntries(sourcePath, entry) {
    let sources;

    if (entry instanceof Object) {
      if (Array.isArray(entry)) {
        sources = entry;
      } else {
        let entryCopy = Object.assign({}, entry);

        entryCopy.source = this._getMappedEntries(sourcePath, entryCopy.source);

        return entryCopy;
      }
    } else {
      sources = [entry];
    }

    return sources.map(file => this._getAbsolutePath(sourcePath, file));
  }

  /**
   * Returns a Map of fileName => absolute values
   * @param {String} path
   * @param {Strings[]} entries array of file name
   */
  _getAbsolutePathes(path, entries) {
    let map = new Map();

    Object.keys(entries).forEach(entry =>
      map.set(entry, this._getMappedEntries(path, entries[entry]))
    );

    return map;
  }

  /**
   * Returns an absolute path for a file
   * @param {String} path
   * @param {String} file
   */
  _getAbsolutePath(path, file) {
    if (path.length > 0 && !path.match(/\/$/)) {
      path += '/';
    }

    return `${process.cwd()}/${(path + file).replace('//', '/')}`;
  }

  /**
 * Returns watchers for the entries
 * @param {String} output fileName
 * @param {Strings[]} files to watch
 * @param {Function} mapFunc which parse the files to look for dependencies
 * @param {String} target folder
 */
  _getEntryWatchers(output, files, mapFunc, target, handleError) {
    let options, external;

    if (files.source) {
      options = files;
      external = options.external;
      files = files.source;
    }

    return files.map(entry =>
      this._getWatchers(entry, mapFunc(entry, external), output, target, options, handleError)
    );
  }

  /**
   * Returns an array of objects { file(name), watcher }
   * @param {String[]} files files to watch
   * @param {String} output file name
   * @param {String} target path
   */
  _getWatchers(rootFile, files, output, target, options = {}, handleError) {
    const targetFile = this._getAbsolutePath(target, output);

    return files.map(file => {
      const fileTypeDef = getFileType(output),
        handlers = [];

      switch (fileTypeDef.id) {
        case 'files':
          handlers.push((event, path) => {
            switch (event) {
              case 'unlink':
                let fileToRemove = getFileToRemove(targetFile, rootFile, path);

                return logged(
                  'Removed',
                  fileToRemove.replace(process.cwd(), ''),
                  unlinkSync.bind(this, fileToRemove),
                  handleError);

              default:
                return logged(
                  'Updated',
                  targetFile.replace(process.cwd(), ''),
                  writeToFile.bind(this, targetFile, rootFile, fileTypeDef),
                  handleError);
            }
          });
          break;
        case 'map':
          handlers.push((event, path) => logged(
            `Map ${event}:`,
            path.replace(process.cwd(), ''),
            this.buildAndWatch.bind(this, this.appMap, handleError),
            handleError
          ));
          break;
        default:
          handlers.push((event, path) => logged(
            `${event} ${path.replace(process.cwd(), '')}: Recompiled`,
            output,
            compileToFile.bind({}, targetFile, Object.assign({}, options, { source: rootFile }), fileTypeDef),
            handleError
          ));
          break;
      }

      return {
        type: fileTypeDef.id,
        file,
        options,
        handlers,
        watch: watch(file, { ignoreInitial: true })
          .on('all', (event, path) => handlers.forEach(handler => handler(event, path)))
      };
    });
  }
}

export default new Builder().getFacade();
