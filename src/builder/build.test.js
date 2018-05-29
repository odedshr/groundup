/*global xit */
const assert = require('assert'),
  fs = require('fs'),
  build = require('../../dist/builder.js').build;
  

describe('builder', () => {
  const appMap = JSON.parse(fs.readFileSync('./tests/resources/app.map.json', 'utf-8')),
    buildOutput = JSON.stringify([ 'entry.html',
      'main.css',
      'main.js',
      'static',
      'webWorker.js' ]);
      
  describe('once()', () => {
    it('should build a dist', done => {
      build.once(appMap).then(() => {
        assert.equal(JSON.stringify(fs.readdirSync(appMap.target)), buildOutput);
      })
      .catch (err => err)
      .then(done);
    });

    it('should ignore a missing file in map', done => {
      const appMap = JSON.parse(fs.readFileSync('./tests/resources/app.map.json', 'utf-8'));

      appMap.entries['main.js'].source.push('this-file-dosnt-exists.js');
      build.onError(error => {
        assert.equal(('' + error).replace(new RegExp(process.cwd(),'g'),''), 'Error: Could not resolve entry (/tests/resources/this-file-dosnt-exists.js)');
      });
      build.once(appMap).then(() => {
        assert.equal(JSON.stringify(fs.readdirSync(appMap.target)), buildOutput);
      })
      .catch (err => err)
      .then(done);
    });
  });

  describe('live():static', () => {
    let staticTestTarget = `${process.cwd()}/tests/dist/static/timestamp.txt`,
        staticTestSource = `${process.cwd()}/tests/resources/subfolder/timestamp.txt`,
        watches = [];

        if (fs.existsSync(staticTestTarget)) {
          fs.unlinkSync(staticTestTarget);
        }

    it('should obtain list of watches', done => {
      build.live(appMap).then(watches => {
        let watchMap = watches.map(watch => watch.file).join().replace(new RegExp(process.cwd(),'g'),''),
          expected = ['/tests/resources/file1.html',
            '/tests/resources/file1.1.html',
            '/tests/resources/file-with-external.js',
            '/tests/resources/file1.scss',
            '/tests/resources/file1.1.scss',
            '/tests/resources/file2.scss',
            '/tests/resources/subfolder/file2.1.scss',
            '/tests/resources/live-build-asset.js',
            '/tests/resources/live-build-asset-child.js',
            '/tests/resources/subfolder/'].join();

        assert.equal(watchMap, expected);
      })
      .catch (err => err)
      .then(done);      
    });

    it('should update static after an update', done => {
      build.live(appMap).then(newWatches => {
        watches = newWatches;
        fs.writeFileSync(staticTestSource,(new Date()).getTime());
        
        setTimeout(() =>{
          assert.equal(fs.existsSync(staticTestTarget), true);
        }, 1100);
      })
      .catch (err => err)
      .then(done);
    });

    it('should update static after file remove', done => {
      fs.unlinkSync(staticTestSource);

      setTimeout(() => {
        assert.equal(fs.existsSync(staticTestTarget), false);
        watches.forEach(watch => watch.watcher.close());
        done();
      }, 1000);
    });
  });

  describe('live()', function () {
    it('should watch a child file', done => {
      let appMap = JSON.parse(fs.readFileSync('./tests/resources/app.map.json', 'utf-8')),
        fileName = process.cwd() + '/tests/resources/live-build-asset-child.js';

      build.live(appMap).then(watches => {
        assert.equal(watches.find(watch => (watch.file === fileName)) !== undefined, true);
      })
      .catch (err => err)
      .then(done);
    });

    /* This test turns on watchers, make a change in a file and checks whether the watcher has changed the time
    * At the moment, watcher response-time is arbitrary and so the test might fail to timeout error
    */
    xit('should update build when js file udpates', done => {
      let appMap = JSON.parse(fs.readFileSync('./tests/resources/app.map.json', 'utf-8')),
        fileName = './tests/resources/live-build-asset-child.js',
        jsCode = fs.readFileSync(fileName, 'utf-8'),
        uniqueString = `test ${(new Date()).getTime()}`,
        updatedJsCode = jsCode.replace(/testing build\.live/, uniqueString);

      build.live(appMap).then(watches => {
        fs.writeFileSync(fileName, updatedJsCode);
        setTimeout(() => {
          let newFileContent = fs.readFileSync('./tests/dist/webWorker.js', 'utf-8');
          
          watches.forEach(watch => watch.watcher.close());
          fs.writeFileSync(fileName, jsCode); //revert the file before assert that might fail

          assert.equal(newFileContent.indexOf(uniqueString) > -1, true);
        }, 8000);
      })
      .catch (err => err)
      .then(done);
    });
  });
});