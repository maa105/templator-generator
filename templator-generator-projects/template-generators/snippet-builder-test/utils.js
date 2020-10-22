const fs = require('fs-extra');
const path = require('path');
const { camelCase, kebabCase, trim, map, flattenDeep, filter, trimEnd, assign, omit, isPlainObject, isArray, isString, isFunction, isNumber, repeat, orderBy, forEach, mapValues, some } = require('lodash');
const { spawn } = require('child_process');

const cmdOptions = require('minimist')(((args) => {
  return args.slice(2);
})(process.argv));
exports.cmdOptions = cmdOptions;

const getRelativePath = (relativeTo, ...absolutePathParts) => {
  const absolutePath = path.normalize(path.join(...absolutePathParts));
  if(!path.isAbsolute(absolutePath)) {
    throw new Error(`absolutePaths(["${absolutePathParts.join('","')}"]) given to getRelativePath do not join to become an absolute path ${absolutePath}`);
  }
  if(absolutePath.toLowerCase().indexOf(relativeTo.toLowerCase()) === 0) {
    return './' + absolutePath.substr(relativeTo.length).replace(/\\/gmi, '/');
  }
  throw new Error(`absolutePaths(["${absolutePathParts.join('","')}"]) given to getRelativePath do not join to become a sub of the directory ${relativeTo}`);
};
exports.getRelativePath = getRelativePath;

const getRootRelativePath = (...absolutePathParts) => getRelativePath(__dirname, ...absolutePathParts); // we (utils.js) is at the root
exports.getRootRelativePath = getRootRelativePath;

const mergeSameFileEntries = (fileEntryKey, fileEntry1, fileEntry2) => {
  if(!fileEntry1) {
    return fileEntry2;
  }
  if(!fileEntry2) {
    return fileEntry1;
  }
  const is1Mergable = isArray(fileEntry1) || fileEntry1 instanceof Snippet || fileEntry1 instanceof SnippetsCompiler;
  const is2Mergable = isArray(fileEntry2) || fileEntry2 instanceof Snippet || fileEntry2 instanceof SnippetsCompiler;
  if(is2Mergable && is1Mergable) {
    return SnippetsCompiler.Merge(fileEntry1, fileEntry2);
  }
  if(isPlainObject(fileEntry1) && isPlainObject(fileEntry2)) {
    return mergeFilesEntries(fileEntry1, fileEntry2);
  }
  console.warn(`file entry ${fileEntryKey} of type (${Object.prototype.toString.call(fileEntry1)}) being overwritten by new entry of type (${Object.prototype.toString.call(fileEntry2)})`);
  return fileEntry2;
};
exports.mergeSameFileEntries = mergeSameFileEntries;

const cloneFileEntryValue = (fileEntryValue, fileEntryKey = '[NotGiven]') => {
  if(fileEntryValue == null) {
    return fileEntryValue;
  }
  if(fileEntryValue instanceof Snippet || fileEntryValue instanceof(SnippetsCompiler)) {
    return fileEntryValue.clone();
  }
  if(isPlainObject(fileEntryValue)) {
    return cloneFilesEntries(fileEntryValue);
  }
  if(isString(fileEntryValue)) {
    return fileEntryValue;
  }
  if(isArray(fileEntryValue)) {
    return map(fileEntryValue, (v, i) => cloneFileEntryValue(v, i));
  }
  console.warn(`WARN: invalid data type for file entry "${fileEntryKey}" (${Object.prototype.toString.call(fileEntryValue)}). Files entries values should be an array(of code line for code files)/string(path to binary file to copy)/object(filesEntries[recursive]), Snippet/SnippetCompiler or null/undefined to suppress generation. Skipping it`);
  return null;
};
exports.cloneFileEntryValue = cloneFileEntryValue;

const cloneFilesEntries = (filesEntries) => {
  return mapValues(filesEntries, (v, k) => {
    return cloneFileEntryValue(v, k);
  });
};
exports.cloneFilesEntries = cloneFilesEntries;

/**
 * Merges all filesEntries sent into the first filesEntries (mutates it)
 * @param  {...any} filesEntries 
 */
const mergeFilesEntries = (...filesEntries) => {
  if(filesEntries.length < 2) {
    return filesEntries[0];
  }
  const [ filesEntries1, filesEntries2, ...filesEntriesRest ] = filesEntries;
  const merged = filesEntries1;
  for(let fileEntryKey in filesEntries2) {
    const fileEntry1 = filesEntries1[fileEntryKey];
    const fileEntry2 = filesEntries2[fileEntryKey];
    merged[fileEntryKey] = mergeSameFileEntries(fileEntryKey, fileEntry1, fileEntry2);
  }
  return mergeFilesEntries(merged, ...filesEntriesRest);
};
exports.mergeFilesEntries = mergeFilesEntries;

/**
 * same as mergeFilesEntries but it leaves the input fileEntries intact (no mutation)
 * @param  {...any} filesEntries 
 */
