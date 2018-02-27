# foundations
Backgroud scripts and tools for my apps

## CSS
### minify(css) => minifiedCssString
### prefix(css, fileName) => cssWithVendorPrefixesString
`Prefix` adds `-moz` and `-webkit` prefix where necessary in accordance to (https://caniuse.com/)[https://caniuse.com/].
This uses (http://postcss.org/)[http://postcss.org/] which I personally don't like but it's required by (https://github.com/postcss/autoprefixer)][https://github.com/postcss/autoprefixer]
which is the best (if not the only?) plugin to do the job while keep itself up-to-date.
### sass(scss) => cssString
### getFlatCss(fileName) => fileContentWithImportsReplacdToActualFile
### compile