const fs = require('fs-extra');
const path = require('path');
const { mapValues, mapKeys, isArray, isString, isPlainObject, assign } = require('lodash');
const { cmdOptions, getAndRemoveOption, getCodeFromLines, isNull } = require( './utils' );

/**
 * Base generator options. Seperate from user parameters
 * @typedef {Object} BaseGeneratorOptions
 * @property {string} [lineSeperator] - The end of line sequence. Defaults to CRLF (\r\n)
 * @property {boolean} [writeEmptyFiles] - If the file generator returned an empty string whether to write this file or not default to false i.e. will write the file
 */
/**
 * @typedef {Object} DirectoryGeneratorOptionsExtention
 * @property {boolean} [addDirectoryPath] - Whether the directory generator should add a its path pointing to its children FileEntries, or just return its children FileEntries without them being keyed by the directory path. i.e. return { '<dir_name>': <children_file_entries> } v.s. <children_file_entries>. Default: false
 * @property {boolean} [generateSubDirectories] - Whether to generate the subdirectories of this directory. Default = true
 * @property {boolean} [generateRootFiles] - Whether to generate the filrs at the root of this directory. Default = true
 */
/**
 * @typedef {Object} FileGeneratorOptionsExtention
 * @property {boolean} [addFilePath] - Whether the file generator should add a its path, or just return file generation result without it being keyed by the file path. i.e. return { '<file_name>': <file_value> } v.s. <file_value>. Default: false
 */
/**
 * Generator options for directories. Seperate from user parameters
 * @typedef {BaseGeneratorOptions & DirectoryGeneratorOptionsExtention} DirectoryGeneratorOptions
 */
/**
 * Generator options for files. Seperate from user parameters
 * @typedef {BaseGeneratorOptions & FileGeneratorOptionsExtention} FileGeneratorOptions
 */
/**
 * Generic Generator options for directories and files. Seperate from user parameters
 * @typedef {BaseGeneratorOptions & DirectoryGeneratorOptionsExtention & FileGeneratorOptionsExtention} GeneratorOptions
 */

const writeCodeFile = ({ outputPath, fileRelativePath, codeLines, generatorOptions }) => {
  const code = getCodeFromLines(codeLines, generatorOptions.lineSeperator);
  if(code !== '' || generatorOptions.writeEmptyFiles) {
    const filePath = path.join(outputPath, fileRelativePath);
    fs.ensureDirSync(path.parse(filePath).dir);
    fs.writeFileSync(filePath, code, { encoding: 'utf8' });
    return true;
  }
  return false;
};

const writeBinaryFile = ({ outputPath, fileRelativePath, srcPath }) => {
  const filePath = path.join(outputPath, fileRelativePath);
  fs.ensureDirSync(path.parse(filePath).dir);
  if(fs.existsSync(path.join(__dirname, srcPath))) {
    fs.copyFileSync(path.join(__dirname, srcPath), filePath);
    return true;
  }
  console.warn(`WARN: Could not find file "${path.join(__dirname, srcPath)}" which is the binary copy of "${fileRelativePath}". Skipping it. This means there will be no "${fileRelativePath}" file in the output.`);
  return false;
};

const writeFlattenedFilesEntries = ({ outputPath, filesEntries, generatorOptions }) => {
  for(let filePath in filesEntries) {
    const entryValue = filesEntries[filePath];
    if(isArray(entryValue)) {
      writeCodeFile({
        outputPath,
        fileRelativePath: filePath,
        codeLines: entryValue,
        generatorOptions
      });
    }
    else if(isString(entryValue)) {
      writeBinaryFile({
        outputPath,
        fileRelativePath: filePath,
        srcPath: entryValue
      });
    }
    else {
      console.warn(`WARN: Invalid data type (${Object.prototype.toString.call(filesEntries)}) for file entry ${filePath}. File entries should be an array representing code lines for code files, a string representing a path to a file for binary files or null/undefined to suppress generation. Skipping invalid entry.`);
    }
  }
};

