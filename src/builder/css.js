import mapNested from './map-nested.js';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import CleanCSS from 'clean-css';
import nodeSass from 'node-sass';
  
const prefix = postcss([ autoprefixer ]),
  sass = data => nodeSass.renderSync({ data }).css.toString(),
  importPattern = '^@import.*(["\'])(.*)\\1.*$';
  
export default {
  /**
   * Returns a promise for a merged, transpiled and minified version of a scss file
   * @param {String} fileName of scss file
   */
  compile(fileName) {
    return this.loadFile(fileName)
    .then(fileSet => {
      if(fileSet.content.length === 0) {
        return fileSet;
      }

      return this.sass(fileSet.content)
      .then(this.prefix, Array.isArray(fileName) ? fileName[0]: fileName)
      .then(this.minify)
      .then(compiledAndMinified => {
        fileSet.content = compiledAndMinified;
        return fileSet;
      });
    });
  },

  /**
   * Returns a promise for a minified css code
   * @param {String} css code 
   */
  minify(css) {
    return new Promise(resolve => resolve(new CleanCSS({level: 2}).minify(css).styles));
  },

  /**
   * Returns a promise for a auto-prefixed css code
   * @param {String} css code
   */
  prefix(css) {
    return prefix.process(css, { from: '' }).then(prefixed => prefixed.css);
  },

  /**
   * Returns a promise for a transpiled css code
   * @param {String} scss 
   */
  sass(scss) {
    return new Promise(resolve => resolve(sass(scss)));
  },

  /**
   * Returns a promise for a list of all files linked by `import` to the input file
   * @param {String} fileName 
   */
  mapFile(fileName) {
    return new Promise(resolve => resolve(mapNested(fileName, importPattern)));
  },

  /**
   * Returns a promise for a code of all files linked by `import` to the input file
   * @param {String} fileName 
   */
  loadFile(fileName) {
    return new Promise(resolve => resolve(mapNested.load(fileName, importPattern)));
  }
};