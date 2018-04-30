/*global beforeEach */
const assert = require('assert'),
  fs = require('fs'),
  util = require('util'),
  promiseTimeOut = util.promisify(setTimeout),
  build = require('./build.js');
  

describe('build.js', () => {
  describe('once()', () => {
    it('should build a dist', done => {
      let appMap = JSON.parse(fs.readFileSync('./tests/resources/app.map.json', 'utf-8'));

      build.once(appMap).then(() => {
        assert.equal(JSON.stringify(fs.readdirSync(appMap.target)), 
          JSON.stringify([ 'entry.html',
            'main.css',
            'main.js',
            'static',
            'webWorker.js' ]));
      })
      .catch (res => res)
      .then(done);
    });
  });

  describe('live():static', () => {
    let staticTestTarget = './tests/dist/static/timestamp.txt',
        appMap = JSON.parse(fs.readFileSync('./tests/resources/app.map.json', 'utf-8')),
        staticTestSource = './tests/resources/subfolder/timestamp.txt',
        watches = [];

        if (fs.existsSync(staticTestTarget)) {
          fs.unlinkSync(staticTestTarget);
        }

    it('should update static after an update', done => {
      build.live(appMap).then(newWatches => {
        watches = newWatches;
        fs.writeFileSync(staticTestSource,(new Date()).getTime());
        
        return promiseTimeOut(1000)
          .then(() =>{
            assert.equal(fs.existsSync(process.cwd() + '/' + staticTestTarget), true);
          });
      })
      .catch (res => res)
      .then(done);
    });

    it('should update static after file remove', done => {
      fs.unlinkSync(staticTestSource);

      promiseTimeOut(1000)
        .then(() => {
          assert.equal(fs.existsSync(staticTestTarget), false);
          watches.forEach(watch => watch.watcher.close());
        })
        .catch (res => res)
        .then(done);
    });
  });

  describe('live()', function () {
    this.timeout(10000);

    it('should watch a child file', done => {
      let appMap = JSON.parse(fs.readFileSync('./tests/resources/app.map.json', 'utf-8')),
        fileName = process.cwd() + '/tests/resources/live-build-asset-child.js';

      build.live(appMap).then(watches => {
        assert.equal(watches.find(watch => (watch.file === fileName)) !== undefined, true);
      })
      .catch (res => res)
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
        return promiseTimeOut(8000)
          .then(() => {
            let newFileContent = fs.readFileSync('./tests/dist/webWorker.js', 'utf-8');
            
            watches.forEach(watch => watch.watcher.close());
            fs.writeFileSync(fileName, jsCode); //revert the file before assert that might fail

            assert.equal(newFileContent.indexOf(uniqueString) > -1, true);
          });
      })
      .catch (res => res)
      .then(done);
    });
  });
});