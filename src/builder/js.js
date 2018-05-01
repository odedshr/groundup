import rollup from 'rollup';
import babel from 'babel-core';
import UglifyJS from 'uglify-js';
import mapNested from './map-nested.js';

const importPattern = `import.*(["\\'])(.*\\.js)\\1`;
  
export default {
   /**
   * Returns a promise for a merged, transpiled and uglified version of an es6 file
   * @param {String} fileName of scss file
   */
  compile(fileName) {
    if (!Array.isArray(fileName)) {
      fileName = [ fileName ];
    }

    return this.loadFiles(fileName)
      .then(fileSet => {
        if(fileSet.content.length === 0) {
          return fileSet;
        }

        return this.transpile(fileSet.content)
          .then(this.minify)
          .then(transpiledAndUglified => {
            fileSet.content = transpiledAndUglified;
            return fileSet;
          });
      });
  },

  /**
  * Returns a promise for a minified js code
  * @param {String} jsCode code 
  */
  minify(jsCode) {
    return new Promise((resolve, reject) => {
      let output = UglifyJS.minify(jsCode);
      
      output.error ? reject(output.error) : resolve(output.code);
    });
  },

  /**
  * Returns a promise for a transpiled code
  * @param {String} esCode es6 code
  * @param {Boolean} minified (default is node)
  */
  transpile(esCode, minified = false) {
    return new Promise(resolve => resolve(babel.transform(esCode, { presets: ['env'], minified }).code));
  },

  /**
  * Returns a promise for a list of all files linked by `import` to the input file
  * @param {String} fileName 
  */
  mapFile(fileName) {
    return new Promise(resolve => resolve(mapNested(fileName, importPattern)));
  },
  
  /**
   * Returns a promise for a code of all files linked by `import` to the input files
   * @param {String[]} input list of files to load
   * @param {String} format of output files (default is 'cjs')
   */  
  loadFiles(input, format = 'cjs') {
    return Promise
      .all(input.map(file => this.loadFile(file, format)))
      .then(res => res.reduce((memo, item) => {
        memo.files = memo.files.concat(item.files);
        memo.content += item.content;
        return memo;
      }, { files: [], content: ''}));
  },

  /**
  * Returns a promise for a code of all files linked by `import` to the input file
  * @param {String} input filename
  * @param {String} format of output files (default is 'cjs')* 
  */
  loadFile(input, format = 'cjs') {
    return rollup.rollup({ input })
      .then(bundle => bundle.generate({ format }))
      .then (result => ({
        files: result.modules,
        content: result.code
      }));
  }
};