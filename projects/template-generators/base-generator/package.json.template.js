const filePath = 'package.json';
const generatePackage_json = ({ projectName = 'project1', author = 'maa105' }) => {
  const codeLines = [
    `{`,
    `  "name": "${projectName}-generator",`,
    `  "version": "1.0.0",`,
    `  "description": "Project to generate ${projectName} project",`,
    `  "main": "generator.js",`,
    `  "scripts": {`,
    `    "generate": "node ./.bin/generate.js"`,
    `  },`,
    `  "author": "${author}",`,
    `  "license": "MIT",`,
    `  "dependencies": {`,
    `    "fs-extra": "^9.0.1",`,
    `    "lodash": "^4.17.20",`,
    `    "minimist": "^1.2.5"`,
    `  },`,
    `  "bin": {`,
    `    "generate-${projectName}": "./.bin/generate.js"`,
    `  }`,
    `}`,
    ``
  ];
  return {
    [filePath]: codeLines
  };
};
exports.generatePackage_json = generatePackage_json;
exports.generate = generatePackage_json;