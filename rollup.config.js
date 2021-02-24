import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';

const input = 'src/index.tsx';

const plugins = [
  typescript({
    typescript: require('typescript'),
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
    external: ['react', 'prop-types']
  },
  {
    input,
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
    },
    plugins,
    external: ['react', 'prop-types']
  },
];