const filePath = 'index.js';
const generateIndex_js = (/*{ options to customise code generation }*/) => {
  const codeLines = [
    `throw new Error('This project is only for running template-project/generate-project command from the dependency "templator-generator"');`
  ];
  return {
    [filePath]: codeLines
  };
};
exports.generateIndex_js = generateIndex_js;
exports.generate = generateIndex_js;