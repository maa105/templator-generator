const { repeat } = require('lodash');
const baseGenerator = require('../../generator.js');
const utils = require('../../utils.js');

const level = 2;
const pathToRoot = '../../';
const generatorPath = '/index.snippets.js/includes/index.js';

/**
 * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('../../generator.js').FileGeneratorOptions} generatorOptions
 */
const generateInclude = (generateOptions, generatorOptions = {}) => {
  const includeKey = `greet`; // you can customise include key
  const generatedLevel = generatorOptions.levelOverride != null ? generatorOptions.levelOverride : ((generatorOptions.baseLevel || 0) + level - 2); // the -2, -1 of it is because because the snippet generator is in a directory which adds an extra level not there in the generated files, the other -1 is due to includes generators are under directory "includes" adding yet another extra level
  const generatedPathToRoot = generatedLevel === 0 ? './' : repeat('../', generatedLevel);

  const codeLines = [
    `const { greet } = require( './greet' );`
  ];
  return { [includeKey]: codeLines }; // you can return multiple includes
};
exports.generateInclude = generateInclude;