const flattenFilesEntries = ({
  filesEntries,
  generatorPath = '[UnNamed]',
  relativePath = './',
  cumulativeFileEntries = {}
}) => {
  for(let entryRelativePath in filesEntries) {
    const entryValue = filesEntries[entryRelativePath];
    if(isArray(entryValue)) {
      cumulativeFileEntries[path.normalize(path.join(relativePath, entryRelativePath))] = entryValue;
    }
    else if(isString(entryValue)) {
      cumulativeFileEntries[path.normalize(path.join(relativePath, entryRelativePath))] = entryValue;
    }
    else if(isPlainObject(entryValue)) {
      flattenFilesEntries({
        filesEntries: entryValue,
        generatorPath,
        relativePath: path.normalize(path.join(relativePath, entryRelativePath)),
        cumulativeFileEntries
      });
    }
    else {
      console.warn(`WARN: Generator file "${generatorPath}" returned an invalid data type for file entry "${entryRelativePath}" (${Object.prototype.toString.call(filesEntries)}). The generator should return an object of file(s) entries(s) with key being file paths to write and the value array(of code line for code files)/string(path to binary file to copy)/object(filesEntries[recursive]), or null/undefined to suppress generation. Skipping invalid entry`);
    }
  }
  return cumulativeFileEntries;
};

const getGeneratorFilesEntries = async ({
  generatorPath,
  generateOptions,
  generatorOptions
}) => {
  if(!fs.existsSync(path.join(__dirname, generatorPath))) {
    console.warn(`WARN: Could not find generator file "${generatorPath}". Skipping it. This means the file(s) it generates will not be in the output.`);
    return null;
  }
  const filesEntries = await require('./' + generatorPath).generateFilesEntries(generateOptions, { ...generatorOptions, addFilePath: true, addDirectoryPath: true, generateSubDirectories: true, generateRootFiles: true });
  if(filesEntries == null) {
    return null;
  }

  if(isPlainObject(filesEntries)) {
    return filesEntries;
  }

  console.warn(`WARN: Generator file "${generatorPath}" returned an invalid data type (${Object.prototype.toString.call(filesEntries)}). The generator should return an object of file(s) entries(s) with key being file paths to write and the value array(of code line for code files)/string(path to binary file to copy)/object(filesEntries[recursive]), or null/undefined to suppress generation. Skipping it. This means there will be no file(s) in the output form this generator file.`);
  return null;
};

const generateFilesEntries = async ({
  generatorsPaths,
  generateOptions,
  generatorOptions
}) => {
  const filesEntries = {};

  for(let i = 0; i < generatorsPaths.length; i++) {
    const generatorPath = generatorsPaths[i];
    const currentFilesEntries = await getGeneratorFilesEntries({
      generatorPath,
      generateOptions,
      generatorOptions
    });
    assign(filesEntries, currentFilesEntries);
  }

  return filesEntries;
};

const generate = async ({
  outputPath,
  generatorsPaths,
  generateOptions,
  generatorOptions
}) => {
  const filesEntries = await generateFilesEntries({ generatorsPaths, generateOptions, generatorOptions });

  const flattenedFilesEntries = flattenFilesEntries({ filesEntries });

  writeFlattenedFilesEntries({ filesEntries: flattenedFilesEntries, outputPath, generatorOptions });
};

const getOutputPath = () => {
  const outputPath = getAndRemoveOption(cmdOptions, 'path', 'o', 'out', 'output', 'outputPath', 'outFolderPath', 'outputFolderPath', 'outDirectoryPath', 'outputDirectoryPath', 'outputDir', 'outDirPath', 'outputDirPath');
  if(!outputPath) {
    throw new Error('Output path argument is required. Specify it using --o <path_to_put_generated_project_in>');
  }
  return path.resolve(outputPath);
};

