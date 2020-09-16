const fs = require('fs-extra');
const path = require('path');
const { map, mapValues, mapKeys, flattenDeep, filter, trim, trimEnd, isArray, isString, isPlainObject, assign, forEach } = require('lodash');
const { getAndRemoveOption, cmdOptions } = require( './utils' );

const writeCodeFile = ({ outputPath, fileRelativePath, codeLines, lineSeperator, dontWriteEmptyFiles }) => {
  const code = trim(map(flattenDeep(filter(codeLines, (line) => line != null)), trimEnd).join(lineSeperator));
  if(code !== '' || !dontWriteEmptyFiles) {
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

const writeFilesEntries = ({ outputPath, filesEntries, lineSeperator, dontWriteEmptyFiles }) => {
  for(let filePath in filesEntries) {
    const entryValue = filesEntries[filePath];
    if(isArray(entryValue)) {
      writeCodeFile({
        outputPath,
        fileRelativePath: filePath,
        codeLines: entryValue,
        lineSeperator,
        dontWriteEmptyFiles
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

const flattenFilesEntries = ({ generatorPath, relativePath = './', filesEntries, cumulativeFileEntries }) => {
  cumulativeFileEntries = cumulativeFileEntries || {};
  for(let entryRelativePath in filesEntries) {
    const entryValue = filesEntries[entryRelativePath];
    if(isArray(entryValue)) {
      cumulativeFileEntries[path.join(relativePath, entryRelativePath)] = entryValue;
    }
    else if(isString(entryValue)) {
      cumulativeFileEntries[path.join(relativePath, entryRelativePath)] = entryValue;
    }
    else if(isPlainObject(entryValue)) {
      flattenFilesEntries({
        relativePath: path.join(relativePath, entryRelativePath),
        filesEntries: entryValue,
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
  generateOptions
}) => {
  if(!fs.existsSync(path.join(__dirname, generatorPath))) {
    console.warn(`WARN: Could not find generator file "${generatorPath}". Skipping it. This means the file(s) it generates will not be in the output.`);
    return 0;
  }
  const filesEntries = await require('./' + generatorPath).generate(generateOptions);
  if(filesEntries == null) {
    return 0;
  }

  if(isPlainObject(filesEntries)) {
    return filesEntries;
  }

  console.warn(`WARN: Generator file "${generatorPath}" returned an invalid data type (${Object.prototype.toString.call(filesEntries)}). The generator should return an object of file(s) entries(s) with key being file paths to write and the value array(of code line for code files)/string(path to binary file to copy)/object(filesEntries[recursive]), or null/undefined to suppress generation. Skipping it. This means there will be no file(s) in the output form this generator file.`);
  return null;
};

const generateFilesEntries = async (generateOptions) => {
  const generators = [
    /**
     * the path to the generator like below example: (P.S. for the example `generatorsPaths` should be defined in `generateOptions`)
     *
     * const { map } = require( 'lodash' );
     * const { singleQuoteStringify } = require( './utils' );
     *
     * const generateGenerator_js = ({ generatorsPaths }) => {
     * ...
     * map(generatorsPaths, (generatorPath, i) => (
     *   `    ${singleQuoteStringify(generatorPath)}${i !== generatorsPaths.length - 1 ? ',' : ''}`
     * )),
     * ...
     * };
     */
  ];

  const filesEntries = {};

  for(let i = 0; i < generators.length; i++) {
    const generatorPath = generators[i];
    const currentFilesEntries = await getGeneratorFilesEntries({
      generatorPath,
      generateOptions
    });
    const currentFlattenedFilesEntries = flattenFilesEntries({ filesEntries: currentFilesEntries, generatorPath });
    forEach(currentFlattenedFilesEntries, (v, filePath) => {
      if(filesEntries[filePath]) {
        console.warn(`WARN: file multiple generators are writing to the following file ${filePath}.`);
      }
    });
    assign(filesEntries, currentFlattenedFilesEntries);
  }

  return filesEntries;
};

const generate = async ({
  outputPath,
  dontWriteEmptyFiles,
  lineSeperator,
  ...generateOptions
}) => {
  const filesEntries = await generateFilesEntries(generateOptions);

  writeFilesEntries({ filesEntries, outputPath, lineSeperator, dontWriteEmptyFiles });
};

const getOutputPath = () => {
  const outputPath = getAndRemoveOption(cmdOptions, 'path', 'o', 'out', 'output', 'outputPath', 'outFolderPath', 'outputFolderPath', 'outDirectoryPath', 'outputDirectoryPath', 'outputDir', 'outDirPath', 'outputDirPath');
  if(!outputPath) {
    throw new Error('Output path argument is required. Specify it using --o <path_to_put_generated_project_in>');
  }
  return path.resolve(outputPath);
};

const getGenerateOptions = async () => {

  let generateOptionsFromStdin;
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
      generateOptionsFromStdin = JSON.parse(jsonStr);
    }
    catch(err) {
      throw new Error(`Could not parse json options from stdin pipe. It does not look that it is the correct format.`);
    }
  }

  const jsonFilePath = getAndRemoveOption(cmdOptions, 'jsonFile', 'optionsFile', 'optionsJsonFile', 'optionsJSONFile', 'generateOptionsFile', 'generateOptionsJsonFile', 'generateOptionsJSONFile');
  let generateOptionsFromFile;
  if(jsonFilePath) {
    if(!fs.existsSync(jsonFilePath)) {
      throw new Error(`Could not find json options file "${jsonFilePath}" which resolves to ${path.resolve(jsonFilePath)}`);
    }
    try {
      generateOptionsFromFile = JSON.parse(fs.readFileSync(jsonFilePath, { encoding: 'utf8' }));
    }
    catch(err) {
      throw new Error(`Could not parse json options file "${jsonFilePath}" which resolves to ${path.resolve(jsonFilePath)}. It does not look that it is the correct format.`);
    }
  }

  return {
    ...generateOptionsFromStdin,
    ...generateOptionsFromFile,
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
};

exports.generate = async () => {

  const outputPath = getOutputPath();
  const generateOptions = await getGenerateOptions();

  return generate({
    ...generateOptions,
    outputPath,
    dontWriteEmptyFiles: cmdOptions.dontWriteEmptyFiles || cmdOptions.noEmptyFiles,
    lineSeperator: cmdOptions.lineSeperator || '\r\n',
  });
};

exports.generateFilesEntries = async () => {
  const generateOptions = await getGenerateOptions();
  return generateFilesEntries(generateOptions);
};