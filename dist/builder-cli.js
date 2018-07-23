'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = require('fs');
var fs__default = _interopDefault(fs);
var less = require('less');
var LessPluginAutoPrefix = _interopDefault(require('less-plugin-autoprefix'));
var CleanCSS = _interopDefault(require('clean-css'));
var htmlMinifier = require('html-minifier');
var rollup = _interopDefault(require('rollup'));
var babel = _interopDefault(require('babel-core'));
var UglifyJS = _interopDefault(require('uglify-js'));
var glob = _interopDefault(require('glob'));
var chokidar = require('chokidar');

class DetailedError extends Error {
  constructor(message, status, details, stack) {
    super(...arguments);
    this.message = message;
    this.stack = stack;
    this.status = status;
    this.details = details;
  }
}

class AlreadyExists extends DetailedError {
  constructor(varType, value) {
    super('already-exists', 409, { key: varType, value: value });
  }
}

class BadInput extends DetailedError {
  constructor(key, value) {
    super('bad-input', 406, { key: key, value: value });
  }
}

class Custom extends DetailedError {
  constructor(action, description, error) {
    super('custom-error', 500, { key: action, value: description }, error);
  }
}
class Expired extends DetailedError {
  constructor(varName) {
    super('expired', 406, { key: varName });
  }
}

class Immutable extends DetailedError {
  constructor(varType) {
    super('immutable', 406, { key: varType });
  }
}

class MissingInput extends DetailedError {
  constructor(varName) {
    super('missing-input', 406, { key: varName });
  }
}

class NotFound extends DetailedError {
  constructor(type, id) {
    super('not-found', 404, { key: type, value: id });
  }

  toString() {
    return `${this.details.key} not Found: ${this.details.value}`;
  }
}

class NoPermissions extends DetailedError {
  constructor(actionName) {
    super('no-permissions', 401, { action: actionName });
  }
}

class SaveFailed extends DetailedError {
  constructor(varName, content, error) {
    super('save-failed', 500, { key: varName, value: content }, error);
  }
}

class System extends DetailedError {
  constructor(error, args, url) {
    super('system-error', 500, { args, error, url }, error);
  }
}

class TooLong extends DetailedError {
  constructor(varName, value, max = '?') {
    super('too-long', 406, { key: varName, value: value, max });
  }

  toString() {
    return `${this.details.key} is longer than ${this.details.max} (${
      this.details.value
    })`;
  }
}

class TooShort extends DetailedError {
  constructor(varName, value, min = '?') {
    super('too-short', 406, { key: varName, value: value, min });
  }

  toString() {
    return `${this.details.key} is shorter than ${this.details.min} (${
      this.details.value
    })`;
  }
}

class Unauthorized extends DetailedError {
  constructor() {
    super('unauthorized', 401);
  }
}

var Errors = {
  AlreadyExists,
  BadInput,
  Custom,
  Expired,
  Immutable,
  MissingInput,
  NotFound,
  NoPermissions,
  SaveFailed,
  System,
  TooLong,
  TooShort,
  Unauthorized
};

var colors = {
  Reset: '\x1b[0m',
  Bright: '\x1b[1m',
  Dim: '\x1b[2m',
  Underscore: '\x1b[4m',
  Blink: '\x1b[5m',
  Reverse: '\x1b[7m',
  Hidden: '\x1b[8m',

  FgBlack: '\x1b[30m',
  FgRed: '\x1b[31m',
  FgGreen: '\x1b[32m',
  FgYellow: '\x1b[33m',
  FgBlue: '\x1b[34m',
  FgMagenta: '\x1b[35m',
  FgCyan: '\x1b[36m',
  FgWhite: '\x1b[37m',

  BgBlack: '\x1b[40m',
  BgRed: '\x1b[41m',
  BgGreen: '\x1b[42m',
  BgYellow: '\x1b[43m',
  BgBlue: '\x1b[44m',
  BgMagenta: '\x1b[45m',
  BgCyan: '\x1b[46m',
  BgWhite: '\x1b[47m'
};

class Mapper {
  constructor() {
    this.handleError = error => {
      console.log(error);
    };
  }

  getFilePath(fileName) {
    let startOfName = fileName.lastIndexOf('/');
    if (startOfName === -1) {
      return '';
    } else {
      return fileName.substr(0, startOfName + 1);
    }
  }