const getGenerationOptions = async () => {

  let generationOptionsFromStdin;
  if(process.stdin && !process.stdin.readableEnded && !process.stdin.isTTY) {
    const jsonStr = await new Promise((resolve, reject) => {
      process.stdin.setEncoding('utf-8');
      const chunks = [];
      process.stdin.on('data', (chunk) => {
        chunks.push(chunk);
      });
      process.stdin.on('error', (err) => {
        reject(err);
      });
      process.stdin.on('end', () => {
        resolve(chunks.join(''));
      });
    });
    try {
      generationOptionsFromStdin = JSON.parse(jsonStr);
    }
    catch(err) {
      throw new Error(`Could not parse json options from stdin pipe. It does not look that it is the correct format.`);
    }
  }

  const jsonFilePath = getAndRemoveOption(cmdOptions, 'jsonFile', 'optionsFile', 'optionsJsonFile', 'optionsJSONFile', 'generateOptionsFile', 'generateOptionsJsonFile', 'generateOptionsJSONFile');
  let generationOptionsFromFile;
  if(jsonFilePath) {
    if(!fs.existsSync(jsonFilePath)) {
      throw new Error(`Could not find json options file "${jsonFilePath}" which resolves to ${path.resolve(jsonFilePath)}`);
    }
    try {
      generationOptionsFromFile = JSON.parse(fs.readFileSync(jsonFilePath, { encoding: 'utf8' }));
    }
    catch(err) {
      throw new Error(`Could not parse json options file "${jsonFilePath}" which resolves to ${path.resolve(jsonFilePath)}. It does not look that it is the correct format.`);
    }
  }

  const generationOptions = {
    ...generationOptionsFromStdin,
    ...generationOptionsFromFile,
    ...mapKeys(
      mapValues(cmdOptions, (value, key) => {
        if(key.indexOf('--json') === key.length - 6 || (key.indexOf('--no-json') !== key.length - 9 && (value[0] === '{' || value[0] === '[' || value[0] === '"'))) {
          try {
            let json = JSON.parse(value);
            return json;
          }
          catch(err) {
            return value;
          }
        }
        return value;
      }),
      (v, key) => key.indexOf('--json') === key.length - 6 ? key.substr(0, key.length - 6) : (key.indexOf('--no-json') === key.length - 9 ? key.substr(0, key.length - 9) : key)
    )
  };

  const lineSeperator = isNull(getAndRemoveOption(generationOptions, '_LineSeperator', '_lineSeperator', 'LineSeperator', '-line-seperator', 'lineSeperator', 'line-seperator', false), '\r\n');
  const writeEmptyFiles = isNull(getAndRemoveOption(generationOptions, '_WriteEmptyFiles', '_writeEmptyFiles', 'WriteEmptyFiles', '-write-empty-files', 'writeEmptyFiles', 'write-empty-files', false), true);

  return {
    generateOptions: generationOptions,
    generatorOptions: { lineSeperator, writeEmptyFiles }
  };
};

const defaultGeneratorOptions = {
  addDirectoryPath: false,
  addFilePath: true,
  generateSubDirectories: true,
  generateRootFiles: true,
  lineSeperator: '\r\n',
  writeEmptyFiles: true
};

exports.writeFilesEntries = (outputPath, filesEntries, generatorPath = '[UnNamed]') => {
  const flattenedFilesEntries = flattenFilesEntries({ filesEntries, generatorPath });
  return writeFlattenedFilesEntries({
    outputPath,
    filesEntries: flattenedFilesEntries,
    generatorOptions
  });
};

/**
 * @param {Array<string>} generatorsPaths array of paths to generator files
 * @param {Object} generateOptions user parameters/options for the generation process
 * @param {BaseGeneratorOptions} generatorOptions generator options
 */
exports.generateFilesEntries = async (generatorsPaths, generateOptions, generatorOptions = {}) => {
  if(!generatorsPaths) {
    generatorsPaths = require('./index').getGenerators()
  }

  if(!generateOptions) {
    const generationOptions = await getGenerationOptions();
    generateOptions = generationOptions.generateOptions;
    generatorOptions = { ...generationOptions.generatorOptions, ...generatorOptions };
  }

  generatorOptions = { ...defaultGeneratorOptions, ...generatorOptions };

  return generateFilesEntries({
    generatorsPaths,
    generateOptions,
    generatorOptions
  });
};

/**
 * @param {string} outputPath path to put the generated output in
 * @param {Array<string>} generatorsPaths array of paths to generator files
 * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {BaseGeneratorOptions} generatorOptions generator options
 */
exports.generate = async (generatorsPaths, outputPath, generateOptions, generatorOptions = {}) => {
  if(!generatorsPaths) {
    generatorsPaths = require('./index').getGenerators();
  }

  if(!outputPath) {
    outputPath = getOutputPath();
  }

  if(!generateOptions) {
    const generationOptions = await getGenerationOptions();
    generateOptions = generationOptions.generateOptions;
    generatorOptions = { ...generationOptions.generatorOptions, ...generatorOptions };
  }

  generatorOptions = { ...defaultGeneratorOptions, ...generatorOptions };

  return generate({
    outputPath,
    generatorsPaths,
    generateOptions,
    generatorOptions
  });
};

exports.defaultGeneratorOptions = defaultGeneratorOptions;