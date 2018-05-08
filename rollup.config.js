const external = ['fs', 'postcss','autoprefixer','clean-css','node-sass','html-minifier','rollup','babel-core','uglify-js','glob'];

export default [
  { input: './src/builder/builder-cli.js',
    external,
    output: {
      file: './bin/builder-cli.js',
      format: 'cjs'
    }
  },
  { input: './src/builder/builder.js',
    external,
    output: {
      file: './bin/builder.js',
      format: 'cjs'
    }
  },
  { input: './src/index.js',
    external,
    output: {
      file: './bin/groundup.js',
      format: 'cjs'
    }
  },
  { input: './src/index.js',
    external,
    output: {
      file: './bin/groundup.web.js',
      format: 'es'
    }
  }
];