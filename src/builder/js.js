import rollup from 'rollup';
import babel from 'babel-core';
import UglifyJS from 'uglify-js';
import mapper from './mapper.js';

const importPattern = `import.*(["\\'])(.*\\.js)\\1`,
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
      resolve(mapper.map(fileName, importPattern, options))
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

export default new JS();
