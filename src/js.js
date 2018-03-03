const webpack = require('webpack'),
  MemoryFileSystem = require('memory-fs'),
  babel = require('babel-core'),
  UglifyJS = require("uglify-js");
  
  function Compiler() {}

  Compiler.prototype = {
    compile(fileName) {
      return this.getFlatten(fileName)
        .then(fileSet => {
          return this.transpile(fileSet.content)
            .then(this.minify)
            .then(transpiledAndUglified => {
              fileSet.content = transpiledAndUglified;
              return fileSet;
            });
        });
    },

    minify(css) {
      return new Promise((resolve, reject) => {
        let output = UglifyJS.minify(css);
        
        output.error ? reject(output.error) : resolve(output.code);
      });
    },

    transpile(escode, minified = false) {
      return new Promise(resolve => resolve(babel.transform(escode, { presets: ['env'], minified }).code));
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