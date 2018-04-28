const fs = require('fs'),
  errors = require('../etc/errors.js'),
  log = console.log,

  getFilePath = fileName => {
    let startOfName = fileName.lastIndexOf('/');
    if (startOfName === -1) {
      return '';
    } else {
      return fileName.substr(0,startOfName + 1);
    }
  },

  mapNested = (fileName, importPattern) => {
    let files = Array.isArray(fileName) ? fileName : [ fileName ];

    return files.map(file => mapSingleNested(file, importPattern))
    .reduce((acc, item) => acc.concat(item), []);
  },

  mapSingleNested = (fileName, importPattern) => {
    const importRegex = new RegExp(importPattern,'mg');

    if (!fs.existsSync(fileName)) {
      throw errors.notFound('mapSingleNested', fileName);
    }

    let files = [ fileName ],
      content = fs.readFileSync(fileName, 'utf-8'),
      filePath = getFilePath(fileName),
      match;

    while ((match = importRegex.exec(content)) !== null) {
      if (files.indexOf(filePath + match[2]) === -1 ) {
        files = files.concat(mapSingleNested(filePath + match[2].replace(/^\.\//,''), importPattern));
      }
    }

    return files;
  },

  loadNested = (fileName, importPattern) => {
    let files = Array.isArray(fileName) ? fileName : [ fileName ];

    return files.map(file => loadSingleNested(file, importPattern))
      .reduce((acc, item) => {
        acc.files = acc.files.concat(item.files);
        acc.content += item.content;
        return acc;
      }, { files: [], content: ''});
  },

  loadSingleNested = (fileName, importPattern) => {
    const importRegex = new RegExp(importPattern,'mg');

    if (!fs.existsSync(fileName)) {
      log(errors.notFound('loadSingleNested', fileName));

      return { files: [], content: ''};
    }

    let files = [ fileName ],
      content = fs.readFileSync(fileName, 'utf-8'),
      filePath = getFilePath(fileName),
      match;

    while ((match = importRegex.exec(content)) !== null) {
      if (files.indexOf(filePath + match[2]) === -1 ) {
        let child = loadSingleNested(filePath + match[2], importPattern);
        content = content.replace(match[0], child.content);
        files = files.concat(child.files);
      }
    }

    return { files, content };
  };

mapNested.load = loadNested;

module.exports = mapNested;