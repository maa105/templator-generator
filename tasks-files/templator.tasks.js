const fs = require('fs-extra');
const path = require('path');
const { map, filter, repeat, trimStart, endsWith, forEach, assign, mapValues, trimEnd, trim } = require('lodash');
const { isBinaryFileSync } = require('isbinaryfile');
const { cmdOptions, backTickStringify, getCodeFromLines, getDirectoriesNames, getFilesNames, getAndRemoveOption, singleQuoteStringify, codeTransform, singleQuoteStrEscape, isDirectory, getFilesPaths } = require('../utils');
const { generateProject } = require('./generator.tasks');
const { default: ignore } = require('ignore');

const codifyFile = ({
  relativePath,
  inputFilePath,
  outputFilePath,
  binaryFilesRelativePath,
  binaryFilesAbsolutePath,
  fileIndex,
  level
}) => {

  if(isBinaryFileSync(inputFilePath)) {
    // binary files
    if(binaryFilesAbsolutePath) {
      fs.ensureDirSync(binaryFilesAbsolutePath);
      fs.copyFileSync(inputFilePath, path.join(binaryFilesAbsolutePath, fileIndex.toString()));
      fs.writeFileSync(outputFilePath, getCodeFromLines([
        `const { repeat } = require('lodash');`,
        `const baseGenerator = require('${level ? repeat('../', level) : './'}generator.js');`,
        `const utils = require('${level ? repeat('../', level) : './'}utils.js');`,
        ``,
        `const level = ${level};`,
        `const pathToRoot = '${level ? repeat('../', level) : './'}';`,
        `const generatorPath = ${singleQuoteStringify('/' + path.join(relativePath, path.basename(outputFilePath)).replace(/\\/gmi, '/'))};`,
        ``,
        `/**`,
        ` * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)`,
        ` * @param {import('${(level === 0 ? './' : repeat('../', level))}generator.js').FileGeneratorOptions} generatorOptions`,
        ` */`,
        `const getConfig = (generateOptions, generatorOptions = {}) => {`,
        `  const fileName = ${backTickStringify(path.basename(inputFilePath))}; // you can customise the output file name or path(put '../some_path/filename' or 'some_path/filename' or './some_path/filename' or even absolute path [using '/some_path/filename' or '~/some_path/filename'])`,
        `  const filePath = ${backTickStringify('/' + path.join(relativePath, path.basename(inputFilePath)).replace(/\\/gmi, '/'))};`,
        `  const srcBinaryPath = './${singleQuoteStrEscape(path.join(binaryFilesRelativePath, fileIndex.toString()).replace(/\\/gmi, '/'))}';`,
        ``,
        `  const generatedLevel = generatorOptions.level != null ? generatorOptions.level : (level + (generatorOptions.extraLevel || 0));`,
        `  const generatedPathToRoot = generatedLevel === 0 ? './' : repeat('../', generatedLevel);`,
        ``,
        `  return { fileName, filePath, srcBinaryPath, myGeneratorPath, generatedLevel, generatedPathToRoot };`,
        `};`,
        ``,
        `/**`,
        ` * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)`,
        ` * @param {import('${(level === 0 ? './' : repeat('../', level))}generator.js').FileGeneratorOptions} generatorOptions`,
        ` */`,
        `const generateFilesEntries = (generateOptions, generatorOptions = {}) => {`,
        `  const { fileName, srcBinaryPath } = getConfig(generateOptions, generatorOptions);`,
        ``,
        `  return generatorOptions.addFilePath ? { [fileName]: srcBinaryPath } : srcBinaryPath; // you can return multiple files or an entire folder structure if you'd like, you can also use absolute paths by starting the key with slash(/) or tilda backslash(~/)`,
        `};`,
        `exports.generateFilesEntries = generateFilesEntries;`,
        ``,
        `/**`,
        ` * @param {string} outputPath path to put the generated output in`,
        ` * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)`,
        ` * @param {import('${(level === 0 ? './' : repeat('../', level))}generator.js').FileGeneratorOptions} generatorOptions`,
        ` */`,
        `const generate = async (outputPath, generateOptions, generatorOptions = {}) => {`,
        `  const filesEntries = await generateFilesEntries(generateOptions, { ...generatorOptions, addFilePath: true });`,
        `  return baseGenerator.writeFilesEntries(outputPath, filesEntries, generatorOptions, generatorPath);`,
        `};`,
        `exports.generate = generate;`,
      ]), { encoding: 'utf8' });
      return true;
    }
    else {
      console.warn(`No binaryFilesPath provided to put binary files in. skipping ${inputFilePath}. This means no generator for it will be generated.`);
      return false;
    }
  }

  // code files
  const fileContent = fs.readFileSync(inputFilePath, { encoding: 'utf8' }).replace(/\r\n/gmi, '\n').replace(/\r/gmi, '\n').replace(/\n/gmi, '\r\n');
  const lines = fileContent.split('\r\n');

  fs.writeFileSync(outputFilePath, getCodeFromLines([
    `const { repeat } = require('lodash');`,
    `const baseGenerator = require('${level ? repeat('../', level) : './'}generator.js');`,
    `const utils = require('${level ? repeat('../', level) : './'}utils.js');`,
    ``,
    `const level = ${level};`,
    `const pathToRoot = '${level ? repeat('../', level) : './'}';`,
    `const generatorPath = ${singleQuoteStringify('/' + path.join(relativePath, path.basename(outputFilePath)).replace(/\\/gmi, '/'))};`,
    ``,
    `/**`,
    ` * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)`,
    ` * @param {import('${(level === 0 ? './' : repeat('../', level))}generator.js').FileGeneratorOptions} generatorOptions`,
    ` */`,
    `const getConfig = (generateOptions, generatorOptions = {}) => {`,
    `  const fileName = ${backTickStringify(path.basename(inputFilePath))}; // you can customise the output file name or path(put '../some_path/filename' or 'some_path/filename' or './some_path/filename' or even absolute path [using '/some_path/filename' or '~/some_path/filename'])`,
    `  const filePath = ${backTickStringify('/' + path.join(relativePath, path.basename(inputFilePath)).replace(/\\/gmi, '/'))};`,
    ``,
    `  const generatedLevel = generatorOptions.level != null ? generatorOptions.level : (level + (generatorOptions.extraLevel || 0));`,
    `  const generatedPathToRoot = generatedLevel === 0 ? './' : repeat('../', generatedLevel);`,
    ``,
    `  return { fileName, filePath, generatedLevel, generatedPathToRoot };`,
    `};`,
    ``,
    `/**`,
    ` * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)`,
    ` * @param {import('${(level === 0 ? './' : repeat('../', level))}generator.js').FileGeneratorOptions} generatorOptions`,
    ` */`,
    `const generateFilesEntries = (generateOptions, generatorOptions = {}) => {`,
    `  const { fileName, filePath, generatedLevel, generatedPathToRoot } = getConfig(generateOptions, generatorOptions);`,
    ``,
    `  const codeLines = [ // you can use "generatedPathToRoot" here to generate code that is location dependent e.g. \`require(generatedPathToRoot + 'utils.js')\``,
    codeTransform(lines, backTickStringify, ',', 4),
    `  ];`,
    `  return generatorOptions.addFilePath ? { [fileName]: codeLines } : codeLines; // you can return multiple files or an entire folder structure if you'd like, you can also use absolute paths by starting the key with slash(/) or tilda backslash(~/)`,
    `};`,
    `exports.generateFilesEntries = generateFilesEntries;`,
    ``,
    `/**`,
    ` * @param {string} outputPath path to put the generated output in`,
    ` * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)`,
    ` * @param {import('${(level === 0 ? './' : repeat('../', level))}generator.js').FileGeneratorOptions} generatorOptions`,
    ` */`,
    `const generate = async (outputPath, generateOptions, generatorOptions = {}) => {`,
    `  const filesEntries = await generateFilesEntries(generateOptions, { ...generatorOptions, addFilePath: true });`,
    `  return baseGenerator.writeFilesEntries(outputPath, filesEntries, generatorOptions, generatorPath);`,
    `};`,
    `exports.generate = generate;`,
  ]), { encoding: 'utf8' });
  return true;
};

