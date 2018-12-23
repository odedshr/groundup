import mapper from './mapper.js';
import { render } from 'less';
import LessPluginAutoPrefix from 'less-plugin-autoprefix';
import CleanCSS from 'clean-css';

const plugins = [new LessPluginAutoPrefix({ browsers: ['last 2 versions'] })],
  importPattern = '^@import.*(["\'])(.*)\\1.*$';

class CSS {
  constructor() {
    this.handleError = error => {
      console.log(error);
    };
  }

  /**
   * Returns a promise for a merged, transpiled and minified version of a scss file
   * @param {String} fileName of scss file
   */
  async compile(fileName) {
    return this.loadFile(fileName.source || fileName)
      .then(fileSet => {
        if (fileSet.content.length === 0) {
          return fileSet;
        }

        return this.render(fileSet.content)
          .catch(err => {
            this.handleError(err);
            return '';
          })
          .then(this.minify)
          .then(compiledAndMinified => {
            fileSet.content = compiledAndMinified;
            return fileSet;
          });
      })
      .catch(err => {
        this.handleError(err);
        return { files: [], content: '' };
      });
  }

  /**
   * Returns a promise for a minified css code
   * @param {String} css code
   */
  minify(css) {
    return new Promise(resolve =>
      resolve(new CleanCSS({ level: 2 }).minify(css).styles)
    );
  }

  /**
   * Returns a promise for a transpiled css code
   * @param {String} lessString
   */
  render(lessString) {
    return render(lessString, { plugins }).then(result => result.css);
  }

  /**
   * Returns a list of all files linked by `import` to the input file
   * @param {String} fileName
   */
  mapFile(fileName) {
    return mapper.map(fileName, importPattern);
  }

  /**
   * Returns a promise for a code of all files linked by `import` to the input file
   * @param {String} fileName
   */
  loadFile(fileName) {
    return new Promise(resolve =>
      resolve(mapper.load(fileName, importPattern))
    );
  }

  /** Sets a handler to call upon on error event
   * @param {Function} handler delegate
   */
  onError(handler) {
    this.handleError = handler;
    mapper.onError(handler);
  }
}

export default new CSS();
