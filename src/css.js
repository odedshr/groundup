const loadNested = require('./load-nested.js'),
  postcss = require('postcss'),
  prefix = postcss([ require('autoprefixer') ]),
  CleanCSS = require('clean-css'),
  sass = data => require('node-sass').renderSync({ data }).css.toString(),
  importPattern = '^@import.*(["\'])(.*)\\1.*$';
  
  function Compiler() {}

  Compiler.prototype = {
    compile(fileName) {
      this.getFlatten(fileName)
        .then(this.sass)
        .then(this.prefix, fileName)
        .then(this.minify);
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

    getFlatten(fileName) {
      return new Promise(resolve => resolve(loadNested(fileName, importPattern)));
    }
  };

module.exports = new Compiler();