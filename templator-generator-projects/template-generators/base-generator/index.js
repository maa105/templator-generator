const generatorPath = './index.js';
const generator = require('./generator');
const generators = [
  './generator.template.js',
  './package.json.template.js',
  './utils.template.js',
  './.bin'
];
exports.getGenerators = () => [...generators];
/**
 * @param {Object} generateOptions object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('./generator.js').DirectoryGeneratorOptions} generatorOptions
 */
const generateFilesEntries = async (generateOptions, generatorOptions = generator.defaultGeneratorOptions) => {
  const directoryName = ``; // you can customise the output directory name or path(put '../some_path/dir_name' or 'some_path/dir_name' or even absolute path [using '/some_path/dir_name' or '~/some_path/dir_name'])
  const directoryPath = `/`;

  generatorOptions = { ...generator.defaultGeneratorOptions, ...generatorOptions };
  const gens = (
    generatorOptions.generateRootFiles ? (
      generatorOptions.generateSubDirectories ?
        generators
        : generators.slice(0, 3)
    ) : (
      generatorOptions.generateSubDirectories ?
        generators.slice(3)
        : null
    )
  );
  if(gens == null) {
    throw new Error('"generateSubDirectories" and "generateRootFiles" both false in generatorOptions!');
  }
  const children = await generator.generateFilesEntries(gens, generateOptions, generatorOptions);
  return (generatorOptions.addDirectoryPath && directoryName) ? { [directoryName]: children } : children; // you can return multiple files and directories or whatever your heart desires, you can also use absolute paths by starting the key with slash(/) or tilda backslash(~/)
};
exports.generateFilesEntries = generateFilesEntries;

/**
 * @param {string} outputPath path to put the generated output in
 * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('./generator.js').DirectoryGeneratorOptions} generatorOptions generator options
 */
const generate = async (outputPath, generateOptions, generatorOptions) => {
  const filesEntries = await generateFilesEntries(generateOptions, generatorOptions);
  return generator.writeFilesEntries(outputPath, filesEntries, generatorOptions, generatorPath);
};
exports.generate = generate;