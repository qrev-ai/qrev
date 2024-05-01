// eslint-disable-next-line @typescript-eslint/no-var-requires
const TerserPlugin = require('terser-webpack-plugin');

module.exports = function override(config, env) {
  // Modify the Webpack configuration here
  config.optimization.minimizer = [
    new TerserPlugin({
      minify: TerserPlugin.uglifyJsMinify,
      // `terserOptions` options will be passed to `uglify-js`
      // Link to options - https://github.com/mishoo/UglifyJS#minify-options
      terserOptions: {},
    }),
  ];
  config.devtool = false;

  return config;
};
