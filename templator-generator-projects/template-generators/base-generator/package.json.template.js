const filePath = './package.json';
const generatorPath = './package.json.template.js';
const generator = require('./generator');
/**
 * @param {Object} generateOptions object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('./generator.js').FileGeneratorOptions} generatorOptions
 */
const generateFilesEntries = ({ projectName = 'project1', author = 'maa105' }, generatorOptions = {}) => {
  const fileName = `package.json`; // you can customise the output file name or path(put ../filename or some_path/filename)

  const codeLines = [
    `{`,
    `  "name": "${projectName}-generator",`,
    `  "version": "1.0.0",`,
    `  "description": "Project to generate ${projectName} project",`,
    `  "main": "index.js",`,
    `  "scripts": {`,
    `    "generate": "node ./.bin/generate.js"`,
    `  },`,
    `  "author": "${author}",`,
    `  "license": "MIT",`,
    `  "dependencies": {`,
    `    "fs-extra": "^9.0.1",`,
    `    "lodash": "^4.17.20",`,
    `    "minimist": "^1.2.5"`,
    `  },`,
    `  "bin": {`,
    `    "generate-${projectName}": "./.bin/generate.js"`,
    `  }`,
    `}`,
    ``
  ];
  return generatorOptions.addFilePath ? { [fileName]: codeLines } : codeLines; // you can return multiple files or an entire folder structure if you'd like
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