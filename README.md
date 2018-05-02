# GroundUp

[![Build Status](https://travis-ci.org/odedshr/groundup.svg?branch=master)](https://travis-ci.org/odedshr/groundup)
[![Dependency Status](https://david-dm.org/odedshr/groundup.svg?theme=shields.io)](https://david-dm.org/odedshr/groundup)
[![NPM Downloads](https://img.shields.io/npm/dw/groundup.svg)](https://www.npmjs.com/package/groundup)
[![MIT License](https://img.shields.io/github/license/odedshr/groundup.svg)](https://github.com/odedshr/groundup/blob/master/LICENSE)
[![Version](https://img.shields.io/npm/v/groundup.svg)](https://www.npmjs.com/package/groundup)

Backgroud scripts and tools for my applications


## Installation
Install with npm:
```
  npm install groundup
```

## Usage

### Building
Run with node:
```
  node ./node-modules/groundup/bin/builder-cli.js [applicationMap] [--live [--build-now]]
```
If no parameters given, builder will build target files once and quit.
```
node ./node-modules/groundup/bin/builder-cli.js app.map.json
```

- `--live` (optional) would keep the builder running and watching for changes in source files

- `--build-now` (optional, relevant only in `--live` mode) will build the target files and start watching source files
```
node ./node-modules/groundup/bin/builder-cli.js app.map.json --live --build-now
```

#### The application map
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

## Builder
```
import { builder } from 'groundup'
```

### builder.css
- minify(css) => minifiedCssString
- prefix(css, fileName) => cssWithVendorPrefixesString
`Prefix` adds `-moz` and `-webkit` prefix where necessary in
accordance to [https://caniuse.com/](https://caniuse.com/).
This uses [(]http://postcss.org/](http://postcss.org/) which I personally don't like but it's required by [https://github.com/postcss/autoprefixer](https://github.com/postcss/autoprefixer)
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

## HTMLCompiler
```
import { HtmlCompiler } from 'groundup'
```

HTMLCompiler is a rather simple template-engine, taking after [handlebar](https://handlebarsjs.com/)  with a few tweaks of my own

### Simple example: Hello World!
Rendering the template _```Hello {{name}}```_ with the data ```{ name:'World' }``` will result the string '```Hello World```'.

## When data is an object
Data may contain an object, for example:
```
{user:{name:'World'}}
```
In which case the template should specify _```Hello {{user.name}}```_.

### When data is a function
Data may contain a function, for example:
```
{name: function () { return 'world'}}
```
but this will be automatically identified, so the template will remain _```Hello {{name}}```_.

### Conditionals
Conditionals allow hiding some of the template according to a variable. for example:
```
Hello {{?showName}}{{name}}{{/showName}}
```
```showName``` can either be a boolean or a function returning a boolean. _```Hello {{?!showName}}no name provided{{/showName}}```_ will show '```no name provided```' ONLY if show equals false.

### Shortcut to Object's sub-variables in the data
When data contain an object, it is possible to easily access Object's properties using '@', for example:
```
{{@user}}{{fName}} {{lName}}{{/user}}
```
is equal to 
```
{{user.fName}} {{user.lName}}
```

### Iterating arrays in the data
It is possible to iterate arrays in the data using the loop _```{{item@group}}```_, for example:
```
{{user@users}} {{name}} {{/user@users}}
```
Note this means the data should look like ```{users:{user:[{name:'John'},{name:'David'}]}}```.

You may define a counter by appending to the prefix tag ':' and the name of the new variable, for example:
```
{{item@group:_idx}} {{_idx}} {{/item@group}}
```
**Please note the counter doesn't appear at the closing tag**.

However, if your data is a straightforward array, like this - _```{users:[{name:'John'},{name:'David'}]}```_, the loop will run on its original scope, and the iterator variable will be in the variable provided (in our case - user). In such case, the template would be:
```
{{user@users:_idx}} {{_idx}}. {{user.name}} {{/user@users}}
```

### Sub-templates
A template may refer to another template using the syntax data:template, for example ```{{user:userTemplate}}```. In our example, the user will be sent as data for the userTemplate.

### Using 'this'
Sometime you might want to retrieve the entire data. This can be done using '```.```'. For example, when our data contains an array of strings - ```{fruits:{fruit:['orange','apple','melon']}}``` you may print the list using the iteration command :
```
{{fruit@fruits}} {{.}}, {{/fruit@fruits}}
```

### Changing the delimiters
If your template contains the string '```{{```' (or '```}}```') you might want to temporarily replace the delimiters. You can do so with the _```{{'startTag','endTag'}} ... '{{/'startTag','endTag'}}```_, for example:
```
{{'<?','?>'}}Hello <?name?>{{/'<?','?>'}}
```


### Translation
It is advised that strings shouldn't be hard-coded in your structure, rather than use variables that can be translates. This can easily be done using '```#string.code```', for example:
```
{{#label.hello}}}
```
The string code is comprised with two elements, separated by a '.': context and default-value. The context is meant to help you know where and how the string is used; default-value is the string that appear in case the current locale doesn't contain the string-code. It is worth to emphasize that the translation files include the full string code (in our example '**label.hello**'). The default value begins after the first '.' and may contain any character (including spaces).

### Comments
You can write comments in your template code by using the ```{{!--comment goes here--}}``` pattern.

### Order of rendering
Let's look at this sample-data:
````
{{main:{isVisible:true,sub:{isVisible:false}}}}
````
and the template
```
{{@sub}}{{?isVisible}}Hello!{{/isVisible}}{{/sub}}
```
the variable that will be checked is sub.isVisible (and not main.isVisible). This means the order of parsing the template is crucial. It follows this logic:
- Replace delimiters where needed
- Remove comments
- Handle with sub-variables 
- Handle with iterations 
- Filter out elements according to conditionals 
- Place variables 
- Translate string 

It is important to note that each sub-section will go through the entire process before combining all elements together (meaning part-i will be translated before part-ii will iterate its loop)

## Additional notes
- I'm not really using [hoek](https://www.npmjs.com/package/hoek), but it's being using by some dependecies and I must
force it to its latest version as earlier ones have security issues