const fileName = 'index.js';
const filePath = './index.js';
const generatorPath = './index.template.js';
const generator = require('./generator');
/**
 * @param {Object} generateOptions object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('./generator.js').FileGeneratorOptions} generatorOptions
 */
const generateFilesEntries = (generateOptions, generatorOptions = {}) => {
  const codeLines = [
    `throw new Error('This project is only for running template-project/generate-project command from the dependency "templator-generator"');`
  ];
  return generatorOptions.addFilePath ? { [fileName]: codeLines } : codeLines;
};
exports.generateFilesEntries = generateFilesEntries;

/**
 * @param {string} outputPath path to put the generated output in
 * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('./generator.js').FileGeneratorOptions} generatorOptions generator options
 */
const generate = async (outputPath, generateOptions, generatorOptions = {}) => {
  const filesEntries = await generateFilesEntries(generateOptions, { ...generatorOptions, addFilePath: true });
  return generator.writeFilesEntries(outputPath, filesEntries, generatorPath);
};
exports.generate = generate;