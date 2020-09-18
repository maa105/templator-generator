const directoryName = '';
const directoryPath = './';
const generatorPath = './index.js';
const generator = require('./generator');
const generators = [
  './index.template.js',
  './package.json.template.js'
];
exports.getGenerators = () => [...generators];
/**
 * @param {Object} generateOptions object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('./generator.js').DirectoryGeneratorOptions} generatorOptions
 */
const generateFilesEntries = async (generateOptions, generatorOptions = generator.defaultGeneratorOptions) => {
  generatorOptions = { ...generator.defaultGeneratorOptions, ...generatorOptions };
  const gens = (
    generatorOptions.generateRootFiles ? (
      generatorOptions.generateSubDirectories ?
        generators
      : generators.slice(0, 2)
    )
    : (
      generatorOptions.generateSubDirectories ?
        generators.slice(2)
      : null
    )
  );
  if(gens == null) {
    throw new Error('"generateSubDirectories" and "generateRootFiles" both false in generatorOptions!');
  }
  const children = await generator.generateFilesEntries(gens, generateOptions, generatorOptions);
  return (generatorOptions.addDirectoryPath && directoryName) ? { [directoryName]: children } : children;
};
exports.generateFilesEntries = generateFilesEntries;

/**
 * @param {string} outputPath path to put the generated output in
 * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('./generator.js').DirectoryGeneratorOptions} generatorOptions generator options
 */
const generate = async (outputPath, generateOptions, generatorOptions) => {
  const filesEntries = await generateFilesEntries(generateOptions, generatorOptions);
  return generator.writeFilesEntries(outputPath, filesEntries, generatorPath);
};
exports.generate = generate;