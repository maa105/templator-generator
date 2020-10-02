const { repeat } = require('lodash');
const baseGenerator = require('../generator.js');
const utils = require('../utils.js');

const level = 1;
const pathToRoot = '../';
const generatorPath = '/.bin/generate.template.js';

/**
 * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('../generator.js').FileGeneratorOptions} generatorOptions
 */
const getConfig = (generateOptions, generatorOptions = {}) => {
  const fileName = `generate.js`; // you can customise the output file name or path(put '../some_path/filename' or 'some_path/filename' or './some_path/filename' or even absolute path [using '/some_path/filename' or '~/some_path/filename'])
  const filePath = `/.bin/generate.js`;

  const generatedLevel = generatorOptions.level != null ? generatorOptions.level : (level + (generatorOptions.extraLevel || 0));
  const generatedPathToRoot = generatedLevel === 0 ? './' : repeat('../', generatedLevel);

  return { fileName, filePath, generatedLevel, generatedPathToRoot };
};

/**
 * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('../generator.js').FileGeneratorOptions} generatorOptions
 */
const generateFilesEntries = (generateOptions, generatorOptions = {}) => {
  const { fileName, filePath, generatedLevel, generatedPathToRoot } = getConfig(generateOptions, generatorOptions);

  const codeLines = [ // you can use "generatedPathToRoot" here to generate code that is location dependent e.g. `require(generatedPathToRoot + 'utils.js')`
    `#!/usr/bin/env node`,
    ``,
    `const { generate } = require('../generator');`,
    `generate();`,
    ``
  ];
  return generatorOptions.addFilePath ? { [fileName]: codeLines } : codeLines; // you can return multiple files or an entire folder structure if you'd like, you can also use absolute paths by starting the key with slash(/) or tilda backslash(~/)
};
exports.generateFilesEntries = generateFilesEntries;

/**
 * @param {string} outputPath path to put the generated output in
 * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('../generator.js').FileGeneratorOptions} generatorOptions
 */
const generate = async (outputPath, generateOptions, generatorOptions = {}) => {
  const filesEntries = await generateFilesEntries(generateOptions, { ...generatorOptions, addFilePath: true });
  return baseGenerator.writeFilesEntries(outputPath, filesEntries, generatorOptions, generatorPath);
};
exports.generate = generate;