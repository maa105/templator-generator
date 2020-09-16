const filePath = './utils.js';
const generateUtils_js = (/*{ options to customise code generation }*/) => {
  const codeLines = [
    `const { camelCase } = require( 'lodash' );`,
    ``,
    `const cmdOptions = require('minimist')(((args) => {`,
    `  return args.slice(2);`,
    `})(process.argv));`,
    `exports.cmdOptions = cmdOptions;`,
    ``,
    `const singleQuoteStringify = (str, encloseWithSingleQuote = true) => {`,
    `  const stringified = JSON.stringify(str);`,
    `  return (encloseWithSingleQuote ? '\\'' : '') + stringified.substr(1, stringified.length - 2).replace(/\\\\"/gmi, '"').replace(/'/gmi, '\\\\\\'') + (encloseWithSingleQuote ? '\\'' : '');`,
    `};`,
    `exports.singleQuoteStringify = singleQuoteStringify;`,
    ``,
    `const backTickStringify = (str, encloseWithBackTick = true) => {`,
    `  const stringified = JSON.stringify(str);`,
    `  return (encloseWithBackTick ? '\`' : '') + stringified.substr(1, stringified.length - 2).replace(/\\\\"/gmi, '"').replace(/\`/gmi, '\\\\\`').replace(/\\\${/gmi,'\\\\\${') + (encloseWithBackTick ? '\`' : '');`,
    `};`,
    `exports.backTickStringify = backTickStringify;`,
    ``,
    `const capitalizeFirstLetter = (str) => (str.substr(0, 1).toUpperCase() + str.substr(1));`,
    `exports.capitalizeFirstLetter = capitalizeFirstLetter;`,
    ``,
    `const lowerFirstLetter = (str) => ((str.substr(0, 1).toLowerCase()) + str.substr(1));`,
    `exports.lowerFirstLetter = lowerFirstLetter;`,
    ``,
    `const getAndRemoveOption = (options, ...keys) => {`,
    `  for(let i = 0; i < keys.length; i++) {`,
    `    if(options[keys[i]]) {`,
    `      const opt = options[keys[i]];`,
    `      delete options[keys[i]];`,
    `      return opt;`,
    `    }`,
    `    if(options[camelCase(keys[i])]) {`,
    `      const opt = options[camelCase(keys[i])];`,
    `      delete options[camelCase(keys[i])];`,
    `      return opt;`,
    `    }`,
    `  }`,
    `};`,
    `exports.getAndRemoveOption = getAndRemoveOption;`
  ];
  return {
    [filePath]: codeLines
  };
};
exports.generateUtils_js = generateUtils_js;
exports.generate = generateUtils_js;