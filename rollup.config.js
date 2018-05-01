const external = ['fs', 'postcss','autoprefixer','clean-css','node-sass','html-minifier','rollup','babel-core','uglify-js','glob'],
  format = 'cjs';

export default [
  { input: './src/builder/builder-cli.js',
    external,
    output: {
      file: './bin/builder-cli.js',
      format
    }
  },
  { input: './src/builder/builder.js',
    external,
    output: {
      file: './bin/builder.js',
      format
    }
  }
];