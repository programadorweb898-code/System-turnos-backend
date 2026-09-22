module.exports = {
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
            decorators: true
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true
          },
          target: "es2022"
        },
        module: {
          type: "commonjs"
        }
      }
    ]
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  setupFiles: ["<rootDir>/src/test/setup.ts"],
  testEnvironment: "node"
};