  map(fileName, importPattern, external = []) {
    let files = Array.isArray(fileName) ? fileName : [fileName];

    return files
      .map(file => this.mapSingleNested(file, importPattern, external))
      .reduce((acc, item) => acc.concat(item), []);
  }

  mapSingleNested(fileName, importPattern, external) {
    const importRegex = new RegExp(importPattern, 'mg');

    if (!fs__default.existsSync(fileName)) {
      if (external.indexOf(fileName) === -1) {
        this.handleError(new Errors.NotFound('file', fileName));
      }
      return [];
    }

    let files = [fileName],
      content = fs__default.readFileSync(fileName, 'utf-8'),
      filePath = this.getFilePath(fileName),
      match;

    while ((match = importRegex.exec(content)) !== null) {
      if (
        files.indexOf(filePath + match[2]) === -1 &&
        external.indexOf(match[2]) === -1
      ) {
        files = files.concat(
          this.mapSingleNested(
            filePath + match[2].replace(/^\.\//, ''),
            importPattern,
            external
          )
        );
      }
    }

    return files;
  }

  load(fileName, importPattern) {
    let files = Array.isArray(fileName) ? fileName : [fileName];

    return files.map(file => this.loadSingleNested(file, importPattern)).reduce(
      (acc, item) => {
        acc.files = acc.files.concat(item.files);
        acc.content += item.content;
        return acc;
      },
      { files: [], content: '' }
    );
  }

  loadSingleNested(fileName, importPattern) {
    const importRegex = new RegExp(importPattern, 'mg');

    if (!fs__default.existsSync(fileName)) {
      this.handleError(new Errors.NotFound('file', fileName));
      return { files: [], content: '' };
    }

    let files = [fileName],
      content = fs__default.readFileSync(fileName, 'utf-8'),
      filePath = this.getFilePath(fileName),
      match;

    while ((match = importRegex.exec(content)) !== null) {
      if (files.indexOf(filePath + match[2]) === -1) {
        try {
          let child = this.loadSingleNested(filePath + match[2], importPattern);

          content = content.replace(match[0], child.content);
          files = files.concat(child.files);
        } catch (err) {
          this.handleError(err);
        }
      }
      // be sure to reset the regex index not to mess it up with empty files
      importRegex.lastIndex = 0;
    }

    return { files, content };
  }

  /** Sets a handler to call upon on error event
   * @param {Function} handler delegate
   */
  onError(handler) {
    this.handleError = handler;
  }

  /**
   * Returns only the public methods
   */
  getFacade() {
    return {
      map: this.map.bind(this),
      load: this.load.bind(this),
      onError: this.onError.bind(this)
    };
  }
}

var mapper = new Mapper().getFacade();

const plugins = [new LessPluginAutoPrefix({ browsers: ['last 2 versions'] })],
  importPattern = '^@import.*(["\'])(.*)\\1.*$';

class CSS {
  constructor() {
    this.handleError = error => {
      console.log(error);
    };
  }

  /**
   * Returns a promise for a merged, transpiled and minified version of a scss file
   * @param {String} fileName of scss file
   */
  compile(fileName) {
    return this.loadFile(fileName)
      .then(fileSet => {
        if (fileSet.content.length === 0) {
          return fileSet;
        }

        return this.render(fileSet.content)
          .catch(err => {
            this.handleError(err);
            return '';
          })
          .then(this.minify)
          .then(compiledAndMinified => {
            fileSet.content = compiledAndMinified;
            return fileSet;
          });
      })
      .catch(err => {
        this.handleError(err);
        return { files: [], content: '' };
      });
  }

  /**
   * Returns a promise for a minified css code
   * @param {String} css code
   */
  minify(css) {
    return new Promise(resolve =>
      resolve(new CleanCSS({ level: 2 }).minify(css).styles)
    );
  }

  /**
   * Returns a promise for a transpiled css code
   * @param {String} lessString
   */
  render(lessString) {
    return less.render(lessString, { plugins }).then(result => result.css);
  }

  /**
   * Returns a promise for a list of all files linked by `import` to the input file
   * @param {String} fileName
   */
  mapFile(fileName) {
    return new Promise(resolve => resolve(mapper.map(fileName, importPattern)));
  }

  /**
   * Returns a promise for a code of all files linked by `import` to the input file
   * @param {String} fileName
   */
  loadFile(fileName) {
    return new Promise(resolve =>
      resolve(mapper.load(fileName, importPattern))
    );
  }

