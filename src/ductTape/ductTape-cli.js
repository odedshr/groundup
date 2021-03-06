import builder from './builder.js';
import colors from '../etc/console-colors.js';
import fs from 'fs';

function getMapFiles() {
  const maps = process.argv.slice(2).filter(arg => !arg.startsWith('--')),
    packageFileName = './package.json',
    defaultFileName = './app.map.json';

  if (maps.length === 0 && fs.existsSync(defaultFileName)) {
    maps.push(defaultFileName);
  }

  if (maps.length === 0 && fs.existsSync(defaultFileName)) {
    maps.push(packageFileName);
  }

  return maps;
}

const stdin = process.stdin,
  isWatching = process.argv.indexOf('--watch') > -1,
  isBuildNow = !isWatching || process.argv.indexOf('--build-now') > -1,
  mapFiles = getMapFiles();


if (mapFiles.length === 0) {
  console.log('Usage: node build.js [--watch [--build-now]] app.map.json');
  process.exit(1);
}

mapFiles.forEach(fileName => {
  if (fs.existsSync(fileName)) {
    if (isBuildNow) {
      builder.build(fileName);
    }

    if (isWatching) {
      builder.watch(fileName);
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

if (isWatching) {
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
