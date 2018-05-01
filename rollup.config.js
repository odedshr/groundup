const external = ['fs', 'postcss','autoprefixer','clean-css','node-sass','html-minifier','rollup','babel-core','uglify-js','glob'],
  format = 'cjs';

export default [
  { input: './src/etc/errors.js',
    external,
    output: {
      file: './bin/errors.js',
      format
    }
  },
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
  },
  { input: './src/helpers/HtmlCompiler.js',
    external,
    output: {
      file: './bin/HtmlCompiler.js',
      format
    }
  }
];