  /** Sets a handler to call upon on error event
   * @param {Function} handler delegate
   */
  onError(handler) {
    this.handleError = handler;
    mapper.onError(handler);
  }
}

var css = new CSS();

const importPattern$1 =
  '<link rel="import" href=(["\'])(.*.html)\\1 data-replace="true"\\s*\\/>';

class HTML {
  constructor() {
    this.handleError = error => {
      console.log(error);
    };
  }

  /**
   * Returns a promise for a merged and minified version of a html file
   * @param {String} fileName of scss file
   */
  compile(fileName) {
    return this.loadFile(fileName).then(fileSet => {
      if (fileSet.content.length === 0) {
        return fileSet;
      }

      return this.minify(fileSet.content).then(minified => {
        fileSet.content = minified;

        return fileSet;
      });
    });
  }

  /**
   * Returns a promise for a minified html code
   * @param {String} css code
   */
  minify(html) {
    return new Promise(resolve =>
      resolve(
        htmlMinifier.minify(html, {
          collapseBooleanAttributes: true,
          collapseInlineTagWhitespace: true,
          collapseWhitespace: true,
          conservativeCollapse: true,
          decodeEntities: true,
          removeAttributeQuotes: true,
          keepClosingSlash: true,
          minifyCSS: true,
          minifyJS: true,
          minifyURLs: true,
          preserveLineBreaks: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          sortAttributes: true,
          sortClassName: true,
          useShortDoctype: true
        })
      )
    );
  }

  /**
   * Returns a promise for a list of all files linked by `import` to the input file
   * @param {String} fileName
   */
  mapFile(fileName) {
    return new Promise(resolve => resolve(mapper.map(fileName, importPattern$1)));
  }

  /**
   * Returns a promise for a code of all files linked by `import` to the input file
   * @param {String} fileName
   */
  loadFile(fileName) {
    return new Promise(resolve =>
      resolve(mapper.load(fileName, importPattern$1))
    );
  }

  /** Sets a handler to call upon on error event
   * @param {Function} handler delegate
   */
  onError(handler) {
    this.handleError = handler;
    mapper.onError(handler);
  }
}

var html = new HTML();

const importPattern$2 = `import.*(["\\'])(.*\\.js)\\1`,
  defaultFormat = 'cjs';

class JS {
  constructor() {
    this.handleError = error => {
      console.log(error);
    };
  }

  /**
   * Returns a promise for a merged, transpiled and uglified version of an es6 file
   * @param {Object} options can be a single string file name, or array of string filenames,
   * or an Object with the following parameters
   * - @param {String} source - single string file name, or array of string filenames
   * - @param {String} format - amd, cjs, es, iife, umd
   * - @param {String} external - single string file name, or array of string of files that not part of the bundle
   */
  compile(options) {
    let filenames,
      external = [],
      globals = {},
      format = defaultFormat;

    if (options instanceof Object) {
      if (Array.isArray(options)) {
        // options is just an array of sources
        filenames = options;
      } else {
        // options is a complex object
        filenames = Array.isArray(options.source)
          ? [...options.source]
          : [options.source];
        external = options.external || external;
        format = options.format || format;
        globals = options.globals || globals;
      }
    } else {
      //options is just a string
      filenames = [options];
    }

    return this.loadFiles(filenames, format, external, globals).then(
      fileSet => {
        if (fileSet.content.length === 0) {
          return fileSet;
        }

        return this.transpile(fileSet.content)
          .then(this.minify)
          .then(transpiledAndUglified => {
            fileSet.content = transpiledAndUglified;
            return fileSet;
          })
          .catch(err => {
            console.error('build.js.transpile: ', err);
            return fileSet;
          });
      }
    );
  }

  /**
   * Returns a promise for a minified js code, if bad code is provided it would reject with a syntax error
   * @param {String} jsCode code
   */
  minify(jsCode) {
    return new Promise((resolve, reject) => {
      let output = UglifyJS.minify(jsCode);

      output.error ? reject(output.error) : resolve(output.code);
    });
  }

  /**
   * Returns a promise for a transpiled code, if bad code is provided it would reject with a syntax error
   * @param {String} esCode es6 code
   * @param {Boolean} minified (default is node)
   */
  transpile(esCode, minified = false) {
    return new Promise(resolve =>
      resolve(babel.transform(esCode, { presets: ['env'], minified }).code)
    );
  }

