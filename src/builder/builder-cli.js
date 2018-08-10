import { once, live } from './build.js';
import colors from '../etc/console-colors.js';
import fs from 'fs';

function getMapFiles() {
  const maps = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  if (maps.length === 0 && fs.existsSync('./package.json')) {
    let appMap = JSON.parse(fs.readFileSync('./package.json')).applicationMap;

    if (appMap !== undefined) {
      maps.push(appMap);
    }
  }
  if (maps.length === 0 && fs.existsSync('./app.map.json')) {
    maps.push('./app.map.json');
  }
  return maps;
}

const stdin = process.stdin,
  isLive = process.argv.indexOf('--live') > -1,
  isBuildNow = !isLive || process.argv.indexOf('--build-now') > -1,
  mapFiles = getMapFiles();


if (mapFiles.length === 0) {
  console.log('Usage: node build.js [--live [--build-now]] app.map.json');
  process.exit(1);
}

mapFiles.forEach(fileName => {
  if (fs.existsSync(fileName)) {
    if (isBuildNow) {
      once(fileName);
    }

    if (isLive) {
      live(fileName);
    }
  } else {
    console.error(
      `${colors.BgRed}Map file not found:${colors.Reset} ${fileName}. ${
        colors.Dim
      }Exiting...${colors.Reset}`
    );
    process.exit();
  }
});

if (isLive) {
  console.log('Watching for changes. Hit ctrl-c to stop.');

  // without this, we would only get streams once enter is pressed
  stdin.setRawMode(true);

  // resume stdin in the parent process (node app won't quit all by itself
  // unless an error or process.exit() happens)
  stdin.resume();

  // i don't want binary, do you?
  stdin.setEncoding('utf8');

  // on any data into stdin
  stdin.on('data', function(key) {
    // ctrl-c ( end of text )
    if (key === '\u0003') {
      process.exit();
    }
    // write the key to stdout all normal like
    process.stdout.write(key);
  });
}
