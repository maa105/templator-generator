const fs = require('fs-extra');
const path = require('path');
const { camelCase, kebabCase, trim, map, flattenDeep, filter, trimEnd, assign, omit, isPlainObject, isArray, isString, isFunction, isNumber } = require( 'lodash' );
const { spawn } = require( 'child_process' );

const cmdOptions = require('minimist')(((args) => {
  return args.slice(2);
})(process.argv));
exports.cmdOptions = cmdOptions;

const doubleQuoteStringify = (str, encloseWithDoubleQuote = true) => {
  const stringified = JSON.stringify(str);
  return encloseWithDoubleQuote ? stringified : stringified.substr(1, stringified.length - 2);
};
exports.doubleQuoteStringify = doubleQuoteStringify;

const doubleQuoteStrEscape = (str) => doubleQuoteStringify(str, false);
exports.doubleQuoteStrEscape = doubleQuoteStrEscape;

const singleQuoteStringify = (str, encloseWithSingleQuote = true) => {
  const stringified = JSON.stringify(str);
  return (encloseWithSingleQuote ? '\'' : '') + stringified.substr(1, stringified.length - 2).replace(/\\"/gmi, '"').replace(/'/gmi, '\\\'') + (encloseWithSingleQuote ? '\'' : '');
};
exports.singleQuoteStringify = singleQuoteStringify;

const singleQuoteStrEscape = (str) => singleQuoteStringify(str, false);
exports.singleQuoteStrEscape = singleQuoteStrEscape;

