import typescript from 'rollup-plugin-typescript2';
import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';

import pkg from './package.json';

const input = 'src/index.tsx';

const plugins = [
  typescript({
    typescript: require('typescript'),
  }),
  postcss({
    plugins: [autoprefixer()],
    sourceMap: true,
    extract: true,
    minimize: true
  })
];

export default [
  {
    input,
    output: {
      file: pkg.module,
      format: 'esm',
      sourcemap: true,
    },
    plugins,
  },
  {
    input,
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
    },
    plugins,
  },
];