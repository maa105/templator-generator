const fs = require('fs-extra');
const path = require('path');
const { camelCase, kebabCase, trim, map, flattenDeep, filter, trimEnd, assign, omit, isPlainObject, isArray, isString, isFunction, isNumber, repeat, orderBy, forEach } = require( 'lodash' );
const { spawn } = require( 'child_process' );

const cmdOptions = require('minimist')(((args) => {
  return args.slice(2);
})(process.argv));
exports.cmdOptions = cmdOptions;

const snippetInnerSymbol = Symbol('Snippet-Inner');
/**
 * @class
 */
function SnippetsCompiler({ name = 'anonymous', keyedIncludes = {} } = {}) {
  const self = this;
  
  const includes = [];
  const includesByKeys = {};
  const includesUnkeyed = {};

  const snippets = [];
  const snippetsByKeys = {};

  const inner = {
    name,
    includes,
    includesByKeys,
    includesUnkeyed,
    snippets,
    snippetsByKeys,
    keyedIncludes
  };
  self[snippetInnerSymbol] = inner;

  this.addInclude = (include) => {
    if(isString(include)) {
      include = { key: include };
    }
    else if(isArray(include)) {
      include = { codeLines: include };
    }
    const { key, codeLines, sortOrder } = include;
    if(key != null) {
      if(!codeLines && !keyedIncludes[key]) {
        throw new Error(`attempted to add include ${key} to sippet compiler ${name}, but the include source(codeLines) was not provided nor was this key found in the "keyedIncludes"`);
      }
      if(codeLines) {
        if(keyedIncludes[key] && getCodeFromLines(includes) !== getCodeFromLines(keyedIncludes[key])) {
          console.warn(`snippet compiler "${name}" include ${key} is being overwritten`);
        }
        keyedIncludes[key] = codeLines;
      }

      const incld = { key, sortOrder };
      if(!includesByKeys[key]) {
        includesByKeys[key] = incld;
        includes.push(incld);
      }
    }
    else {
      if(!codeLines) {
        throw new Error(`attempted to add an anonymous include to sippet compiler ${name}, but no include source(codeLines) was not provided`);
      }
      
      const src = getCodeFromLines([codeLines]);
      const incld = { codeLines, sortOrder };
      if(!includesUnkeyed[src]) {
        includesUnkeyed[src] = incld;
        includes.push(incld);
      }
    }
  };

  /**
   * @param {{ key: string, codeLines: Array<String|Array>, snippet: Snippet, sortOrder: number, includes } | SnippetsCompiler | Snippet} toAdd either snippet of codeLines should be defined but not both
   */
  this.addSnippet = (toAdd) => {
    if(isArray(toAdd)) {
      toAdd = { codeLines: toAdd };
    }
    if(toAdd instanceof Snippet) {
      const snippetInner = toAdd[snippetInnerSymbol];
      assign(keyedIncludes, snippetInner.keyedIncludes);
      forEach(snippetInner.includes, this.addInclude);
      const codeLines = snippetInner.compileSnippets();
      this.addSnippet({ key: toAdd.key, codeLines, sortOrder: toAdd.sortOrder });
    }
    else if(toAdd instanceof SnippetsCompiler) {
      const snippetInner = toAdd[snippetInnerSymbol];
      assign(keyedIncludes, snippetInner.keyedIncludes);
      forEach(snippetInner.includes, this.addInclude);
      forEach(snippetInner.snippets, this.addSnippet);
    }
    else {
      const { key, snippet, codeLines, sortOrder, includes } = toAdd;
      if(snippet) {
        const snippetInner = snippet[snippetInnerSymbol];
        assign(keyedIncludes, snippetInner.keyedIncludes);
        forEach(filter(flattenDeep([includes, snippetInner.includes]), (inc) => inc != null), this.addInclude);
        const codeLines = snippetInner.compileSnippets();
        this.addSnippet({ key: key == null ? snippet.key : key, codeLines, sortOrder: sortOrder == null ? toAdd.sortOrder : sortOrder });
      }
      else {
        if(key == null) {
          const snip = { codeLines, sortOrder };
          snippets.push(snip);
        }
        else {
          if(snippetsByKeys[key]) {
            console.warn(`snippet compiler ${name} duplicate snippet "${key}" will override old snippet codeLines`);
          }
          const snip = { key, codeLines, sortOrder };
          snippetsByKeys[key] = snip;
          snippets.push(snip);
        }
        forEach(filter(flattenDeep([includes]), (inc) => inc != null), this.addInclude);
      }
    }
  };

  this.append = (snippetOrSnippetCompiler) => {
    this.addSnippet(snippetOrSnippetCompiler);
  };

  const compileIncludes = () => {
    const includesNonNegativeSortOrder = filter(includes, ({ sortOrder }) => isNumber(sortOrder) && sortOrder >= 0);
    const includesNegativeSortOrder = filter(includes, ({ sortOrder }) => isNumber(sortOrder) && sortOrder < 0);
    const includesNoSortOrder = filter(includes, ({ sortOrder }) => !isNumber(sortOrder));
    return codeTransform([
      ...orderBy(includesNonNegativeSortOrder, ['sortOrder'], ['asc']),
      ...includesNoSortOrder,
      ...orderBy(includesNegativeSortOrder, ['sortOrder'], ['asc'])
    ], ({ key, codeLines }) => (key ? keyedIncludes[key] : codeLines));
  };
  inner.compileIncludes = compileIncludes;

  const compileSnippets = () => {
    const snipNonNegativeSortOrder = filter(snippets, ({ sortOrder }) => isNumber(sortOrder) && sortOrder >= 0);
    const snipNegativeSortOrder = filter(snippets, ({ sortOrder }) => isNumber(sortOrder) && sortOrder < 0);
    const snipNoSortOrder = filter(snippets, ({ sortOrder }) => !isNumber(sortOrder));
    return codeTransform([
      ...orderBy(snipNonNegativeSortOrder, ['sortOrder'], ['asc']),
      ...snipNoSortOrder,
      ...orderBy(snipNegativeSortOrder, ['sortOrder'], ['asc'])
    ], ({ codeLines }) => codeLines);
  };
  inner.compileSnippets = compileSnippets;

  this.compile = () => {
    const compiledIncludes = compileIncludes();
    return codeTransform([
      compiledIncludes,
      compiledIncludes.length ? '' : null,
      compileSnippets()
    ]);
  };

  return self;
}
exports.SnippetsCompiler = SnippetsCompiler;

