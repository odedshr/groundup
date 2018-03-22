# GroundUp
Backgroud scripts and tools for my apps

## CSS
### minify(css) => minifiedCssString
### prefix(css, fileName) => cssWithVendorPrefixesString
`Prefix` adds `-moz` and `-webkit` prefix where necessary in accordance to (https://caniuse.com/)[https://caniuse.com/].
This uses (http://postcss.org/)[http://postcss.org/] which I personally don't like but it's required by (https://github.com/postcss/autoprefixer)][https://github.com/postcss/autoprefixer]
which is the best (if not the only?) plugin to do the job while keep itself up-to-date.
### sass(scss) => cssString
### mapFile(fileName) => [ linkedFilesArray ]
Files are linked using the `@import` command

### loadFile(fileName) => fileContentWithImportsReplacdToActualFile
### compile(fileName) => { content: minify(prefix(sass(loadFile(fileName))), files: [ linkedFilesArray ] }

## HTML

### minify(html) => minifiedHtmlString
### mapFile(fileName) => [ linkedFilesArray ]
Files are linked using the `<link rel="import" href="filename.html" data-replace="true" />` tag

### loadFile(fileName) => fileContentWithImportsReplacdToActualFile

### compile(fileName) => { content: minify(loadFile(fileName)), files: [ linkedFilesArray ] }

## JS
### minify(js) => minifiedJsString
### trasnpile(es6Code) => es2015Code
### mapFile(fileName) => [ linkedFilesArray ]
Files are linked using the `require('filename.js')` command

### loadFile(fileName) => fileContentWithImportsReplacdToActualFile
### compile(fileName) => { content: minify(transpile(loadFile(fileName)), files: [ linkedFilesArray ] }

## Static
### copy(source, target)
### removeFolder(path)
Removes folder (with content)

### mapFile(pattern) => [ filesMatchingPatternArray ]

## Build
The Build module process a fileMap and create each entry based on its inputs.
For example:

{
  "source": "tests/",
  "target": "tests/dist",
  "entries": {
    "entry.html": ["file1.html"],
    "main.js": ["file1.js"],
    "main.css": ["file1.scss", "file2.scss"],
    "webWorker.js": ["live-build-asset.js"],
    "static/": ["subfolder/"]
  }
}

- 'source' serves as the baseline folder from which files should be copied
- 'target' serves as a baseline folder in which entries should be created
- 'entries' is a map of target files (html, css, js or files and folders that should be copied as-is) and sources

### once(fileMap) => Promise that fileMap was processed
### live(fileMap) => [ WatchesArray ]

### CLI
## node ./src/build-cli.js app.map.json
will build the project once

## node ./src/build-cli.js app.map.json --live
will keep watching the files for changes