import {
  copyFileSync,
  existsSync,
  mkdirSync,
  lstatSync,
  readdirSync,
  statSync,
  unlinkSync,
  rmdirSync,
  readFileSync,
  writeFileSync
} from 'fs';
import glob from 'glob';

// copyFileSync was added only at node v8.5, so we need to provide backward compatibility
const copyFile =
  copyFileSync ||
  ((file, fileTarget) => writeFileSync(fileTarget, readFileSync(file)));

/**
 * @returns the file's target path by merging by replacing the sourcePath with targetPath
 * If source path contains /** /*.*' it is ignored
 * @param {String} file
 * @param {String} sourcePath
 * @param {String} targetPath
 */
function getFileTargt(file, sourcePath, targetPath) {
  sourcePath = sourcePath.replace('/**/*.*', '');
  file = file.replace(sourcePath, '');

  // copying a folder
  if (file === sourcePath) {
    return targetPath + file.substr(file.lastIndexOf('/') + 1);
  }

  // copy a file to a new folder
  if (targetPath.match(/\/$/)) {
    return (
      targetPath + file.replace(sourcePath.replace('/**/*.*', ''), '')
    );
  }
  // copy to file target as is
  return targetPath;
}

/**
 * @returns the the file's path, if item is a folder, return it as it is
 * @param {*} path
 */
function getFileFolder(path) {
  return lstatSync(path.replace('/**/*.*', '')).isDirectory() ? path : path.substr(0, path.lastIndexOf('/'));
}

export default {
  /**
   * copy source files to target
   * @param {String[]} source (or a single string)
   * @param {String} target
   */
  copy(source, target) {
    const handleFile = (task, file) => {
      let fileTarget = getFileTargt(file, getFileFolder(task.source), task.target);

      if (lstatSync(file).isDirectory()) {
        this.addPath(fileTarget);
        sources.push({ source: `${file}/**/*.*`, target: fileTarget.replace(/\/$/, '') + '/' });
      } else {
        promises.push(
          new Promise((resolve, reject) => {
            this.addFilePath(fileTarget);
            let err = copyFile(file, fileTarget);

            if (err) {
              console.error(
                `GroundUp:copyFile failed: ${file} => ${fileTarget}`
              );
              reject(err);
            } else {
              resolve(fileTarget);
            }
          })
        );
      }
    };

    let sources = Array.isArray(source)
        ? source.map(source => ({ source, target }))
        : [{ source, target }],
      promises = [];

    this.addPath(target.substring(0, target.lastIndexOf('/')));

    while (sources.length) {
      let task = sources.pop();

      glob.sync(task.source, {}).forEach(handleFile.bind({}, task));
    }

    return Promise.all(promises);
  },

  /**
   * Returns a list of all files matching the fileName pattern
   * @param {String} fileName
   */
  mapFile(fileName) {
    return glob.sync(fileName, {});
  },

  /**
   * Verifies path exists by creating each folder if not already exists
   * @param {String} path
   */
  addPath(path) {
    path.split('/').reduce((acc, folder) => {
      acc += folder;

      // when path is absolute ('/Volumes...') the first acc ==='' so we shouldn't try to create it
      if (acc.length && !existsSync(acc)) {
        mkdirSync(acc);
      }

      return acc + '/';
    }, '');
  },

  /**
   * Verifies a path of a file exists by creating each folder if not already exists
   * This means that the last element in the string will not be created as a folder (as it is a file)
   * @param {String} filePath
   */
  addFilePath(filePath) {
    filePath
      .split('/')
      .slice(0, -1)
      .reduce((acc, folder) => {
        acc += folder;

        // when path is absolute ('/Volumes...') the first acc ==='' so we shouldn't try to create it
        if (acc.length && !existsSync(acc)) {
          mkdirSync(acc);
        }

        return acc + '/';
      }, '');
  },

  /**
   * Removes a file or folder and its content recursively
   * @param {String} path
   */
  removePath(path) {
    let curPath;

    if (existsSync(path)) {
      readdirSync(path).forEach(file => {
        curPath = path + '/' + file;

        if (statSync(curPath).isDirectory()) {
          // recursive
          this.removePath(curPath);
        } else {
          // delete file
          unlinkSync(curPath);
        }
      });
      rmdirSync(path);
    }
  }
};
