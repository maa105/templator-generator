const filePath = 'package.json';
const generatePackage_json = ({ version = '0.0.1', author = 'maa105' }) => {
  const codeLines = [
    `{`,
    `  "name": "templator-generator-empty-project",`,
    `  "version": "1.0.0",`,
    `  "description": "Project used to generate template generator, hopefully parametrising/smartifying them, and generating dynamic projects from those parametrised template generators",`,
    `  "main": "index.js",`,
    `  "scripts": {`,
    `    "generate": "generate",`,
    `    "generate-project": "generate-project",`,
    `    "generateProject": "generate-project",`,
    `    "template": "template-project",`,
    `    "template-project": "template-project",`,
    `    "templateProject": "template-project",`,
    `    "templator-generator": "templator-generator",`,
    `    "templatorGenerator": "templator-generator"`,
    `  },`,
    `  "author": "${author}",`,
    `  "license": "MIT",`,
    `  "dependencies": {`,
    `    "templator-generator": "${version}"`,
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