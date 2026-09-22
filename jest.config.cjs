module.exports = {
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
            decorators: true
          },
          target: "es2022"
        },
        module: {
          type: "es6"
        }
      }
    ]
  },
  testEnvironment: "node"
};
