module.exports = {
  singleQuote: true,
  bracketSpacing: false,
  overrides: [
    {
      files: '*.cdc',
      options: {
        printWidth: 120,
        tabWidth: 2,
        singleQuote: true,
        explicitTypes: 'always',
      },
    },
  ],
};
