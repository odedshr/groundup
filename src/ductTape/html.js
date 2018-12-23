import { minify } from 'html-minifier';
import mapper from './mapper.js';

const importPattern =
  '<link rel="import" href=(["\'])(.*.html)\\1 data-replace="true"\\s*\\/>';

class HTML {
  constructor() {
    this.handleError = error => {
      console.log(error);
    };
  }

  /**
   * Returns a promise for a merged and minified version of a html file
   * @param {String} fileName of scss file
   */
  async compile(fileName) {
    return this.loadFile(fileName.source || fileName).then(fileSet => {
      if (fileSet.content.length === 0) {
        return fileSet;
      }

      return this.minify(fileSet.content).then(minified => {
        fileSet.content = minified;

        return fileSet;
      });
    });
  }

  /**
   * Returns a promise for a minified html code
   * @param {String} css code
   */
  minify(html) {
    return new Promise(resolve =>
      resolve(
        minify(html, {
          collapseBooleanAttributes: true,
          collapseInlineTagWhitespace: true,
          collapseWhitespace: true,
          conservativeCollapse: true,
          decodeEntities: true,
          removeAttributeQuotes: true,
          keepClosingSlash: true,
          minifyCSS: true,
          minifyJS: true,
          minifyURLs: true,
          preserveLineBreaks: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          sortAttributes: true,
          sortClassName: true,
          useShortDoctype: true
        })
      )
    );
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

export default new HTML();
