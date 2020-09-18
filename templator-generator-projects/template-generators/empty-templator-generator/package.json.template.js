const fileName = 'package.json';
const filePath = './package.json';
const generatorPath = './package.json.template.js';
const generator = require('./generator');
/**
 * @param {Object} generateOptions object sent to all generators to configure the generation process (your job is to add props to it to configure the generator)
 * @param {import('./generator.js').FileGeneratorOptions} generatorOptions
 */
const generateFilesEntries = ({ version = '0.0.1', author = 'maa105' }, generatorOptions = {}) => {
  const codeLines = [
    `{`,
    `  "name": "templator-generator-empty-project",`,
    `  "version": "1.0.0",`,
    `  "description": "Project used to generate template generator, hopefully parametrising/smartifying them, and generating dynamic projects from those parametrised template generators",`,
    `  "main": "index.js",`,
    `  "scripts": {`,
    `    "generate": "generate",`,
    `    "generate-project": "generate-project",`,
    `    "generateProject": "generate-project",`,
    `    "template": "template-project",`,
    `    "template-project": "template-project",`,
    `    "templateProject": "template-project",`,
    `    "templator-generator": "templator-generator",`,
    `    "templatorGenerator": "templator-generator",`,
    `    "link": "npm link templator-generator",`,
    `    "unlink": "npm unlink templator-generator"`,
    `  },`,
    `  "author": "${author}",`,
    `  "license": "MIT",`,
    `  "dependencies": {`,
    `    "templator-generator": "^${version}"`,
    `  }`,
    `}`,
    ``
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
  return generator.writeFilesEntries(outputPath, filesEntries, generatorOptions, generatorPath);
};
exports.generate = generate;