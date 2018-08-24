// this file should be run from root folder of ground-up
const rollup = require('rollup'),
  external = [
    'autoprefixer',
    'babel-core',
    'chokidar',
    'clean-css',
    'fs',
    'glob',
    'html-minifier',
    'less',
    'less-plugin-autoprefix',
    'postcss',
    'rollup',
    'uglify-js',

    'rollup-plugin-commonjs',
    'rollup-plugin-node-resolve'
  ],
  config = [
    {
      input: './src/ductTape/ductTape-cli.js',
      external,
      output: {
        file: './.bin/ductTape-cli.js',
        format: 'cjs'
      }
    },
    {
      input: './src/ductTape/ductTape.js',
      external,
      output: {
        file: './.bin/ductTape.js',
        format: 'cjs'
      }
    },
    {
      input: './src/index.js',
      external,
      output: {
        file: './.bin/groundup.js',
        format: 'cjs'
      }
    },
    {
      input: './src/index.js',
      external,
      output: {
        file: './.bin/groundup.web.js',
        format: 'es'
      }
    }
  ];

config.forEach(({ input, external, output }) => {
  rollup.rollup({ input, external }).then(build => {
    build.write(output);
  });
});
