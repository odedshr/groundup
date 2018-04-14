const fs = require('fs'),
  webpack = require('webpack'),
  MemoryFileSystem = require('memory-fs'),
  babel = require('babel-core'),
  UglifyJS = require('uglify-js'),
  mapNested = require('./map-nested.js'),
  errors = require('../etc/errors.js'),

  importPattern = 'require\\((["\'])(.*\\.js)\\1\\)';
  
  class Compiler {
    compile(fileName) {
      return this.loadFile(fileName)
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
    }

    minify(css) {
      return new Promise((resolve, reject) => {
        let output = UglifyJS.minify(css);
        
        output.error ? reject(output.error) : resolve(output.code);
      });
    }

    transpile(escode, minified = false) {
      return new Promise(resolve => resolve(babel.transform(escode, { presets: ['env'], minified }).code));
    }

    mapFile(fileName) {
      return new Promise(resolve => resolve(mapNested(fileName, importPattern)));
    }
    
    loadFile(fileName) {
      let tempOutputFileName = 'output.js',
      compiler = webpack({
        entry: fileName,
        output: { filename: tempOutputFileName },
        mode: 'production'
      }),
      memFs = compiler.outputFileSystem = new MemoryFileSystem();

      return new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
          if (err) {
            return reject(err);
          }
  
          const outputPath = `${compiler.options.output.path}/${compiler.options.output.filename}`;
  
          resolve({
            files: stats.toJson().modules.map(module => module.identifier),
            content: memFs.existsSync(outputPath) ? memFs.readFileSync(outputPath, 'utf-8') : ''
          });
        });
      });
    }
  }

module.exports = new Compiler();