const backTickStringify = (str, encloseWithBackTick = true) => {
  const stringified = JSON.stringify(str);
  return (encloseWithBackTick ? '`' : '') + stringified.substr(1, stringified.length - 2).replace(/\\"/gmi, '"').replace(/`/gmi, '\\`').replace(/\${/gmi,'\\${') + (encloseWithBackTick ? '`' : '');
};
exports.backTickStringify = backTickStringify;

const backTickStrEscape = (str) => backTickStringify(str, false);
exports.backTickStrEscape = backTickStrEscape;

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

const ifNull = (varToCheck, defaultIfToCheckNullish) => varToCheck == null ? defaultIfToCheckNullish : varToCheck;
exports.ifNull = ifNull;

const indent = (lines, indentCnt = 2, indentChar = ' ') => {
  let prefix;
  if(isNumber(indentCnt)) {
    prefix = repeat(indentChar, indentCnt);
  }
  else {
    prefix = indentCnt;
  }
  return map(lines, (line) => prefix + line);
};
exports.indent = indent;

/**
 * Configuration object for the codeTransform function. Seperate from user parameters
 * @typedef {Object} CodeTransformConfig
 * @property {function | string} [mapFunc] - The function to call for all collections items (The idea is this function takes a collection item and returns a code line)
 * @property {boolean} [trimEnd] - (Default true) trims the end of the code line
 * @property {string} [startAppend] - append this string/character to the begining of all lines
 * @property {string} [endAppend] - append this string/character to the end of all lines INCLUDING the last line
 * @property {string} [seperator] - append this string/character to the end of all lines EXCEPT the last line
 * @property {number} [indentCount] - (Default 0 i.e. no indent) the number of indent chars to add to the start of the code lines
 * @property {string} [indentChar] - (Default space) the indent char to use like space(' ') or tab ('\t')
 */

/** @type {CodeTransformConfig} */
const defaultCodeTransformConfig = {
  mapFunc: undefined,
  trimEnd: true,
  seperator: null,
  startAppend: undefined,
  endAppend: undefined,
  indentCount: 0,
  indentChar: undefined
};

/**
 * Deep flattens input array(s) then passes them in the following pipeling: map(using mapFunc), filter(removes null/undefined), trimEnd, endAppend, startAppend, seperate(using seperator), indent.
 * Stages in pipeline can be configured by adding a CodeTransformConfig object for all settings, or a string for seperator, or a function for a mapFunction, or a number of indentCount
 * @param  {...Array<string | object> | CodeTransformConfig | string | number | Function} linesOrCollectionsOrConfig if last lines entry is an object it is considered a CodeTransformConfig object
 */
const codeTransform = (...linesOrCollectionsOrConfig) => {
  const config = { ...defaultCodeTransformConfig };
  const linesOrCollections = [];
  for(let i = 0; i < linesOrCollectionsOrConfig.length; i++) {
    const entry = linesOrCollectionsOrConfig[i];
    if(isArray(entry)) {
      linesOrCollections.push(entry);
    }
    else if(isString(entry)) {
      config.seperator = entry;
    }
    else if(isFunction(entry)) {
      config.mapFunc = entry;
    }
    else if(isNumber(entry)) {
      config.indentCount = entry;
    }
    else if(isPlainObject(entry)) {
      assign(config, entry);
    }
    else {
      throw new Error(`Invalid lineOrCollectionOrConfig type "${Object.prototype.toString.call(entry)}" must be an array of strings for a collection or lines to transform, a string for seperator, a function for mapFunc, a number for indent, a plain object (of type CodeTransformConfig) for all config settings`);
    }
  }

  const flattened = flattenDeep(linesOrCollections);

  const mapFunc = (config.mapFunc || config.mapFunction || config.map); 
  const mapped = mapFunc ? map(flattened, mapFunc) : flattened;
  
  const filtered = filter(mapped, (line) => line != null);
  
  const trimTheEnd = (config.trim || config.trimEnd || config.trimRight);
  const trimmed = trimTheEnd ? map(filtered, trimEnd) : filtered;

  const endAppend = (config.endAppend || config.endAppendChar || config.endAppendCharacter || config.endAppendStr || config.endAppendString);
  const endAppended = endAppend ? map(trimmed, (line) => line + endAppend) : trimmed;

  const startAppend = (config.startAppend || config.startAppendChar || config.startAppendCharacter || config.startAppendStr || config.startAppendString);
  const startAppended = startAppend ? map(endAppended, (line) => startAppend + line) : endAppended;

  const seperator = (config.sep || config.seperator);
  const seperated = seperator ? map(startAppended, (line, i, lines) => line + (i === lines.length - 1 ? '' : seperator)) : startAppended;
  
  const indentCnt = (config.indent || config.indentCount || config.indentCnt);
  const indentChar = (config.indentChar || config.indentCharacter || config.indentStr || config.indentString);
  const indented = (indentCnt || indentChar) ? indent(seperated, indentCnt || 1, indentChar || ' ') : seperated;

  return indented;
};
exports.codeTransform = codeTransform;

const getCodeFromLines = (codeLines, lineSeperator = '\r\n') => trim(codeTransform(codeLines, { trimEnd: true }).join(lineSeperator));
exports.getCodeFromLines = getCodeFromLines;

const splitTrim = (str, sep = ',') => map(str.split(sep), (v) => v.trim());
exports.splitTrim = splitTrim;

const splitTrimClean = (str, sep = ',') => filter(splitTrim(str, sep), (v) => v);
exports.splitTrimClean = splitTrimClean;

const splitTrimCleanIx = (str, sep = ',') => mapValues(keyBy(splitTrimClean(str, sep), (v) => v), () => true);
exports.splitTrimCleanIx = splitTrimCleanIx;

const includeExcludeFilter = (collection, iteratee, include, exclude) => {
  if(isString(iteratee)) {
    const col = iteratee;
    iteratee = (itm) => itm[col];
  }
  if(include) {
    include = isString(include) ? splitTrimCleanIx(include) : include;
    collection = map(collection, (itm) => include[iteratee(itm)]);
  }
  if(exclude) {
    exclude = isString(exclude) ? splitTrimCleanIx(exclude) : exclude;
    collection = map(collection, (itm) => !exclude[iteratee(itm)]);
  }
  return collection;
};
exports.includeExcludeFilter = includeExcludeFilter;

const isDirectory = (source) => fs.lstatSync(source).isDirectory();
exports.isDirectory = isDirectory;

const getDirectoriesNames = (source) => fs.readdirSync(source).filter((name) => isDirectory(path.join(source, name)));
exports.getDirectoriesNames = getDirectoriesNames;

const getDirectoriesPaths = (source) => fs.readdirSync(source).filter((name) => isDirectory(path.join(source, name))).map((name) => path.join(source, name));
exports.getDirectoriesPaths = getDirectoriesPaths;

const getFilesNames = (source) => fs.readdirSync(source).filter((name) => !isDirectory(path.join(source, name)));
exports.getFilesNames = getFilesNames;

const getFilesPaths = (source) => fs.readdirSync(source).filter((name) => !isDirectory(path.join(source, name))).map((name) => path.join(source, name));
exports.getFilesPaths = getFilesPaths;

exports.wait = (duration, data) => new Promise((resolve) => setTimeout(resolve.bind(null, data), duration));

/**
 * promisified wrapper to spawn method
 * @param {string} cmd 
 * @param {string[]} cmdArgs 
 * @param {{errorMessage:string,env:object|true,cwd:string,detached:boolean,shell:boolean,stdio:[import('stream').Stream|string]}} options 
 * @returns {Promise<any> & {childProcess:import('child_process').ChildProcess}}
 */
const execCmd = (cmd, cmdArgs = [], options = {}) => {
  const errorMessage = options.errorMessage || ('Error executing ' + cmd + ' ' + (cmdArgs ? ('' + cmdArgs.join(' ')) : ''));
  options = assign({ detached: false, shell: true, stdio: 'inherit' }, omit(options, 'errorMessage'));
  if(options.env === true) {
    options.env = Object.assign({}, process.env);
  }
  const buildCmd = spawn(cmd, cmdArgs, options);
  const ret = new Promise((resolve, reject) => {
    try {
      let rejected = false;
      buildCmd.on('error', async (err) => {
        if(!rejected) {
          rejected = true;
          reject(err);
        }
      });
      buildCmd.on('exit', async (code) => {
        if (code !== 0) {
          setTimeout(() => {
            if(!rejected) {
              rejected = true;
              reject(new Error(errorMessage + '. Code: ' + code));
            }
          }, 150);
        }
        else {
          resolve();
        }
      });
    }
    catch(err) {
      console.error('Global Error:', err);
      reject(err || new Error('Global Error'));
    }
  });
  ret.childProcess = buildCmd;
  return ret;
};
exports.execCmd = execCmd;
