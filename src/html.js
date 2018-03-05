const minify = require('html-minifier').minify,
  mapNested = require('./map-nested.js'),
  importPattern = '<link rel="import" href=(["\'])(.*\.html)\\1 data-replace="true"\\s*\\/>';
  
  function Compiler() {}

  Compiler.prototype = {
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

    mapFile(fileName) {
      return new Promise(resolve => resolve(mapNested(fileName, importPattern)));
    },

    loadFile(fileName) {
      return new Promise(resolve => resolve(mapNested.load(fileName, importPattern)));
    }
  };

module.exports = new Compiler();