const snippetIncludesName = 'includes';
const writeInclude = ({ relativePath, outDir, level, includeCodeLines, includeKey }) => {

  const includeGeneratorFileName = includeKey + '.include.js';

  fs.writeFileSync(path.join(outDir, includeGeneratorFileName), getCodeFromLines([
    `const { repeat } = require('lodash');`,
    `const baseGenerator = require('${level ? repeat('../', level) : './'}generator.js');`,
    `const utils = require('${level ? repeat('../', level) : './'}utils.js');`,
    ``,
    `const level = ${level};`,
    `const pathToRoot = '${level ? repeat('../', level) : './'}';`,
    `const generatorPath = ${singleQuoteStringify('/' + path.normalize(path.join(relativePath, 'index.js')).replace(/\\/gmi, '/'))};`,
    ``,
    `/**`,
    ` * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)`,
    ` * @param {import('${(level === 0 ? './' : repeat('../', level))}generator.js').FileGeneratorOptions} generatorOptions`,
    ` */`,
    `const getConfig = (generateOptions, generatorOptions = {}) => {`,
    `  const includeKey = ${backTickStringify(includeKey)}; // you can customise include key`,
    ``,
    `  const generatedLevel = generatorOptions.level != null ? generatorOptions.level : (level - 2 + (generatorOptions.extraLevel || 0)); // the -2, -1 of it is because because the snippet generator is in a directory which adds an extra level not there in the generated files, the other -1 is due to includes generators are under directory "${snippetIncludesName}" adding yet another extra level`,
    `  const generatedPathToRoot = generatedLevel === 0 ? './' : repeat('../', generatedLevel);`,
    ``,
    `  return { includeKey, generatedLevel, generatedPathToRoot };`,
    `};`,
    ``,
    `/**`,
    ` * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)`,
    ` * @param {import('${(level === 0 ? './' : repeat('../', level))}generator.js').FileGeneratorOptions} generatorOptions`,
    ` */`,
    `const generateInclude = (generateOptions, generatorOptions = {}) => {`,
    `  const { includeKey } = getConfig(generateOptions, generatorOptions);`,
    ``,
    `  const codeLines = [`,
    codeTransform(includeCodeLines, backTickStringify, ',', 4),
    `  ];`,
    `  return { [includeKey]: codeLines }; // you can return multiple includes`,
    `};`,
    `exports.generateInclude = generateInclude;`,
  ]), { encoding: 'utf8' });
};

