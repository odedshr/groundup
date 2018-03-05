const mapNested = require('./map-nested.js'),
  postcss = require('postcss'),
  prefix = postcss([ require('autoprefixer') ]),
  CleanCSS = require('clean-css'),
  sass = data => require('node-sass').renderSync({ data }).css.toString(),
  importPattern = '^@import.*(["\'])(.*)\\1.*$';
  
  function Compiler() {}

  Compiler.prototype = {
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

    minify(css) {
      return new Promise(resolve => resolve(new CleanCSS({level: 2}).minify(css).styles));
    },

    prefix(css, from = '') {
      return prefix.process(css, { from }).then(prefixed => prefixed.css);
    },

    sass(scss) {
      return new Promise(resolve => resolve(sass(scss)));
    },

    mapFile(fileName) {
      return new Promise(resolve => resolve(mapNested(fileName, importPattern)));
    },

    loadFile(fileName) {
      return new Promise(resolve => resolve(mapNested.load(fileName, importPattern)));
    }
  };

module.exports = new Compiler();