SnippetsCompiler.Merge = (snip1, snip2) => {
  if(!snip2) {
    return snip1;
  }
  if(!snip1) {
    return snip2;
  }
  if(snip1 instanceof SnippetsCompiler) {
    snip1.addSnippet(snip2);
    return snip1;
  }
  if(snip2 instanceof SnippetsCompiler) {
    snip2.addSnippet(snip1);
    return snip2;
  }
  if(snip1 instanceof Snippet) {
    snip1.addSnippet(snip2);
    return snip1;
  }
  if(snip2 instanceof Snippet) {
    snip2.addSnippet(snip1);
    return snip2;
  }
  return new Snippet({ codeLines: codeTransform([snip1, '', snip2]) });
};

/**
 * @class
 */
function Snippet({ key, codeLines, sortOrder, includes, keyedIncludes }) {
  const self = this;

  const snip = new SnippetsCompiler({ name: key, keyedIncludes: keyedIncludes || {} });
  snip.addSnippet({ key, codeLines, sortOrder });

  const inner = snip[snippetInnerSymbol]
  this[snippetInnerSymbol] = inner;

  this.addInclude = snip.addInclude;
  this.addSnippet = snip.addSnippet;
  this.append = snip.append;
  this.compile = snip.compile;
  this.key = key;
  this.sortOrder = sortOrder;

  includes = filter(flattenDeep([includes]), (inc) => inc != null);
  for(let i = 0; i < includes.length; i++) {
    const inc = includes[i];
    if(isString(inc)) {
      snip.addInclude({ key: inc });
    }
    else if(isArray(inc)) {
      snip.addInclude({ codeLines: inc });
    }
    else {
      snip.addInclude(includes[i]);
    }
  }
  
  return self;
}
exports.Snippet = Snippet;

