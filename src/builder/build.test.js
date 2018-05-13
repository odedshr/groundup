/*global beforeEach */
const assert = require('assert'),
  fs = require('fs'),
  build = require('../../dist/builder.js').build;
  

describe('builder', () => {
  xdescribe('once()', () => {
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
      .catch (err => err)
      .then(done);
    });
  });

  describe('live():static', () => {
    let staticTestTarget = `${process.cwd()}/tests/dist/static/timestamp.txt`,
        appMap = JSON.parse(fs.readFileSync('./tests/resources/app.map.json', 'utf-8')),
        staticTestSource = `${process.cwd()}/tests/resources/subfolder/timestamp.txt`,
        watches = [];

        if (fs.existsSync(staticTestTarget)) {
          fs.unlinkSync(staticTestTarget);
        }

    it('should obtain list of watches', done => {
      build.live(appMap).then(watches => {
        assert.equal(watches.map(watch => watch.file).join().replace(new RegExp(process.cwd(),'g'),''),'/tests/resources/file1.html,/tests/resources/file1.1.html,/tests/resources/file-with-external.js,/tests/resources/file1.scss,/tests/resources/file1.1.scss,/tests/resources/file2.scss,/tests/resources/subfolder/file2.1.scss,/tests/resources/live-build-asset.js,/tests/resources/live-build-asset-child.js,/tests/resources/subfolder/');
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
    it('should update build when js file udpates', done => {
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