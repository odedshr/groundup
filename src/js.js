const webpack = require('webpack'),
  MemoryFileSystem = require('memory-fs');

const postcss = require('postcss'),
  prefix = postcss([ require('autoprefixer') ]),
  CleanCSS = require('clean-css'),
  sass = data => require('node-sass').renderSync({ data }).css.toString();
  
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
      let filename = 'output.js',
        compiler = webpack({
          entry: fileName,
          output: { filename },
          mode: 'production'
        }),
        memFs = compiler.outputFileSystem = new MemoryFileSystem();

      return new Promise((resolve, reject) => compiler.run((err, stats) => {
        if (err) {
          return reject(err);
        }

        const outputPath = `${compiler.options.output.path}/${compiler.options.output.filename}`;
        
        resolve({
          files: stats.toJson().modules.map(module => module.identifier),
          content: memFs.readFileSync(outputPath, 'utf-8')
        });
      }));
    }
  };

module.exports = new Compiler();