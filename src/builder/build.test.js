/*global beforeEach */
const assert = require('assert'),
  fs = require('fs'),
  util = require('util'),
  promiseTimeOut = util.promisify(setTimeout),
  build = require('./build.js');
  

describe('build.js', () => {
  describe('once()', () => {
    it('should build a dist', done => {
      let appMap = JSON.parse(fs.readFileSync('./tests/app.map.json', 'utf-8'));

      build.once(appMap).then(() => {
        assert.equal(JSON.stringify(fs.readdirSync(appMap.target)), 
          JSON.stringify([ 'entry.html',
            'main.css',
            'main.js',
            'static',
            'webWorker.js' ]));
        done();
      });
    });
  });

  describe('live():static', () => {
    let staticTestTarget = './tests/dist/static/timestamp.txt',
        appMap = JSON.parse(fs.readFileSync('./tests/app.map.json', 'utf-8')),
        staticTestSource = './tests/subfolder/timestamp.txt',
        watches = [];

        if (fs.existsSync(staticTestTarget)) {
          fs.unlinkSync(staticTestTarget);
        }

    it('should update static after an update', done => {
      build.live(appMap).then(newWatches => {
        watches = newWatches;
        fs.writeFileSync(staticTestSource,(new Date()).getTime());
        
        promiseTimeOut(1000)
          .then(() =>{
            assert.equal(fs.existsSync(process.cwd() + '/' + staticTestTarget), true);
          })
          .catch(err => console.log(err))
          .then(done);
      }).catch(err => done(err));
    });

    it('should update static after file remove', done => {
      fs.unlinkSync(staticTestSource);

      promiseTimeOut(1000)
        .then(() => {
          assert.equal(fs.existsSync(staticTestTarget), false);
          watches.forEach(watch => watch.close());
        })
        .then(done);
    });
  });

  describe('live()', () => {
    it('should update build js an update', done => {
      let appMap = JSON.parse(fs.readFileSync('./tests/app.map.json', 'utf-8')),
        fileName = './tests/live-build-asset.js',
        jsCode = fs.readFileSync(fileName, 'utf-8'),
        updatedJsCode = jsCode + '\nlet x = 1;';

      build.live(appMap).then(watches => {
        fs.writeFileSync(fileName, updatedJsCode);
        
        promiseTimeOut(1000)
          .then(() => {
            assert.equal(fs.readFileSync(fileName, 'utf-8'), updatedJsCode);
            watches.forEach(watch => watch.close());
            fs.writeFileSync(fileName, jsCode);
          })
          .then(done);
      }).catch(err => done(err));
    });
  });
});