  /**
   * Returns a promise for a list of all files linked by `import` to the input file
   * @param {String} fileName
   */
  mapFile(fileName, options = []) {
    return new Promise(resolve =>
      resolve(mapper.map(fileName, importPattern$2, options))
    );
  }

  /**
   * Returns a promise for a code of all files linked by `import` to the input files
   * @param {String[]} input list of files to load
   * @param {String} format of output files (default is 'cjs')
   */

  loadFiles(input, format = defaultFormat, external = [], globals = {}) {
    return Promise.all(
      input.map(file => this.loadFile(file, format, external, globals))
    ).then(res =>
      res.reduce(
        (memo, item) => {
          memo.files = memo.files.concat(item.files);
          memo.content += item.content;
          return memo;
        },
        { files: [], content: '' }
      )
    );
  }

  /**
   * Returns a promise for a code of all files linked by `import` to the input file
   * @param {String} input filename
   * @param {String} format of output files (default is 'cjs')*
   */
  loadFile(input, format = defaultFormat, external = [], globals = {}) {
    return rollup
      .rollup({ input, external })
      .then(bundle => bundle.generate({ format, globals }))
      .then(result => ({
        files: result.modules,
        content: result.code
      }))
      .catch(err => {
        this.handleError(err);
        return { files: [], content: '' };
      });
  }

  /** Sets a handler to call upon on error event
   * @param {Function} handler delegate
   */
  onError(handler) {
    this.handleError = handler;
    mapper.onError(handler);
  }
}

var js = new JS();

// copyFileSync was added only at node v8.5, so we need to provide backward compatibility
const copyFile =
  fs.copyFileSync ||
  ((file, fileTarget) => fs.writeFileSync(fileTarget, fs.readFileSync(file)));

/**
 * Return the file's target path by merging by replacing the sourcePath with targetPath
 * If source path contains /** /*.*' it is ignored
 * @param {String} file
 * @param {String} sourcePath
 * @param {String} targetPath
 */
function getFileTargt(file, sourcePath, targetPath) {
  if (file === sourcePath) {
    return targetPath + file.substr(file.lastIndexOf('/'));
  }

  if (targetPath.match(/\/$/)) {
    return (
      targetPath + file.replace(sourcePath.replace('/**/*.*', '') + '/', '')
    );
  }

  return targetPath;
}

var files = {
  /**
   * copy source files to target
   * @param {String[]} source (or a single string)
   * @param {String} target
   */
  copy(source, target) {
    const handleFile = (task, file) => {
      let fileTarget = getFileTargt(file, task.source, task.target);

      if (fs.lstatSync(file).isDirectory()) {
        this.addPath(fileTarget);
        sources.push({ source: `${file}/**/*.*`, target: fileTarget + '/' });
      } else {
        promises.push(
          new Promise((resolve, reject) => {
            this.addFilePath(fileTarget);
            let err = copyFile(file, fileTarget);
            if (err) {
              console.error(
                `GroundUp:copyFile failed: ${file} => ${fileTarget}`
              );
              reject(err);
            } else {
              resolve();
            }
          })
        );
      }
    };

    let sources = Array.isArray(source)
        ? source.map(source => ({ source, target }))
        : [{ source, target }],
      promises = [];

    this.addPath(target.substring(0, target.lastIndexOf('/')));

    while (sources.length) {
      let task = sources.pop();
      glob.sync(task.source, {}).forEach(handleFile.bind({}, task));
    }

    return Promise.all(promises);
  },

  /**
   * Returns a promise for a list of all files matching the fileName pattern
   * @param {String} fileName
   */
  mapFile(fileName) {
    return new Promise(resolve => resolve(glob.sync(fileName, {})));
  },

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
  },

  /**
   * Verifies a path of a file exists by creating each folder if not already exists
   * This means that the last element in the string will not be created as a folder (as it is a file)
   * @param {String} filePath
   */
  addFilePath(filePath) {
    filePath
      .split('/')
      .slice(0, -1)
      .reduce((acc, folder) => {
        acc += folder;

        // when path is absolute ('/Volumes...') the first acc ==='' so we shouldn't try to create it
        if (acc.length && !fs.existsSync(acc)) {
          fs.mkdirSync(acc);
        }
        return acc + '/';
      }, '');
  },

