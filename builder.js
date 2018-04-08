const { once, live } = require('./src/build.js'),
  colors = require('./src/console-colors.js'),  
  fs = require('fs'),
  stdin = process.stdin;

let args = process.argv.slice(process.argv.indexOf(process.mainModule.filename) + 1),
  isLive = (process.argv.indexOf('--live') > -1),
  isBuildNow = !isLive || (process.argv.indexOf('--build-now') > -1),
  mapFiles = args.filter(arg => !arg.startsWith('--'));

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
    console.error(`${colors.BgRed}Map file not found:${colors.Reset} ${fileName}. ${colors.Dim}Exiting...${colors.Reset}`);
    process.exit();
  }
});

if (isLive) {
  console.log('Watching for changes. Hit ctrl-c to stop.');

  // without this, we would only get streams once enter is pressed
  stdin.setRawMode( true );

  // resume stdin in the parent process (node app won't quit all by itself
  // unless an error or process.exit() happens)
  stdin.resume();

  // i don't want binary, do you?
  stdin.setEncoding( 'utf8' );

  // on any data into stdin
  stdin.on( 'data', function( key ){
    // ctrl-c ( end of text )
    if ( key === '\u0003' ) {
      process.exit();
    }
    // write the key to stdout all normal like
    process.stdout.write( key );
  });
}