const writeSnippet = ({ relativePath, level, outDir, snippetFilePath }) => {
  const fileContent = trim(fs.readFileSync(snippetFilePath, { encoding: 'utf8' }).replace(/\r\n/gmi, '\n').replace(/\r/gmi, '\n').replace(/\n/gmi, '\r\n'));
  const snippetCodeLines = fileContent.split('\r\n');

  const snippetKey = path.parse(snippetFilePath).name;
  const snippetGeneratorFileName = snippetKey + '.snippet.js';

  fs.writeFileSync(path.join(outDir, snippetGeneratorFileName), getCodeFromLines([
    `const { repeat } = require('lodash');`,
    `const baseGenerator = require('${level ? repeat('../', level) : './'}generator.js');`,
    `const utils = require('${level ? repeat('../', level) : './'}utils.js');`,
    ``,
    `const level = ${level};`,
    `const pathToRoot = '${level ? repeat('../', level) : './'}';`,
    `const generatorPath = ${singleQuoteStringify('/' + path.normalize(path.join(relativePath, snippetGeneratorFileName)).replace(/\\/gmi, '/'))};`,
    ``,
    `/**`,
    ` * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)`,
    ` * @param {import('${(level === 0 ? './' : repeat('../', level))}generator.js').FileGeneratorOptions} generatorOptions`,
    ` */`,
    `const getConfig = (generateOptions, generatorOptions = {}) => {`,
    `  const snippetKey = ${backTickStringify(snippetKey)}; // you can customise snippet key`,
    ``,
    `  const generatedLevel = generatorOptions.level != null ? generatorOptions.level : (level - 1 + (generatorOptions.extraLevel || 0)); // the -1 is because the snippet generator is in a directory which adds an extra level not there in the generated files`,
    `  const generatedPathToRoot = generatedLevel === 0 ? './' : repeat('../', generatedLevel);`,
    ``,
    `  return { snippetKey, generatedLevel, generatedPathToRoot };`,
    `};`,
    ``,
    `/**`,
    ` * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)`,
    ` * @param {import('${(level === 0 ? './' : repeat('../', level))}generator.js').FileGeneratorOptions} generatorOptions`,
    ` */`,
    `const generateSnippet = (generateOptions, generatorOptions = {}) => {`,
    `  const { snippetKey, generatedLevel, generatedPathToRoot } = getConfig(generateOptions, generatorOptions);`,
    ``,
    `  const codeLines = [ // you can use "generatedPathToRoot" here to generate code that is location dependent e.g. \`require(generatedPathToRoot + 'utils.js')\``,
    codeTransform(snippetCodeLines, backTickStringify, ',', 4),
    `  ];`,
    `  return { [snippetKey]: { codeLines, includes: [/* add here keys of includes (or new includes as {key, codeLines, [sortOrder]}) this snippet requires */] } }; // you can return multiple snippets`,
    `};`,
    `exports.generateSnippet = generateSnippet;`,
  ]), { encoding: 'utf8' });
};

