import resolve from 'rollup-plugin-local-resolve';
import sourcemaps from 'rollup-plugin-sourcemaps';

const globals = {
  // Apollo
  'apollo-client': 'apollo.core',
  'apollo-cache': 'apolloCache.core',
  'apollo-link': 'apolloLink.core',
  'apollo-utilities': 'apollo.utilities',

  'graphql-anywhere/lib/async': 'graphqlAnywhere.async',
};

export default {
  input: 'lib/index.js',
  output: {
    file: 'lib/bundle.umd.js',
    format: 'umd',
    name: 'apolloLink.state',
    exports: 'named',
    sourcemap: true,
    globals,
  },
  external: Object.keys(globals),
  onwarn,
  plugins: [resolve(), sourcemaps()],
};

function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}
