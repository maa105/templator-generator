const { camelCase, kebabCase, trim, map, flattenDeep, filter, trimEnd } = require( 'lodash' );

const cmdOptions = require('minimist')(((args) => {
  return args.slice(2);
})(process.argv));
exports.cmdOptions = cmdOptions;

const singleQuoteStringify = (str, encloseWithSingleQuote = true) => {
  const stringified = JSON.stringify(str);
  return (encloseWithSingleQuote ? '\'' : '') + stringified.substr(1, stringified.length - 2).replace(/\\"/gmi, '"').replace(/'/gmi, '\\\'') + (encloseWithSingleQuote ? '\'' : '');
};
exports.singleQuoteStringify = singleQuoteStringify;

const backTickStringify = (str, encloseWithBackTick = true) => {
  const stringified = JSON.stringify(str);
  return (encloseWithBackTick ? '`' : '') + stringified.substr(1, stringified.length - 2).replace(/\\"/gmi, '"').replace(/`/gmi, '\\`').replace(/\${/gmi,'\\${') + (encloseWithBackTick ? '`' : '');
};
exports.backTickStringify = backTickStringify;

const capitalizeFirstLetter = (str) => (str.substr(0, 1).toUpperCase() + str.substr(1));
exports.capitalizeFirstLetter = capitalizeFirstLetter;

const lowerFirstLetter = (str) => ((str.substr(0, 1).toLowerCase()) + str.substr(1));
exports.lowerFirstLetter = lowerFirstLetter;

/**
 * if last key is boolean it is interpreted as a flag to whether also to check kebab&camel case of the keys
 */
const getAndRemoveOption = (options, ...keys) => {
  let checkOtherCase = true;
  if(typeof(keys[keys.length - 1]) === 'boolean') {
    checkOtherCase = keys.pop();
  }
  for(let i = 0; i < keys.length; i++) {
    if(options[keys[i]]) {
      const opt = options[keys[i]];
      delete options[keys[i]];
      return opt;
    }
    if(checkOtherCase && options[camelCase(keys[i])]) {
      const opt = options[camelCase(keys[i])];
      delete options[camelCase(keys[i])];
      return opt;
    }
    if(checkOtherCase && options[kebabCase(keys[i])]) {
      const opt = options[kebabCase(keys[i])];
      delete options[kebabCase(keys[i])];
      return opt;
    }
  }
};
exports.getAndRemoveOption = getAndRemoveOption;

const getCodeFromLines = (codeLines, lineSeperator = '\r\n') => trim(map(flattenDeep(filter(codeLines, (line) => line != null)), trimEnd).join(lineSeperator));
exports.getCodeFromLines = getCodeFromLines;

const isNull = (varToCheck, defaultIfToCheckNullish) => varToCheck == null ? defaultIfToCheckNullish : varToCheck;
exports.isNull = isNull;