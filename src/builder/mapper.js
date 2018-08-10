import fs from 'fs';
import Errors from '../etc/Errors.js';

class Mapper {
  constructor() {
    this.handleError = error => {
      console.log(error);
    };
  }

  getFilePath(fileName) {
    let startOfName = fileName.lastIndexOf('/');
    if (startOfName === -1) {
      return '';
    } else {
      return fileName.substr(0, startOfName + 1);
    }
  }

  map(fileName, importPattern, external = []) {
    let files = Array.isArray(fileName) ? fileName : [fileName];

    return files
      .map(file => this.mapSingleNested(file, importPattern, external))
      .reduce((acc, item) => acc.concat(item), []);
  }

  mapSingleNested(fileName, importPattern, external) {
    const importRegex = new RegExp(importPattern, 'mg');

    if (!fs.existsSync(fileName)) {
      if (external.indexOf(fileName) === -1) {
        this.handleError(new Errors.NotFound('file', fileName));
      }
      return [];
    }

    let files = [fileName],
      content = fs.readFileSync(fileName, 'utf-8'),
      filePath = this.getFilePath(fileName),
      match;

    while ((match = importRegex.exec(content)) !== null) {
      if (
        files.indexOf(filePath + match[2]) === -1 &&
        external.indexOf(match[2]) === -1
      ) {
        files = files.concat(
          this.mapSingleNested(
            filePath + match[2].replace(/^\.\//, ''),
            importPattern,
            external
          )
        );
      }
    }

    return files;
  }

  load(fileName, importPattern) {
    let files = Array.isArray(fileName) ? fileName : [fileName];

    return files.map(file => this.loadSingleNested(file, importPattern)).reduce(
      (acc, item) => {
        acc.files = acc.files.concat(item.files);
        acc.content += item.content;
        return acc;
      },
      { files: [], content: '' }
    );
  }

  loadSingleNested(fileName, importPattern) {
    const importRegex = new RegExp(importPattern, 'mg');

    if (!fs.existsSync(fileName)) {
      this.handleError(new Errors.NotFound('file', fileName));
      return { files: [], content: '' };
    }

    let files = [fileName],
      content = fs.readFileSync(fileName, 'utf-8'),
      filePath = this.getFilePath(fileName),
      match;

    while ((match = importRegex.exec(content)) !== null) {
      if (files.indexOf(filePath + match[2]) === -1) {
        try {
          let child = this.loadSingleNested(filePath + match[2], importPattern);

          content = content.replace(match[0], child.content);
          files = files.concat(child.files);
        } catch (err) {
          this.handleError(err);
        }
      }
      // be sure to reset the regex index not to mess it up with empty files
      importRegex.lastIndex = 0;
    }

    return { files, content };
  }

  /** Sets a handler to call upon on error event
   * @param {Function} handler delegate
   */
  onError(handler) {
    this.handleError = handler;
  }

  /**
   * Returns only the public methods
   */
  getFacade() {
    return {
      map: this.map.bind(this),
      load: this.load.bind(this),
      onError: this.onError.bind(this)
    };
  }
}

export default new Mapper().getFacade();
