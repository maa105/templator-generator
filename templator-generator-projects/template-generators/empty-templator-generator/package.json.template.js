const { repeat } = require('lodash');
const baseGenerator = require('./generator.js');
const utils = require('./utils.js');

const level = 0;
const pathToRoot = './';
const generatorPath = '/package.json.template.js';

/**
 * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('./generator.js').FileGeneratorOptions} generatorOptions
 */
const generateFilesEntries = ({ version = '0.0.1', author = 'maa105' }, generatorOptions = {}) => {
  const fileName = `package.json`; // you can customise the output file name or path(put '../some_path/filename' or 'some_path/filename' or './some_path/filename' or even absolute path [using '/some_path/filename' or '~/some_path/filename'])
  const filePath = `/package.json`;
  const generatedLevel = generatorOptions.levelOverride != null ? generatorOptions.levelOverride : ((generatorOptions.baseLevel || 0) + level);
  const generatedPathToRoot = generatedLevel === 0 ? './' : repeat('../', generatedLevel);

  const codeLines = [ // you can use "generatedPathToRoot" here to generate code that is location dependent e.g. `require(generatedPathToRoot + 'utils.js')`
    `{`,
    `  "name": "templator-generator-empty-project",`,
    `  "version": "1.0.0",`,
    `  "description": "Project used to generate template generator, hopefully parametrising/smartifying them, and generating dynamic projects from those parametrised template generators",`,
    `  "main": "index.js",`,
    `  "scripts": {`,
    `    "generate": "generate",`,
    `    "generate-project": "generate-project",`,
    `    "generateProject": "generate-project",`,
    `    "template": "template-project",`,
    `    "template-project": "template-project",`,
    `    "templateProject": "template-project",`,
    `    "templator-generator": "templator-generator",`,
    `    "templatorGenerator": "templator-generator",`,
    `    "link": "npm link templator-generator",`,
    `    "unlink": "npm unlink templator-generator"`,
    `  },`,
    `  "author": "${author}",`,
    `  "license": "MIT",`,
    `  "dependencies": {`,
    `    "templator-generator": "^${version}"`,
    `  }`,
    `}`,
    ``
  ];
  return generatorOptions.addFilePath ? { [fileName]: codeLines } : codeLines; // you can return multiple files or an entire folder structure if you'd like, you can also use absolute paths by starting the key with slash(/) or tilda backslash(~/)
};
exports.generateFilesEntries = generateFilesEntries;

/**
 * @param {string} outputPath path to put the generated output in
 * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('./generator.js').FileGeneratorOptions} generatorOptions
 */
const generate = async (outputPath, generateOptions, generatorOptions = {}) => {
  const filesEntries = await generateFilesEntries(generateOptions, { ...generatorOptions, addFilePath: true });
  return baseGenerator.writeFilesEntries(outputPath, filesEntries, generatorOptions, generatorPath);
};
exports.generate = generate;