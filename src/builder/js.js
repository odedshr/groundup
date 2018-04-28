const fs = require('fs'),
  rollup = require('rollup'),
  babel = require('babel-core'),
  UglifyJS = require('uglify-js'),
  mapNested = require('./map-nested.js'),
  errors = require('../etc/errors.js'),

  //importPattern = 'require\\((["\'])(.*\\.js)\\1\\)';
  importPattern = `import.*(["\\'])(.*\\.js)\\1`;
  
  class Compiler {
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
    
    loadFiles(input, format = 'cjs') {
      return Promise
        .all(input.map(file => this.loadFile(file, format)))
        .then(res => res.reduce((memo, item) => {
          memo.files = memo.files.concat(item.files);
          memo.content += item.content;
          return memo;
        }, { files: [], content: ''}));
    }

    loadFile(input, format = 'cjs') {
      return rollup.rollup({ input })
        .then(bundle => bundle.generate({ format }))
        .then (result => ({
          files: result.modules,
          content: result.code
        }));
    }
  }

module.exports = new Compiler();