const templateSnippets = ({
  inputPath,
  outputPath,
  level,
  relativePath,
  ignoreFunc
}) => {
  const keyedIncludes = {};

  const includesDir = path.join(inputPath, snippetIncludesName);
  if(fs.existsSync(includesDir) && isDirectory(includesDir)) {
    const includesFiles = getFilesPaths(includesDir);
    forEach(includesFiles, (includeFile) => {
      const fileContent = trim(fs.readFileSync(includeFile, { encoding: 'utf8' }).replace(/\r\n/gmi, '\n').replace(/\r/gmi, '\n').replace(/\n/gmi, '\r\n'));
      const lines = fileContent.split('\r\n');
    
      const name = path.parse(includeFile).name;
      keyedIncludes[name] = lines;
    });
  }
  
  const includesJSONFile = path.join(inputPath, snippetIncludesName + '.json');
  if(fs.existsSync(includesJSONFile) && !isDirectory(includesJSONFile)) {
    const includesJSON = fs.readJSONSync(includesJSONFile, { encoding: 'utf8' });
    assign(keyedIncludes, includesJSON);
  }

  const includesOutDir = path.join(outputPath, snippetIncludesName);
  fs.ensureDirSync(includesOutDir);
  forEach(keyedIncludes, (includeCodeLines, includeKey) => {
    writeInclude({ relativePath: path.join(relativePath, snippetIncludesName), level: level + 1, outDir: includesOutDir, includeCodeLines, includeKey });
  });

  const filesPaths = map(
    filter(
      getFilesNames(inputPath),
      (name) => (ignoreFunc(path.join(relativePath, name)) || name === snippetIncludesName + '.json')
    ),
    (name) => path.join(inputPath, name)
  );

  forEach(filesPaths, (filePath) => {
    writeSnippet({ relativePath, level, outDir: outputPath, snippetFilePath: filePath });
  });

  fs.writeFileSync(path.join(outputPath, 'index.js'), getCodeFromLines([
    `const path = require('path');`,
    `const { repeat, filter, endsWith, map, assign, forEach } = require('lodash');`,
    `const baseGenerator = require('${level ? repeat('../', level) : './'}generator.js');`,
    `const { getFilesNames, SnippetsCompiler } = require('${level ? repeat('../', level) : './'}utils.js');`,
    ``,
    `const level = ${level};`,
    `const pathToRoot = '${level ? repeat('../', level) : './'}';`,
    `const generatorPath = ${singleQuoteStringify('/' + path.normalize(path.join(relativePath, 'index.js')).replace(/\\/gmi, '/'))};`,
    ``,
    `/**`,
    ` * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)`,
    ` * @param {import('${(level === 0 ? './' : repeat('../', level))}generator.js').FileGeneratorOptions} generatorOptions`,
    ` */`,
    `const getConfig = (generateOptions, generatorOptions = {}) => {`,
    `  const fileName = ${backTickStringify(path.basename(inputPath).replace(/.snippets.js$/gmi, '.js'))}; // you can customise the output file name or path(put '../some_path/filename' or 'some_path/filename' or './some_path/filename' or even absolute path [using '/some_path/filename' or '~/some_path/filename'])`,
    `  const filePath = ${backTickStringify('/' + trimEnd(path.normalize(path.join(relativePath)).replace(/\\/gmi, '/'), '/').replace(/.snippets.js$/gmi, '.js'))};`,
    ``,
    `  const generatedLevel = generatorOptions.level != null ? generatorOptions.level : (level + (generatorOptions.extraLevel || 0));`,
    `  const generatedPathToRoot = generatedLevel === 0 ? './' : repeat('../', generatedLevel);`,
    ``,
    `  return { fileName, filePath, generatedLevel, generatedPathToRoot };`,
    `};`,
    ``,
    `const getIncludesGenerators = () => map(filter(getFilesNames(path.join(__dirname, ${singleQuoteStringify(snippetIncludesName)})), (name) => endsWith(name, '.include.js')), (name) => \`./${snippetIncludesName}/\${name}\`);`,
    `const getSnippetsGenerators = () => map(filter(getFilesNames(__dirname), (name) => endsWith(name, '.snippet.js')), (name) => \`./\${name}\`);`,
    ``,
    `/**`,
    ` * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)`,
    ` * @param {import('${(level === 0 ? './' : repeat('../', level))}generator.js').FileGeneratorOptions} generatorOptions`,
    ` */`,
    `const generateFilesEntries = async (generateOptions, generatorOptions = {}) => {`,
    `  const { fileName, filePath, generatedLevel, generatedPathToRoot } = getConfig(generateOptions, { ...generatorOptions, /* override generatorOptions here (e.g. \`level\`/\`extraLevel\`) */ });`,
    ``,
    `  const includesGenerators = getIncludesGenerators();`,
    `  const keyedIncludes = {};`,
    `  for(let i = 0; i < includesGenerators.length; i++) {`,
    `    const inc = await require(includesGenerators[i]).generateInclude(generateOptions, generatorOptions);`,
    `    assign(keyedIncludes, inc);`,
    `  }`,
    `  const snippetsGenerators = getSnippetsGenerators();`,
    `  const snippets = [];`,
    `  for(let i = 0; i < snippetsGenerators.length; i++) {`,
    `    const snips = await require(snippetsGenerators[i]).generateSnippet(generateOptions, generatorOptions);`,
    `    snippets.push(`,
    `      ...map(snips, (snippetBody, snippetKey) => ({ key: snippetKey,...snippetBody }))`,
    `    );`,
    `  }`,
    ``,
    `  const compiler = new SnippetsCompiler({ name: fileName, keyedIncludes });`,
    `  forEach(snippets, compiler.addSnippet);`,
    ``,
    `  return generatorOptions.addFilePath ? { [fileName]: compiler } : compiler; // you can return multiple files or an entire folder structure if you'd like, you can also use absolute paths by starting the key with slash(/) or tilda backslash(~/)`,
    `};`,
    `exports.generateFilesEntries = generateFilesEntries;`,
    ``,
    `/**`,
    ` * @param {string} outputPath path to put the generated output in`,
    ` * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)`,
    ` * @param {import('${(level === 0 ? './' : repeat('../', level))}generator.js').FileGeneratorOptions} generatorOptions`,
    ` */`,
    `const generate = async (outputPath, generateOptions, generatorOptions = {}) => {`,
    `  const filesEntries = await generateFilesEntries(generateOptions, { ...generatorOptions, addFilePath: true });`,
    `  return baseGenerator.writeFilesEntries(outputPath, filesEntries, generatorOptions, generatorPath);`,
    `};`,
    `exports.generate = generate;`,
  ]), { encoding: 'utf8' });
  
};