  /**
   * Removes a file or folder and its content recursively
   * @param {String} path
   */
  removePath(path) {
    let curPath;

    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach(file => {
        curPath = path + '/' + file;

        if (fs.statSync(curPath).isDirectory()) {
          // recursive
          this.removePath(curPath);
        } else {
          // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  }
};

const defaultHandleError = error => console.error(error),
  WATCH_TIMEOUT = 2000,
  types = new Map([
    ['js', { regExp: /\.js$/, id: 'js', handler: js }],
    ['css', { regExp: /\.css$/, id: 'css', handler: css }],
    ['html', { regExp: /\.html$/, id: 'html', handler: html }],
    ['files', { regExp: /\/$/, id: 'files', handler: files }]
  ]);

/**
 * Runs `method()` and conole.time the time it took, along with `label`
 * @param {String} label
 * @param {Function} method
 */
function logged(label, method) {
  const time = new Date();
  label = `${padTwoDigits(time.getHours())}:${padTwoDigits(
    time.getMinutes()
  )}:${padTwoDigits(time.getSeconds())} ${label}`;
  console.time(label);
  method();
  console.timeEnd(label);
}

function padTwoDigits(num) {
  return ('00' + num).slice(-2);
}

/**
 * loads and parse application maps
 * @param {String} fileName
 * @throws NotFoundError if file not found
 * TBD: check file content for required fields
 */
function readMapFile(fileName) {
  if (!fs.existsSync(fileName)) {
    throw new Errors.NotFound('map.json', fileName);
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

  Object.keys(entries).forEach(entry =>
    map.set(entry, getMappedEntries(path, entries[entry]))
  );

  return map;
}

/**
 * Returns
 * @param {String} output fileName
 * @param {Strings[]} files to watch
 * @param {Function} mapFunc
 * @param {String} target folder
 */
function getWatcherPromises(output, files$$1, mapFunc, target, handleError) {
  let options, external;

  if (files$$1.source) {
    options = files$$1;
    external = options.external;
    files$$1 = files$$1.source;
  }
  return files$$1.map(file =>
    mapFunc(file, external).then(results =>
      getWatchers(file, results, output, target, options, handleError)
    )
  );
}

/**
 * Returns an array of objects { file(name), watcher }
 * @param {String[]} files files to watch
 * @param {String} output file name
 * @param {String} target path
 */
function getWatchers(rootFile, files$$1, output, target, options, handleError) {
  return files$$1.map(file => {
    let timeOut; // fs.watch tends to run twice so we'll debounce it using a timeout

    return {
      file,
      options,
      watcher: chokidar.watch(file, (eventType, triggering) => {
        if (!timeOut) {
          timeOut = setTimeout(() => {
            logged(
              `${colors.FgGreen}✓${colors.Reset} ${colors.Dim}Recompiled${
                colors.Reset
              } ` + `${colors.FgCyan}${output}${colors.Reset}`,
              writeToFile
                .bind(
                  {},
                  target,
                  output,
                  options || rootFile,
                  getFileType(output),
                  triggering
                )
                .catch(handleError)
            );
            timeOut = null;
          }, WATCH_TIMEOUT);
        }
      })
    };
  });
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
 * Compile and writes a file to the file-system. if file type is `static` and source is missing, it will remove target file
 * @param {String} targetPath
 * @param {String} targetFileName
 * @param {String} sourceFile
 * @param {Object} fileTypeDef containing `id` and a `handler` that has a `compile` function (unless `id`===`static)
 * @param {String} triggeredByFile a source file which was deleted (and should be removed from target folder)
 */
function writeToFile(
  targetPath,
  targetFileName,
  sourceFile,
  fileTypeDef,
  triggeredByFile
) {
  let absoluteTarget = getAbsolutePath(targetPath, targetFileName);

  if (fileTypeDef.id === 'files') {
    if (triggeredByFile !== undefined) {
      removeFileIfRedundant(
        triggeredByFile,
        sourceFile,
        `${targetPath}/${targetFileName}`
      );
    }
    return files.copy(sourceFile, getAbsolutePath(targetPath, targetFileName));
  } else {
    return fileTypeDef.handler.compile(sourceFile).then(response => {
      files.addPath(
        absoluteTarget.substring(0, absoluteTarget.lastIndexOf('/'))
      );
      fs.writeFileSync(absoluteTarget, response.content);
      return response;
    });
  }
}

/**
 * Removes a file if not found in source
 * @param {String} file
 * @param {String[]} entries
 * @param {String} destPath
 */
function removeFileIfRedundant(file, entries, destPath) {
  if (
    !entries.find(entry => {
      if (entry === file) {
        // if entry is the actual file
        return fs.existsSync(entry);
      } else if (entry.substring(entry.length - 1) === '/') {
        // if entry is a folder containing the file
        return fs.existsSync(`${entry}${file}`);
      }
      return false;
    }) &&
    fs.existsSync(`${destPath}${file}`)
  ) {
    fs.unlinkSync(`${destPath}${file}`);
  }
}

/**
 * return an array of source from app.map.json "entries" object
 * @param {Object} entry
 */
function getMappedEntries(source, entry) {
  let sources;

  if (entry instanceof Object) {
    if (Array.isArray(entry)) {
      sources = entry;
    } else {
      let entryCopy = Object.assign({}, entry);
      entryCopy.source = getMappedEntries(source, entryCopy.source);
      return entryCopy;
    }
  } else {
    sources = [entry];
  }

  return sources.map(file => getAbsolutePath(source, file));
}

/**
 * Builds destination folder according to appMap description
 * @param {Object} appMap OR filename
 */
function once(appMap, handleError = defaultHandleError) {
  if (typeof appMap === 'string') {
    appMap = readMapFile(appMap);
  }

  let source = appMap.source || '',
    target = appMap.target || '';

  return Promise.all(
    Object.keys(appMap.entries).map(entry =>
      writeToFile(
        target,
        entry,
        getMappedEntries(source, appMap.entries[entry]),
        getFileType(entry)
      ).catch(handleError)
    )
  );
}

/**
 * Creates watches to listen to sources files of appMap description
 * @param {Object} appMap OR filename
 */
function live(appMap, handleError = defaultHandleError) {
  if (typeof appMap === 'string') {
    appMap = readMapFile(appMap);
  }

  let target = appMap.target || '',
    entries = getAbsolutePathes(appMap.source || '', appMap.entries);

  return Promise.all(
    Array.from(entries.keys())
      .map(entry =>
        getWatcherPromises(
          entry,
          entries.get(entry),
          getFileType(entry).handler.mapFile,
          target,
          handleError
        )
      )
      .reduce((acc, promise) => acc.concat(promise), [])
  ).then(watcheArrays =>
    watcheArrays.reduce((acc, watches) => acc.concat(watches), [])
  );
}

class Build {
  constructor() {
    this.handleError = defaultHandleError;
  }

  once(appMap) {
    return once(appMap);
  }

  live(appMap) {
    return live(appMap);
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
      once: this.once.bind(this),
      live: this.live.bind(this),
      onError: this.onError.bind(this)
    };
  }
}

let build = new Build().getFacade();

const stdin = process.stdin;

let args = process.argv.slice(
    process.argv.indexOf(process.mainModule.filename) + 1
  ),
  isLive = process.argv.indexOf('--live') > -1,
  isBuildNow = !isLive || process.argv.indexOf('--build-now') > -1,
  mapFiles = args.filter(arg => !arg.startsWith('--'));

if (mapFiles.length === 0) {
  console.log('Usage: node build.js [--live [--build-now]] app.map.json');
  process.exit(1);
}

mapFiles.forEach(fileName => {
  if (fs__default.existsSync(fileName)) {
    if (isBuildNow) {
      once(fileName);
    }

    if (isLive) {
      live(fileName);
    }
  } else {
    console.error(
      `${colors.BgRed}Map file not found:${colors.Reset} ${fileName}. ${
        colors.Dim
      }Exiting...${colors.Reset}`
    );
    process.exit();
  }
});

if (isLive) {
  console.log('Watching for changes. Hit ctrl-c to stop.');

  // without this, we would only get streams once enter is pressed
  stdin.setRawMode(true);

  // resume stdin in the parent process (node app won't quit all by itself
  // unless an error or process.exit() happens)
  stdin.resume();

  // i don't want binary, do you?
  stdin.setEncoding('utf8');

  // on any data into stdin
  stdin.on('data', function(key) {
    // ctrl-c ( end of text )
    if (key === '\u0003') {
      process.exit();
    }
    // write the key to stdout all normal like
    process.stdout.write(key);
  });
}
