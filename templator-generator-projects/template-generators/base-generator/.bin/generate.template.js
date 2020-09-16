const filePath = './.bin/generate.js';
const generateGenerate_js = (/*{ options to customise code generation }*/) => {
  const codeLines = [
    `#!/usr/bin/env node`,
    ``,
    `const { generate } = require('../generator');`,
    `generate();`,
    ``
  ];
  return {
    [filePath]: codeLines
  };
};
exports.generateGenerate_js = generateGenerate_js;
exports.generate = generateGenerate_js;