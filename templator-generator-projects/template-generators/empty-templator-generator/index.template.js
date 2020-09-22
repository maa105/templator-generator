const generatorPath = './index.template.js';
const generator = require('./generator');
/**
 * @param {Object} generateOptions object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('./generator.js').FileGeneratorOptions} generatorOptions
 */
const generateFilesEntries = (generateOptions, generatorOptions = {}) => {
  const fileName = `index.js`; // you can customise the output file name or path(put '../some_path/filename' or 'some_path/filename' or './some_path/filename' or even absolute path [using '/some_path/filename' or '~/some_path/filename'])
  const filePath = `/index.js`;

  const codeLines = [
    `throw new Error('This project is only for running template-project/generate-project command from the dependency "templator-generator"');`
  ];
  return generatorOptions.addFilePath ? { [fileName]: codeLines } : codeLines; // you can return multiple files or an entire folder structure if you'd like, you can also use absolute paths by starting the key with slash(/) or tilda backslash(~/)
};
exports.generateFilesEntries = generateFilesEntries;

/**
 * @param {string} outputPath path to put the generated output in
 * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('./generator.js').FileGeneratorOptions} generatorOptions generator options
 */
const generate = async (outputPath, generateOptions, generatorOptions = {}) => {
  const filesEntries = await generateFilesEntries(generateOptions, { ...generatorOptions, addFilePath: true });
  return generator.writeFilesEntries(outputPath, filesEntries, generatorOptions, generatorPath);
};
exports.generate = generate;