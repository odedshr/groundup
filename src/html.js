const loadNested = require('./load-nested.js'),
  minify = require('html-minifier').minify,
  importPattern = '<link rel="import" href=(["\'])(.*\.html)\\1 data-replace="true"\\s*\\/>';
  
  function Compiler() {}

  Compiler.prototype = {
    compile(fileName) {
      return this.getFlatten(fileName)
      .then(fileSet => {
        return this.minify(fileSet.content)
          .then(transpiledAndUglified => {
            fileSet.content = transpiledAndUglified;
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

    getFlatten(fileName) {
      return new Promise(resolve => resolve(loadNested(fileName, importPattern)));
    }
  };

module.exports = new Compiler();