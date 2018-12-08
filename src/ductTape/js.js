import fs from 'fs';
import rollup from 'rollup';
import babel from 'babel-core';
import UglifyJS from 'uglify-js';
import mapper from './mapper.js';
import Errors from '../etc/Errors.js';
import colors from '../etc/console-colors.js';

const importPattern = `import.*(["\\'])(.*\\.js)\\1`,
  defaultFormat = 'cjs';

function getLogLabel(verb, subject) {
  const time = new Date(),
    padTwoDigits = num => ('00' + num).slice(-2);

  return `${padTwoDigits(time.getHours())}:${padTwoDigits(time.getMinutes())}:` +
    `${padTwoDigits(time.getSeconds())} ${colors.FgRed}✖${colors.Reset} ` +
    `${colors.Dim}${verb}${colors.Reset} ${colors.FgCyan}${subject}${colors.Reset}`;
}

class JS {
  constructor() {
    this.handleError = error =>
      console.error(getLogLabel('ductTape.js: An error has occoured', `(${error.message}):`), error.toString());
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
      external = this.getExternalsFromPackageJson(),
      globals = {},
      format = defaultFormat;

    if (options instanceof Object) {
      if (Array.isArray(options)) {
        // options is just an array of sources
        filenames = options;
      } else {
        // options is a complex object
        filenames = this.getArray(options.source);
        external = external.concat(this.getArray(options.external || []));
        format = options.format || format;
        globals = options.globals || globals;
      }
    } else {
      //options is just a string
      filenames = [options];
    }

    return this.loadFiles(filenames, format, external, globals)
      .then(
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
              if (err.codeFrame) {
                this.handleError(new Errors.BadInput(JSON.stringify(filenames), err.codeFrame, err));
              } else {
                this.handleError(new Errors.Custom('ductTape.js.transpile', JSON.stringify(filenames), err));
              }

              return fileSet;
            });
        }
      );
  }

  /**
   * Return an array of the current-folder package.json's dependencies and devDependencies
   * If no package.json found, returns and empty array silently
   */
  getExternalsFromPackageJson() {
    if (fs.existsSync('./package.json')) {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

      return [...Object.keys(packageJson.dependencies  || {}), ...Object.keys(packageJson.devDependencies || {})];
    }

    return [];
  }

  getArray(item) {
    return Array.isArray(item)  ? [...item] : [item];
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
   * Returns a list of all files linked by `import` to the input file
   * @param {String} fileName
   */
  mapFile(fileName, options = []) {
    return mapper.map(fileName, importPattern, options);
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
        this.handleError(wrapRollUpError(input, err));

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

function wrapRollUpError(input, error) {
  switch (error.code) {
    case 'PARSE_ERROR':
      return new Errors.BadInput(`${error.loc.file}:${error.loc.line}:${error.loc.column}`, error.frame);
    case 'MISSING_EXPORT':
      return new Errors.BadInput(`${error.loc.file}:${error.loc.line}:${error.loc.column}`, error.message);
    default:
      console.trace(error);

      return new Errors.Custom('ductTape.js.loadFile', input, error);
  }
}

export default new JS();
