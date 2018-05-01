# GroundUp
Backgroud scripts and tools for my applications

## Installation
Install with npm:
```
  npm install groundup
```

## Usage
Run with node:
```
  node ./bin/builder-cli.js [applicationMap] [--live [--build-now]]
```
If no parameters given, builder will build target files once and quit.

- `--live` (optional) would keep the builder running and watching for changes in source files

- `--build-now` (optional, relevant only in `--live` mode) will build the target files and start watching source files

## The application map
The application map is the set of instructions for the builder:
```
{
  "source": "src/",
  "target": "dist/",
  "entries": {
    "index.html": ["file1.html"],
    "main.js": ["file1.js", "tools.js"],
    "main.css": ["file1.scss", "file2.scss"],
    "webWorker.js": ["web-worker.js", "tools.js"],
    "static/": ["subfolder/"]
  }
}
```
- `source` serves as the baseline folder from which files should be copied
- `target` serves as a baseline folder in which entries should be created
- `entries` is a map of target files (html, css, js or files and folders that should be copied as-is) and sources

## node ./bin/builder-cli.js app.map.json
will build the project once

## node ./bin/builder-cli.js app.map.json --live
will keep watching the files for changes
## Builder
### builder.css
- minify(css) => minifiedCssString
- prefix(css, fileName) => cssWithVendorPrefixesString
`Prefix` adds `-moz` and `-webkit` prefix where necessary in accordance to (https://caniuse.com/)[https://caniuse.com/].
This uses (http://postcss.org/)[http://postcss.org/] which I personally don't like but it's required by (https://github.com/postcss/autoprefixer)][https://github.com/postcss/autoprefixer]
which is the best (if not the only?) plugin to do the job while keep itself up-to-date.
- sass(scss) => cssString
- mapFile(fileName) => [ linkedFilesArray ]
Files are linked using the `@import` command
- loadFile(fileName) => fileContentWithImportsReplacdToActualFile
- compile(fileName) => { content: minify(prefix(sass(loadFile(fileName))), files: [ linkedFilesArray ] }

### builder.html

- minify(html) => minifiedHtmlString
- mapFile(fileName) => [ linkedFilesArray ]
Files are linked using the `<link rel="import" href="filename.html" data-replace="true" />` tag
- loadFile(fileName) => fileContentWithImportsReplacdToActualFile
- compile(fileName) => { content: minify(loadFile(fileName)), files: [ linkedFilesArray ] }

### builder.js
- minify(js) => minifiedJsString
- trasnpile(es6Code) => es2015Code
- mapFile(fileName) => [ linkedFilesArray ]
Files are linked using the `require('filename.js')` command
- loadFile(fileName) => fileContentWithImportsReplacdToActualFile
- compile(fileName) => { content: minify(transpile(loadFile(fileName)), files: [ linkedFilesArray ] }

### builder.files
- copy(source, target)
- mapFile(pattern) => [ filesMatchingPatternArray ]
- addPath(path)
create the path (recursively)
- removePath(folder)
Removes folder (with content)

### builder.builder
The Build module process a fileMap and create each entry based on its inputs.
- once(fileMap) => Promise that fileMap was processed
- live(fileMap) => [ WatchesArray ]


## Additional notes
- I'm not really using hoek, but it's being using by some dependecies and I must
force it to its latest version as earlier ones have security issues