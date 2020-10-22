const { repeat } = require('lodash');
const baseGenerator = require('./generator.js');
const utils = require('./utils.js');

const level = 0;
const pathToRoot = './';
const generatorPath = '/greet.template.js';

/**
 * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('./generator.js').FileGeneratorOptions} generatorOptions
 */
const generateFilesEntries = (generateOptions, generatorOptions = {}) => {
  const fileName = `greet.js`; // you can customise the output file name or path(put '../some_path/filename' or 'some_path/filename' or './some_path/filename' or even absolute path [using '/some_path/filename' or '~/some_path/filename'])
  const filePath = `/greet.js`;
  const generatedLevel = generatorOptions.levelOverride != null ? generatorOptions.levelOverride : ((generatorOptions.baseLevel || 0) + level);
  const generatedPathToRoot = generatedLevel === 0 ? './' : repeat('../', generatedLevel);

  const codeLines = [ // you can use "generatedPathToRoot" here to generate code that is location dependent e.g. `require(generatedPathToRoot + 'utils.js')`
    `exports.greet = (greeting = 'Hello', entity = 'world') => console.log(\`\${greeting}, \${entity}\`);`
  ];

  const extraGreetingSortOrder = null; // 0 -> first, -1 -> last, null/undefined -> depending on the order it is called
  const extraGreeting = { 'index.js': new utils.Snippet({ key: 'greeting-humans', codeLines: [`greet('Greetings', 'humans'); // this line was written by a snippet from \`greet.template.js\` ;)`], sortOrder: extraGreetingSortOrder, includes: ['greet'] }) };
  return generatorOptions.addFilePath ? { [fileName]: codeLines, ...extraGreeting } : codeLines; // you can return multiple files or an entire folder structure if you'd like, you can also use absolute paths by starting the key with slash(/) or tilda backslash(~/)
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