// this file should be run from root folder of ground-up
const rollup = require('rollup'),
  external = ['fs',
    'postcss',
    'autoprefixer',
    'clean-css',
    'node-sass',
    'html-minifier',
    'rollup',
    'babel-core',
    'uglify-js',
    'glob',
    'rollup-plugin-commonjs',
    'rollup-plugin-node-resolve'],
  config = [
    { input: './src/builder/builder-cli.js',
      external,
      output: {
        file: './dist/builder-cli.js',
        format: 'cjs'
      }
    },
    { input: './src/builder/builder.js',
      external,
      output: {
        file: './dist/builder.js',
        format: 'cjs'
      }
    },
    { input: './src/index.js',
      external,
      output: {
        file: './dist/groundup.js',
        format: 'cjs'
      }
    },
    { input: './src/index.js',
      external,
      output: {
        file: './dist/groundup.web.js',
        format: 'es'
      }
    }
  ];

config.forEach(({ input, external, output }) => {
  rollup.rollup({ input, external }).then(build => {
    build.write(output) ;
  });
});