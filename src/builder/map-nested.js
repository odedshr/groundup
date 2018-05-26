import fs  from 'fs';
import colors from '../etc/console-colors.js';

const log = console.log,

  getFilePath = fileName => {
    let startOfName = fileName.lastIndexOf('/');
    if (startOfName === -1) {
      return '';
    } else {
      return fileName.substr(0,startOfName + 1);
    }
  },

  mapNested = (fileName, importPattern, external = []) => {
    let files = Array.isArray(fileName) ? fileName : [ fileName ];

    return files.map(file => mapSingleNested(file, importPattern, external))
    .reduce((acc, item) => acc.concat(item), []);
  },

  mapSingleNested = (fileName, importPattern, external) => {
    const importRegex = new RegExp(importPattern,'mg');

    if (!fs.existsSync(fileName)) {
      if (external.indexOf(fileName) === -1) {
        consoleErrorMissingFile(fileName);
      }
      return [];
    }

    let files = [ fileName ],
      content = fs.readFileSync(fileName, 'utf-8'),
      filePath = getFilePath(fileName),
      match;

    while ((match = importRegex.exec(content)) !== null) {
      if (files.indexOf(filePath + match[2]) === -1 && external.indexOf(match[2]) === -1) {
        files = files.concat(mapSingleNested(filePath + match[2].replace(/^\.\//,''), importPattern, external));
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
      consoleErrorMissingFile(fileName);
      return { files: [], content: '' };
    }

    let files = [ fileName ],
      content = fs.readFileSync(fileName, 'utf-8'),
      filePath = getFilePath(fileName),
      match;

    while ((match = importRegex.exec(content)) !== null) {
      if (files.indexOf(filePath + match[2]) === -1 ) {
        try {
          let child = loadSingleNested(filePath + match[2], importPattern);

          content = content.replace(match[0], child.content);
          files = files.concat(child.files);
        }
        catch (err) {
          log(err);
        }
      }
      // be sure to reset the regex index not to mess it up with empty files
      importRegex.lastIndex = 0;
    }

    return { files, content };
  },

  consoleErrorMissingFile = (fileName) => {
    console.error(`${ colors.FgRed }ERROR LOADING MISSING FILE ${ colors.FgWhite }${ fileName }\n${ colors.Reset }`);
  };

mapNested.load = loadNested;

export default mapNested;