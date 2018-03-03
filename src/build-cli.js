let args = process.argv.slice(process.argv.indexOf(process.mainModule.filename) + 1),
  isLive = (process.argv.indexOf('--live') > -1),
  mapFiles = args.filter(arg => !arg.startsWith('--'));

  if (mapFiles.length === 0) {
    console.log('Usage: node build.js [--live] app.map.json');
    process.exit(1);
  }

  mapFiles.forEach(fileName => {
    console.log('process file');
  });