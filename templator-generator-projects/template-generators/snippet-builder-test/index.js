const path = require('path');
const fs = require('fs-extra');
const { repeat, filter, endsWith, map } = require('lodash');
const baseGenerator = require('./generator.js');
const { getFilesPaths, getDirectoriesPaths, getRootRelativePath } = require('./utils.js');

const level = 0;
const pathToRoot = './';
const generatorPath = './index.js';

const getFilesGenerators = () => map(filter(getFilesPaths(__dirname), (path) => endsWith(path, '.template.js')), (path) => getRootRelativePath(path));
const getDirectoriesGenerators = () => map(filter(getDirectoriesPaths(__dirname), (dirPath) => fs.existsSync(path.join(dirPath, 'index.js'))), (dirPath) => getRootRelativePath(path.join(dirPath, 'index.js')));

/**
 * @param {Object} generateOptions user parameters/options for the generation process. It is an object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('./generator.js').FileGeneratorOptions} generatorOptions
 */
const generateFilesEntries = async (generateOptions, generatorOptions = baseGenerator.defaultGeneratorOptions) => {
  const directoryName = ``; // you can customise the output directory name or path(put '../some_path/dir_name' or 'some_path/dir_name' or even absolute path [using '/some_path/dir_name' or '~/some_path/dir_name'])
  const directoryPath = `/`;
  const generatedLevel = generatorOptions.levelOverride != null ? generatorOptions.levelOverride : ((generatorOptions.baseLevel || 0) + level);
  const generatedPathToRoot = generatedLevel === 0 ? './' : repeat('../', generatedLevel);

  generatorOptions = { ...baseGenerator.defaultGeneratorOptions, ...generatorOptions };
  const gens = (
    generatorOptions.generateRootFiles ? (
      generatorOptions.generateSubDirectories ?
        [...getFilesGenerators(), ...getDirectoriesGenerators()]
        : getFilesGenerators()
    ) : (
      generatorOptions.generateSubDirectories ?
        getDirectoriesGenerators()
        : null
    )
  );
  if(gens == null) {
    throw new Error('"generateSubDirectories" and "generateRootFiles" both false in generatorOptions!');
  }
  const children = await baseGenerator.generateFilesEntries(gens, generateOptions, generatorOptions);
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
  return baseGenerator.writeFilesEntries(outputPath, filesEntries, generatorOptions, generatorPath);
};
exports.generate = generate;