// eslint.config.js
module.exports = [
  {
    files: ['*.js', '*.jsx', '*.ts', '*.tsx'], // Apply these settings to JavaScript and TypeScript files, including JSX.
    languageOptions: {
      ecmaVersion: 2020, // Use modern ECMAScript features.
      sourceType: 'module', // Allow use of imports.
      ecmaFeatures: {
        jsx: true, // Enable JSX since we're using React.
      },
      parser: {
        require: '@typescript-eslint/parser', // Specify the parser module required.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        parse: (options) => new (require('@typescript-eslint/parser'))(options).parse(), // Use the parse method from TypeScript parser.
      },
    },
    plugins: ['@typescript-eslint', 'react'], // Use TypeScript and React plugins.
    extends: [
      'plugin:@typescript-eslint/recommended', // Use recommended rules from the TypeScript plugin.
      'plugin:react/recommended', // Use recommended React rules.
      'plugin:react/jsx-runtime', // Specifically for React 17+ JSX Transform.
    ],
    rules: {
      'no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
        },
      ],
    },
    settings: {
      react: {
        version: 'detect', // Automatically detect the React version.
      },
    },
  },
];