const templateProject = ({
  inputPath,
  outputPath,
  level = 0,
  ignoreFunc = (entryPath) => {
    const name = path.basename(entryPath);
    return name !== 'node_modules' && name !== 'build' && name !== 'builds' && name !== 'dist' && name !== 'test';
  },
  snippetDetectFunc = (dirPath) => {
    const name = path.basename(dirPath);
    return endsWith(name, '.snippets.js')
  },
  relativePath = './',
  binaryFilesAbsolutePath,
  binaryFilesRelativePath,
  fileIndex = 0
}) => {
  binaryFilesRelativePath = binaryFilesRelativePath || './binary-files';
  
  inputPath = path.resolve(inputPath);
  outputPath = path.resolve(outputPath);

  binaryFilesAbsolutePath = binaryFilesAbsolutePath || path.join(outputPath, './binary-files');

  const convertInToOut = (inPath) => path.resolve(path.join(outputPath, path.resolve(inPath).substr(inputPath.length)));

  fs.ensureDirSync(outputPath);
  
  const dirs = map(
    filter(
      getDirectoriesNames(inputPath),
      (name) => ignoreFunc(path.join(relativePath, name))
    ),
    (name) => path.join(inputPath, name)
  );

  const filesPaths = map(
    filter(
      getFilesNames(inputPath),
      (name) => ignoreFunc(path.join(relativePath, name))
    ),
    (name) => path.join(inputPath, name)
  );
  
  for(let i = 0; i < filesPaths.length; i++) {
    const filePath = filesPaths[i];
    const outFile = path.parse(convertInToOut(filePath));
    const outFileName = outFile.name + (outFile.ext === '.js' ? '' : outFile.ext) + '.template.js';
    const outFilePath = path.join(outFile.dir, outFileName);
    
    codifyFile({
      relativePath,
      inputFilePath: filePath,
      outputFilePath: outFilePath,
      binaryFilesAbsolutePath,
      binaryFilesRelativePath,
      fileIndex: ++fileIndex,
      level
    });
  }

  for(let i = 0; i < dirs.length; i++) {
    const dirPath = dirs[i];
    if(snippetDetectFunc(dirPath)) {
      templateSnippets({
        inputPath: dirPath,
        outputPath: convertInToOut(dirPath),
        level: level + 1,
        relativePath: './' + path.join(relativePath, path.basename(dirPath)),
        ignoreFunc
      });
    }
    else {
      fileIndex = templateProject({
        inputPath: dirPath,
        outputPath: convertInToOut(dirPath),
        level: level + 1,
        ignoreFunc,
        relativePath: './' + path.join(relativePath, path.basename(dirPath)),
        binaryFilesAbsolutePath,
        binaryFilesRelativePath,
        fileIndex
      });
    }
  }

  const currDirGenerator = getCodeFromLines([
    `const path = require('path');`,
    `const fs = require('fs-extra');`,
    `const { repeat, filter, endsWith, map } = require('lodash');`,
    `const baseGenerator = require('${level ? repeat('../', level) : './'}generator.js');`,
    `const { getFilesPaths, getDirectoriesPaths } = require('${level ? repeat('../', level) : './'}utils.js');`,
    ``,
    `const level = ${level};`,
    `const pathToRoot = '${level ? repeat('../', level) : './'}';`,
    `const generatorPath = './${singleQuoteStrEscape(path.normalize(path.join(relativePath, 'index.js')).replace(/\\/gmi, '/'))}';`,
    ``,
    `/**`,
    ` * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)`,
    ` * @param {import('${(level === 0 ? './' : repeat('../', level))}generator.js').FileGeneratorOptions} generatorOptions`,
    ` */`,
    `const getConfig = (generateOptions, generatorOptions = {}) => {`,
    `  const directoryName = ${level === 0 ? `\`\`` : backTickStringify(path.basename(relativePath))}; // you can customise the output directory name or path(put '../some_path/dir_name' or 'some_path/dir_name' or even absolute path [using '/some_path/dir_name' or '~/some_path/dir_name'])`,
    `  const directoryPath = ${backTickStringify(trimStart(relativePath, '.').replace(/\\/gmi, '/'))};`,
    ``,
    `  const generatedLevel = generatorOptions.level != null ? generatorOptions.level : (level + (generatorOptions.extraLevel || 0));`,
    `  const generatedPathToRoot = generatedLevel === 0 ? './' : repeat('../', generatedLevel);`,
    ``,
    `  return { directoryName, directoryPath, generatedLevel, generatedPathToRoot };`,
    `};`,
    ``,
    `const getFilesGenerators = () => map(filter(getFilesPaths(__dirname), (path) => endsWith(path, '.template.js')), (path) => baseGenerator.getRootRelativePath(path));`,
    `const getDirectoriesGenerators = () => map(filter(getDirectoriesPaths(__dirname), (dirPath) => fs.existsSync(path.join(dirPath, 'index.js'))), (dirPath) => baseGenerator.getRootRelativePath(path.join(dirPath, 'index.js')));`,
    ``,
    `/**`,
    ` * @param {Object} generateOptions object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)`,
    ` * @param {import('${(level === 0 ? './' : repeat('../', level))}generator.js').DirectoryGeneratorOptions} generatorOptions`,
    ` */`,
    `const generateFilesEntries = async (generateOptions, generatorOptions = baseGenerator.defaultGeneratorOptions) => {`,
    `  const { directoryName, directoryPath, generatedLevel, generatedPathToRoot } = getConfig(generateOptions, generatorOptions);`,
    ``,
    `  generatorOptions = { ...baseGenerator.defaultGeneratorOptions, ...generatorOptions };`,
    `  const gens = (`,
    `    generatorOptions.generateRootFiles ? (`,
    `      generatorOptions.generateSubDirectories ?`,
    `        [...getFilesGenerators(), ...getDirectoriesGenerators()]`,
    `        : getFilesGenerators()`,
    `    ) : (`,
    `      generatorOptions.generateSubDirectories ?`,
    `        getDirectoriesGenerators()`,
    `        : null`,
    `    )`,
    `  );`,
    `  if(gens == null) {`,
    `    throw new Error('"generateSubDirectories" and "generateRootFiles" both false in generatorOptions!');`,
    `  }`,
    `  const children = await baseGenerator.generateFilesEntries(gens, generateOptions, generatorOptions);`,
    `  return (generatorOptions.addDirectoryPath && directoryName) ? { [directoryName]: children } : children; // you can return multiple files and directories or whatever your heart desires, you can also use absolute paths by starting the key with slash(/) or tilda backslash(~/)`,
    `};`,
    `exports.generateFilesEntries = generateFilesEntries;`,
    ``,
    `/**`,
    ` * @param {string} outputPath path to put the generated output in`,
    ` * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)`,
    ` * @param {import('${(level === 0 ? './' : repeat('../', level))}generator.js').DirectoryGeneratorOptions} generatorOptions generator options`,
    ` */`,
    `const generate = async (outputPath, generateOptions, generatorOptions) => {`,
    `  const filesEntries = await generateFilesEntries(generateOptions, generatorOptions);`,
    `  return baseGenerator.writeFilesEntries(outputPath, filesEntries, generatorOptions, generatorPath);`,
    `};`,
    `exports.generate = generate;`
  ]);

  fs.writeFileSync(path.join(outputPath, 'index.js'), currDirGenerator, { encoding: 'utf8' });

  return fileIndex;
};