const concatFilesEntries = (...filesEntries) => {
  return mergeFilesEntries(
    ...map(filesEntries, cloneFilesEntries)
  );
};
exports.concatFilesEntries = concatFilesEntries;

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
      if(codeLines) {
        if(keyedIncludes[key] && getCodeFromLines(includes) !== getCodeFromLines(keyedIncludes[key])) {
          console.warn(`snippet compiler "${name}" include "${key}" is being overwritten`);
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
        throw new Error(`attempted to add an anonymous include to sippet compiler "${name}", but no include source(codeLines) was not provided`);
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
          const snip = { key, codeLines, sortOrder };
          if(snippetsByKeys[key]) {
            console.warn(`snippet compiler "${name}" duplicate snippet "${key}" will ignore new snippet codeLines`);
          }
          else {
            snippets.push(snip);
            snippetsByKeys[key] = snip;
          }
        }
        forEach(filter(flattenDeep([includes]), (inc) => inc != null), this.addInclude);
      }
    }
  };

  this.clone = () => {
    const ret = new SnippetsCompiler({ name, keyedIncludes: { ...keyedIncludes } });
    forEach(includes, ret.addInclude);
    forEach(snippets, ret.addSnippet);
    return ret;
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
    ], ({ key, codeLines }) => {
      if(key) {
        if(!keyedIncludes[key]) {
          console.warn(`No codeLines provided for include "${key}" of sippet compiler "${name}"`);
          return [`// missing include ${key}`];
        }
        return keyedIncludes[key];
      }
      return codeLines;
    });
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

  this.toString = () => this.compile().join('\r\n');
  this.toJSON = () => this.compile();

  return self;
}
exports.SnippetsCompiler = SnippetsCompiler;

SnippetsCompiler.Merge = (snip1, snip2) => {
  if(!snip2) {
    return snip1;
  }
  if(!snip1) {
    return cloneFileEntryValue(snip2);
  }
  if(snip1 instanceof SnippetsCompiler) {
    snip1.addSnippet(snip2);
    return snip1;
  }
  if(snip2 instanceof SnippetsCompiler) {
    snip2 = snip2.clone();
    snip2.addSnippet(snip1);
    return snip2;
  }
  if(isArray(snip1)) {
    const ret = new SnippetsCompiler({});
    ret.addSnippet(snip1);
    if(!isArray(snip2) || snip1.length !== snip2.length || some(snip1, (line, i) => line !== snip2[i])) {
      ret.addSnippet(snip2);
    }
    return ret;
  }
  if(isArray(snip2)) {
    const ret = new SnippetsCompiler({});
    ret.addSnippet(snip2);
    ret.addSnippet(snip1);
    return ret;
  }
  if(snip1 instanceof Snippet) {
    snip1.addSnippet(snip2);
    return snip1;
  }
  if(snip2 instanceof Snippet) {
    snip2 = snip2.clone();
    snip2.addSnippet(snip1);
    return snip2;
  }
  const ret = new SnippetsCompiler({});
  ret.addSnippet(snip1);
  ret.addSnippet(snip2);
  return ret;
};

/**
 * @class
 */
function Snippet({ key, codeLines, sortOrder, includes, keyedIncludes }) {
  const self = this;

  const snip = new SnippetsCompiler({ name: key, keyedIncludes: keyedIncludes || {} });
  if(codeLines) {
    snip.addSnippet({ key, codeLines, sortOrder, includes });
  }

  const inner = snip[snippetInnerSymbol]
  this[snippetInnerSymbol] = inner;

  this.addInclude = snip.addInclude;
  this.addSnippet = snip.addSnippet;
  this.clone = () => {
    const ret = new Snippet({ key, codeLines, sortOrder, keyedIncludes: { ...keyedIncludes } });
    forEach(inner.includes, ret.addInclude);
    forEach(codeLines ? inner.snippets.slice(1) : inner.snippets, ret.addSnippet);
    return ret;
  };
  this.append = snip.append;
  this.compile = snip.compile
  this.toString = snip.toString;
  this.toJSON = snip.toJSON;
  this.key = key;
  this.sortOrder = sortOrder;

  return self;
}
exports.Snippet = Snippet;

Snippet.Merge = (snippetsEntries) => {
  const coreSnippets = map(
    snippetsEntries,
    ({ codeLines, sortOrder, includes, keyedIncludes }, key) => new Snippet({ key, codeLines, sortOrder, includes, keyedIncludes })
  );
  forEach(coreSnippets, (snippet, i) => {
    if(i) {
      coreSnippets[0].addSnippet(snippet);
    }
  });
  return coreSnippets[0];
};

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

  const reflattened = flattenDeep(mapped);

  const filtered = filter(reflattened, (line) => line != null);

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

const log = (...args) => console.log(...map(args, (arg) => JSON.parse(JSON.stringify(arg))));
exports.log = log;