import { minify }  from 'html-minifier';
import mapNested from './map-nested.js';

const importPattern = '<link rel="import" href=(["\'])(.*\.html)\\1 data-replace="true"\\s*\\/>';
  
export default {

  /**
   * Returns a promise for a merged and minified version of a html file
   * @param {String} fileName of scss file
   */
  compile(fileName) {
    return this.loadFile(fileName)
    .then(fileSet => {
      if(fileSet.content.length === 0) {
        return fileSet;
      }

      return this.minify(fileSet.content)
        .then(minified => {
          fileSet.content = minified;
          return fileSet;
        });
    });
  },

  /**
   * Returns a promise for a minified html code
   * @param {String} css code 
   */
  minify(html) {
    return new Promise(resolve => resolve(minify(html,{
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
    })));
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