exports.templateProject = async () => {
  const help = getAndRemoveOption(cmdOptions, 'h', 'help');
  if(help) {
    console.log(`This command generates a project generator for a given project. i.e. it creates a project with a generate command that generates a replica of the project specified. The generator that is generated at face value seems pointless. But the idea is the user will update the generator project and add options to it so as to make the generator configurable/smarter. The code for the generator is very simple and relies mostly on the backtick (\`) strings making it very easy to customise using \${} templates.`);
    console.log(`P.S. templateProject stands for generate a project generator from project XYZ. So like make project XYZ a template. Thats the best name I could come up with as generateGenerator sound aweful :|`);
    console.log(`This command takes the following arguments:`);
    console.log(` --i <path_to_project_to_template>. Where <path_to_project_to_template> is the absolute or relative path to the project you want to generate a generator for. Aliases(1): --in --input --folder --dir --directory --inFolderPath --inputFolderPath --folderPath --inDirectoryPath --inputDirectoryPath --directoryPath --inDirPath --inputDirPath --dirPath --p --proj --project --projPath --projectPath`);
    console.log(`     input project path can be first positional argument too \`template-project <path_to_project_to_template>\``);
    console.log(` [--o <output_path>]. Where <output_path> is the path you want to put the generated project generator in. Default "./templator-generator-projects/template-generators/<name_of_input_folder>. Aliases(1): --out --output --outFolderPath --outputFolderPath --outDirectoryPath --outputDirectoryPath --outDirPath --outputDirPath`);
    console.log(`     output path can be first positional argument too \`template-project --i <path_to_project_to_template> <output_path>\``);
    console.log(`     output path can be second positional argument too \`template-project <path_to_project_to_template> <output_path>\``);
    console.log(` [--ignore <path_to_ignore_file>]. Where <path_to_ignore_file> is the absolute or relative path to the a .gitignore style file to use to ignore files/directories from the templating process. Currently there is one preset for react use it as follows: \`--ignore react\`. defaults to .gitignore inside input project, then ./templator.ignore then templator.ignore in input project finally if none are found it will ignore all nod_modules. Aliases(1): --ig --ignoreFile --ignoreFilePath --i(in case --i is not used for the input project to template)`);
    console.log(``);
    console.log(`(1) Aliases also work if you use them in kebab-case instead of camelCase.`);
    return;
  }

  const input = getAndRemoveOption(cmdOptions, 0, 'i', 'in', 'input', 'folder', 'dir', 'directory', 'inFolderPath', 'inputFolderPath', 'folderPath', 'inDirectoryPath', 'inputDirectoryPath', 'directoryPath', 'inDirPath', 'inputDirPath', 'dirPath', 'p', 'proj', 'project', 'projPath', 'projectPath');
  if(!input) {
    throw new Error('Input project path argument is required. Specify it using --i <path_to_project_to_template>. Where <path_to_project_to_template> is the absolute or relative path to the project you want to generate a generator for. (for more info add --h or --help to the command');
  }

  let inputPath;
  if(path.isAbsolute(input)) {
    if(!fs.existsSync(input)) {
      throw new Error(`Could not find input project at "${input}". Folder does not exist!`);
    }
    inputPath = input;
  }
  else {
    const possiblePaths = [
      path.resolve(input),
      path.resolve(path.join('./templator-generator-projects/base-templates', input)),
      path.resolve(path.join('./base-templates', input)),
      path.resolve(path.join(__dirname, '../templator-generator-projects/base-templates', input)),
      path.resolve(path.join(__dirname, '..', input))
    ];
    for(let i = 0; i < possiblePaths.length; i++) {
      if(fs.existsSync(possiblePaths[i])) {
        inputPath = possiblePaths[i];
        break;
      }
    }
    if(!inputPath) {
      throw new Error(`Could not resolve input project "${input}". tried "${possiblePaths.join('", "')}" none exist!`);
    }
    console.log(`Using input project "${inputPath}"`);
  }

  const outputPath = path.resolve(getAndRemoveOption(cmdOptions, 0, 'o', 'out', 'output', 'outputPath', 'outFolderPath', 'outputFolderPath', 'outDirectoryPath', 'outputDirectoryPath', 'outputDir', 'outDirPath', 'outputDirPath') || path.join('./templator-generator-projects', cmdOptions.dev ? 'generated-templates' : 'template-generators', path.basename(inputPath)));

  let ignoreFilePath = getAndRemoveOption(cmdOptions, 'ignore', 'ig', 'ignoreFile', 'ignoreFilePath', 'i');

  if(ignoreFilePath && path.isAbsolute(ignoreFilePath)) {
    if(!fs.existsSync(ignoreFilePath)) {
      throw new Error(`Could not find ignore file at "${ignoreFilePath}". File does not exist!`);
    }
  }
  else {
    const possiblePaths = [];
    if(ignoreFilePath) {
      possiblePaths.push(
        path.resolve(ignoreFilePath),
        path.resolve(path.join(inputPath, ignoreFilePath)),
        endsWith(ignoreFilePath, '.ignore') ?
          path.resolve(path.join(__dirname, '../ignores', ignoreFilePath)) :
          path.resolve(path.join(__dirname, '../ignores', ignoreFilePath + '.ignore'))
      );
    }
    else {
      possiblePaths.push(
        path.resolve(path.join(inputPath, '.gitignore')),
        path.resolve('./templator.ignore'),
        path.resolve(path.join(inputPath, 'templator.ignore')),
        path.resolve(path.join(__dirname, '../ignores/default.ignore'))
      );
    }

    let foundIgnore;
    for(let i = 0; i < possiblePaths.length; i++) {
      if(fs.existsSync(possiblePaths[i])) {
        foundIgnore = possiblePaths[i];
        break;
      }
    }
    if(!foundIgnore) {
      throw new Error(`Could not resolve ignore file path "${ignoreFilePath}". tried "${possiblePaths.join('", "')}" none exist!`);
    }
    ignoreFilePath = foundIgnore;
    console.log(`Using ignore file "${ignoreFilePath}"`);
  }

  const ignoreFunc = ignore().add(fs.readFileSync(ignoreFilePath, { encoding: 'utf8' })).createFilter();

  templateProject({
    inputPath,
    outputPath,
    ignoreFunc
  });

  await generateProject({ projectName: path.basename(inputPath), ...cmdOptions, generatorPath: path.join(__dirname, '../templator-generator-projects/template-generators/base-generator'), outputPath });

  console.log(`Generator for "${inputPath}" successfully written to "${outputPath}."`);
  console.log(`Note this is just a dummy generator. The idea is you go to ${outputPath} and customise/parametrise your generator so it becomes dynamic/generic/configurable or smart like you!"`);
  console.log(`To run the generator either`);
  console.log(`(1)`);
  console.log(`  a- run \`generate-project --g ${JSON.stringify(outputPath)} [--o <where_to_write_the_output_generated_project>] [--optionsFile <path_to_a_json_options_file_for_your_smartly_configured_generator>] [--<other_inline_option(s)_for_your_smartly_configured_generator_key> <other_inline_option(s)_for_your_smartly_configured_generator_value>]\``);
  console.log(`(2)`);
  console.log(`  a- run \`cd ${JSON.stringify(outputPath)}`);
  console.log(`  b- run \`npm generate -- --g ${JSON.stringify(outputPath)} [--o <where_to_write_the_output_generated_project>] [--optionsFile <path_to_a_json_options_file_for_your_smartly_configured_generator>] [--<other_inline_option(s)_for_your_smartly_configured_generator_key> <other_inline_option(s)_for_your_smartly_configured_generator_value>]\``);
};
