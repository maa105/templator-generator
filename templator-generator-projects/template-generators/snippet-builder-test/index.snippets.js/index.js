const path = require('path');
const { repeat, filter, endsWith, map, assign, forEach } = require('lodash');
const baseGenerator = require('../generator.js');
const { getFilesNames, SnippetsCompiler } = require('../utils.js');

const level = 1;
const pathToRoot = '../';
const generatorPath = '/index.snippets.js/index.js';

const getIncludesGenerators = () => map(filter(getFilesNames(path.join(__dirname, 'includes')), (name) => endsWith(name, '.include.js')), (name) => `./includes/${name}`);
const getSnippetsGenerators = () => map(filter(getFilesNames(__dirname), (name) => endsWith(name, '.snippet.js')), (name) => `./${name}`);

/**
 * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('../generator.js').FileGeneratorOptions} generatorOptions
 */
const generateFilesEntries = async (generateOptions, generatorOptions = {}) => {
  const fileName = `index.js`; // you can customise the output file name or path(put '../some_path/filename' or 'some_path/filename' or './some_path/filename' or even absolute path [using '/some_path/filename' or '~/some_path/filename'])
  const filePath = `/index.js`;
  const generatedLevel = generatorOptions.levelOverride != null ? generatorOptions.levelOverride : ((generatorOptions.baseLevel || 0) + level);
  const generatedPathToRoot = generatedLevel === 0 ? './' : repeat('../', generatedLevel);

  const includesGenerators = getIncludesGenerators();
  const keyedIncludes = {};
  for(let i = 0; i < includesGenerators.length; i++) {
    const inc = await require(includesGenerators[i]).generateInclude(generateOptions, generatorOptions);
    assign(keyedIncludes, inc);
  }
  const snippetsGenerators = getSnippetsGenerators();
  const snippets = [];
  for(let i = 0; i < snippetsGenerators.length; i++) {
    const snips = await require(snippetsGenerators[i]).generateSnippet(generateOptions, generatorOptions);
    snippets.push(
      ...map(snips, (snippetBody, snippetKey) => ({ key: snippetKey,...snippetBody }))
    );
  }

  const compiler = new SnippetsCompiler({ name: fileName, keyedIncludes });
  forEach(snippets, compiler.addSnippet);

  return generatorOptions.addFilePath ? { [fileName]: compiler } : compiler; // you can return multiple files or an entire folder structure if you'd like, you can also use absolute paths by starting the key with slash(/) or tilda backslash(~/)
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