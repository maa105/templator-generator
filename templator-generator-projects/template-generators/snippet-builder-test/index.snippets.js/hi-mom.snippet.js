const { repeat } = require('lodash');
const baseGenerator = require('../generator.js');
const utils = require('../utils.js');

const level = 1;
const pathToRoot = '../';
const generatorPath = '/index.snippets.js/hi-mom.snippet.js';

/**
 * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('../generator.js').FileGeneratorOptions} generatorOptions
 */
const generateSnippet = (generateOptions, generatorOptions = {}) => {
  const snippetKey = `hi-mom`; // you can customise snippet key
  const generatedLevel = generatorOptions.levelOverride != null ? generatorOptions.levelOverride : ((generatorOptions.baseLevel || 0) + level - 1); // the -1 is because the snippet generator is in a directory which adds an extra level not there in the generated files
  const generatedPathToRoot = generatedLevel === 0 ? './' : repeat('../', generatedLevel);

  const codeLines = [ // you can use "generatedPathToRoot" here to generate code that is location dependent e.g. `require(generatedPathToRoot + 'utils.js')`
    `greet('Hi', 'mom');`
  ];
  return { [snippetKey]: { codeLines, includes: ['greet'] } }; // you can return multiple snippets
};
exports.generateSnippet = generateSnippet;