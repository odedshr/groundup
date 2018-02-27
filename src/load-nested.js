const fs = require('fs'),

  getFilePath = fileName => {
    let startOfName = fileName.lastIndexOf('/');
    if (startOfName === -1) {
      return '';
    } else {
      return fileName.substr(0,startOfName + 1);
    }
  },

  loadNested = (fileName, importPattern) => {
    const importRegex = new RegExp(importPattern,'mg');

    if (!fs.existsSync(fileName)) {
      throw Error('fileNotFound:' + fileName);
    }

    let content = fs.readFileSync(fileName, 'utf-8'),
        filePath = getFilePath(fileName),
        match;

    while ((match = importRegex.exec(content)) !== null) {
      content = content.replace(match[0], loadNested(filePath + match[2], importPattern));
    }

    return content;
  };

module.exports = loadNested;