const doubleQuoteStr = (str, encloseWithDoubleQuote = true) => {
  const stringified = JSON.stringify(str);
  return encloseWithDoubleQuote ? stringified : stringified.substr(1, stringified.length - 2);
};
exports.doubleQuoteStringify = (str) => doubleQuoteStr(str, true);

const doubleQuoteStrEscape = (str) => doubleQuoteStr(str, false);
exports.doubleQuoteStrEscape = doubleQuoteStrEscape;

const singleQuoteStr = (str, encloseWithSingleQuote = true) => {
  const stringified = JSON.stringify(str);
  return (encloseWithSingleQuote ? '\'' : '') + stringified.substr(1, stringified.length - 2).replace(/\\"/gmi, '"').replace(/'/gmi, '\\\'') + (encloseWithSingleQuote ? '\'' : '');
};
exports.singleQuoteStringify = (str) => singleQuoteStr(str, true);

const singleQuoteStrEscape = (str) => singleQuoteStr(str, false);
exports.singleQuoteStrEscape = singleQuoteStrEscape;

const backTickStr = (str, encloseWithBackTick = true) => {
  const stringified = JSON.stringify(str);
  return (encloseWithBackTick ? '`' : '') + stringified.substr(1, stringified.length - 2).replace(/\\"/gmi, '"').replace(/`/gmi, '\\`').replace(/\${/gmi,'\\${') + (encloseWithBackTick ? '`' : '');
};
exports.backTickStringify = (str) => backTickStr(str, true);

const backTickStrEscape = (str) => backTickStr(str, false);
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
    let key = keys[i];
    if(isNumber(key)) {
      if(options._[key]) {
        const opt = options._[key];
        options._.splice(key, 1);
        return opt;
      }
      else {
        key = key.toString();
      }
    }
    if(options[key]) {
      const opt = options[key];
      delete options[key];
      return opt;
    }
    if(checkOtherCase && options[camelCase(key)]) {
      const opt = options[camelCase(key)];
      delete options[camelCase(key)];
      return opt;
    }
    if(checkOtherCase && options[kebabCase(key)]) {
      const opt = options[kebabCase(key)];
      delete options[kebabCase(key)];
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
 * @property {string} [prefix] - append this string/character to the begining of all lines
 * @property {string} [suffix] - append this string/character to the end of all lines INCLUDING the last line
 * @property {string} [seperator] - append this string/character to the end of all lines EXCEPT the last line
 * @property {number} [indentCount] - (Default 0 i.e. no indent) the number of indent chars to add to the start of the code lines
 * @property {string} [indentChar] - (Default space) the indent char to use like space(' ') or tab ('\t')
 */

/** @type {CodeTransformConfig} */
const defaultCodeTransformConfig = {
  mapFunc: undefined,
  trimEnd: true,
  seperator: null,
  prefix: undefined,
  suffix: undefined,
  indentCount: 0,
  indentChar: undefined
};

/**
 * Deep flattens input array(s) then passes them in the following pipeling: map(using mapFunc), filter(removes null/undefined), trimEnd, prefix, suffix, seperate(using seperator), indent.
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

  const prefix = (config.prefix || config.pre || config.startAppend || config.startAppendChar || config.startAppendCharacter || config.startAppendStr || config.startAppendString);
  const prefixed = prefix ? map(trimmed, (line) => prefix + line) : trimmed;
  
  const suffix = (config.suffix || config.suf || config.endAppend || config.endAppendChar || config.endAppendCharacter || config.endAppendStr || config.endAppendString);
  const suffixed = suffix ? map(prefixed, (line) => line + suffix) : prefixed;

  const seperator = (config.sep || config.seperator);
  const seperated = seperator ? map(suffixed, (line, i, lines) => line + (i === lines.length - 1 ? '' : seperator)) : suffixed;
  
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