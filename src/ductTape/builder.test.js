/*global xit */
const assert = require('assert'),
  fs = require('fs'),
  ductTape = require('../../.bin/ductTape.js')
  builder = ductTape.builder,
  files = ductTape.files,

  appMapFile = './tests/resources/app.map.json';

describe('ductTape', () => {
  const appMap = JSON.parse(
      fs.readFileSync(appMapFile, 'utf-8')
    ).ductTape,
    buildOutput = JSON.stringify([
    'entry.html',
    'main.css',
    'main.js',
    'static',
    'webWorker.js'
  ]);

  afterEach(() => {
    if (fs.existsSync(appMap.target)) {
      files.removePath(appMap.target);
    }
  })

  describe('build()', () => {
    it('should build a dist', done => {
      builder
        .build(appMap)
        .then(() => {
          assert.equal(
            JSON.stringify(fs.readdirSync(appMap.target)),
            buildOutput
          );
        })
        .catch(err => err)
        .then(done);
    });

    it('should ignore a missing file in map', done => {
      const appMap = JSON.parse(
        fs.readFileSync(appMapFile, 'utf-8')
      ).ductTape;

      appMap.entries['main.js'].source.push('this-file-dosnt-exists.js');
      builder.onError(error => {
        assert.equal(
          ('' + error.toString()).replace(new RegExp(process.cwd(), 'g'), ''),
          'compile-source not Found: /tests/resources/this-file-dosnt-exists.js'
        );
      });
      builder
        .build(appMap)
        .then(() => {
          assert.equal(
            JSON.stringify(fs.readdirSync(appMap.target)),
            buildOutput
          );
        })
        .catch(err => console.trace(err))
        .then(done);
    });

    it('should have errors listing names of empty bundles', done => {
      builder.onError(error => {
        assert.equal(
          ('' + error.toString()).replace(new RegExp(process.cwd(), 'g'), ''),
          'compile-source not Found: /tests/resources/this-file-dosnt-exists.js'
        );
      });
      builder
        .build(JSON.parse(
          fs.readFileSync('./tests/resources/empty-bundle.map.json', 'utf-8')
        ).ductTape)
        .then(() => {
          assert.equal(JSON.stringify(fs.readdirSync(appMap.target)), '["webWorker.js"]');
        })
        .catch(err => err)
        .then(done);
    });
  });

  describe('watch():files', () => {
    const staticTestTarget = `${process.cwd()}/tests/dist/static/timestamp.txt`,
      staticTestSource = `${process.cwd()}/tests/resources/subfolder/timestamp.txt`,
      staticAppMap = {
        source: 'tests/resources',
        target: 'tests/dist',
        entries: {
          'static/': ['subfolder/']
        }
      };

    beforeEach(() => {
      [staticTestSource, staticTestTarget].forEach( file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    });

    it('should obtain list of watches', () => {
      const watchers = builder.watch(appMap),
        watchMap = watchers
          .map(watch => watch.file)
          .join()
          .replace(new RegExp(process.cwd(), 'g'), ''),
        expected = [
          '/tests/resources/file1.html',
          '/tests/resources/file1.1.html',
          '/tests/resources/file-with-external.js',
          '/tests/resources/file1.less',
          '/tests/resources/file1.1.less',
          '/tests/resources/file2.less',
          '/tests/resources/subfolder/file2.1.less',
          '/tests/resources/live-build-asset.js',
          '/tests/resources/live-build-asset-child.js',
          '/tests/resources/subfolder/'
        ].join();
      assert.equal(watchMap, expected);
      builder.stopWatching();
    });

    xit('should update static after an update', done => {
      const fileContent = new Date().getTime();

      builder.build(staticAppMap)
        .then(() => {
          const watchers = builder.watch(appMap);
          watchers.forEach(watcher => {
            watcher.handlers.push(() => {
              assert.equal(fs.readFileSync(staticTestTarget, 'utf-8'), fileContent);
              builder.stopWatching();
              done();
            });
          });

          fs.writeFileSync(staticTestSource, fileContent);
        })
        .catch(err => err);
    }).timeout(5000);

    xit('should update static after file remove', done => {
      const fileContent = new Date().getTime();

      builder.build(staticAppMap)
        .then(() => {
          const watchers = builder.watch(appMap);
          watchers.forEach(watcher => {
            watcher.handlers.push((event, path) => {
              switch(event) {
                case 'change':
                  assert.equal(fs.readFileSync(staticTestTarget, 'utf-8'), fileContent);
                  fs.unlinkSync(staticTestSource);
                break;
                case 'unlink':
                  assert.equal(fs.existsSync(staticTestTarget), false);
                  builder.stopWatching();
                  done();
                break;
                default:
                  assert.fail(`unknown event occured: ${({event, path})}`);
                  break;
              }
            });
          });

          fs.writeFileSync(staticTestSource, fileContent);
        })
        .catch(err => err);    
    }).timeout(5000);
  });

  describe('live()', function() {
    it('should watch a child file', done => {
      let appMap = JSON.parse(
          fs.readFileSync(appMapFile, 'utf-8')
        ).ductTape,
        fileName = process.cwd() + '/tests/resources/live-build-asset-child.js';

      builder.build(appMap)
        .then(() => {
          const watchers = builder.watch(appMap);
          assert.equal(
            watchers.find(watch => watch.file === fileName) !== undefined,
            true
          );
          builder.stopWatching();
          done();
        })
        .catch(err => err)
    }).timeout(8000);

    xit('should update build when js file udpates', done => {
      const appMap = JSON.parse(
          fs.readFileSync(appMapFile, 'utf-8')
        ).ductTape,
        fileName = './tests/resources/live-build-asset-child.js',
        jsCode = fs.readFileSync(fileName, 'utf-8'),
        uniqueString = `"test ${new Date().getTime()}"`,
        updatedJsCode = jsCode.replace(/"test \d+"/, uniqueString);
      
      builder
        .build(appMap)
        .then(() => {
          const watchers = builder.watch(appMap);

          watchers.forEach(watcher => {
            watcher.handlers.push(() => {
              // previous handler hasn't necessarily finished
              setTimeout(() => {
                let newFileContent = fs.readFileSync(
                  './tests/dist/webWorker.js',
                  'utf-8'
                );
                builder.stopWatching();
                fs.writeFileSync(fileName, jsCode); //revert the file before assert that might fail
                assert.equal(newFileContent.indexOf(uniqueString) > -1, true);
                done();
              }, 2000);
            });
          });

          fs.writeFileSync(fileName, updatedJsCode);
        })
        .catch(err => err)
    }).timeout(10000);

    xit('should watch the map.file', done => {
      const dynamicMapFile = './tests/resources/dynamic.map.json',
        ductTape = JSON.parse(
          fs.readFileSync(dynamicMapFile, 'utf-8')
        ).ductTape,
        clone = Object.assign({}, ductTape),
        target = `tests/dynamic-dist-${new Date().getTime()}`;
      
      try {
        builder
          .watch(dynamicMapFile)
          .filter(watcher => watcher.type === 'map')
          .forEach(watcher => 
            watcher.handlers.push((event, path) => 
              setTimeout(() => {
                builder.stopWatching();
                fs.writeFileSync(dynamicMapFile, JSON.stringify({ ductTape }, null, 2));
                assert.equal(
                  JSON.stringify(fs.readdirSync(target)),
                  '["entry.html"]'
                );
                files.removePath(target);
                done();
              }, 3000)
            )
          );    
        
        clone.target = target;
        fs.writeFileSync(dynamicMapFile, JSON.stringify({ ductTape: clone }, null, 2)); 
      }
      catch (err) {
        console.error(err);
        fs.writeFileSync(dynamicMapFile, JSON.stringify({ ductTape }, null, 2));
      }
    }).timeout(5000);
  });
});
