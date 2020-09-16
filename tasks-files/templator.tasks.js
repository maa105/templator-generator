const fs = require('fs-extra');
const path = require('path');
const { map, filter, camelCase } = require('lodash');
const { isBinaryFileSync } = require('isbinaryfile');
const { cmdOptions, backTickStringify, capitalizeFirstLetter, getDirectoriesNames, getFilesNames, getAndRemoveOption, singleQuoteStringify } = require( '../utils' );
const { generateProject } = require( './generator.tasks' );

const codifyFile = ({
  relativePath,
  inputFilePath,
  outputFilePath,
  functionName,
  binaryFilesRelativePath,
  binaryFilesAbsolutePath,
  fileIndex
}) => {

  if(isBinaryFileSync(inputFilePath)) {
    // binary files
    if(binaryFilesAbsolutePath) {
      fs.ensureDirSync(binaryFilesAbsolutePath);
      fs.copyFileSync(inputFilePath, path.join(binaryFilesAbsolutePath, fileIndex.toString()));
      fs.writeFileSync(outputFilePath, [
        `const filePath = './${singleQuoteStringify(path.join(relativePath, path.basename(inputFilePath)).replace(/\\/gmi, '/'), false)}';`,
        `const ${functionName} = (/*{ options to customise code generation }*/) => {`,
        `  const srcBinaryPath = './${singleQuoteStringify(path.join(binaryFilesRelativePath, fileIndex.toString()).replace(/\\/gmi, '/'), false)}';`,
        `  return {`,
        `    [filePath]: srcBinaryPath`,
        `  };`,
        `};`,
        `exports.${functionName} = ${functionName};`,
        `exports.generate = ${functionName};`
      ].join('\r\n'), { encoding: 'utf8' });
      return true;
    }
    else {
      console.warn(`No binaryFilesPath provided to put binary files in. skipping ${inputFilePath}. This means no generator for it will be generated.`);
      return false;
    }
  }

  // code files
  const fileContent = fs.readFileSync(inputFilePath, { encoding: 'utf8' }).replace(/\r\n/gmi, '\n').replace(/\r/gmi, '\n').replace(/\n/gmi, '\r\n');
  const lines = fileContent.split('\r\n');

  fs.writeFileSync(outputFilePath, [
    `const filePath = './${singleQuoteStringify(path.join(relativePath, path.basename(inputFilePath)).replace(/\\/gmi, '/'), false)}';`,
    `const ${functionName} = (/*{ options to customise code generation }*/) => {`,
    `  const codeLines = [`,
    ...map(lines, (line, i, arr) => (
      `    ${backTickStringify(line)}${i !== arr.length - 1 ? ',' : ''}`
    )),
    `  ];`,
    `  return {`,
    `    [filePath]: codeLines`,
    `  };`,
    `};`,
    `exports.${functionName} = ${functionName};`,
    `exports.generate = ${functionName};`
  ].join('\r\n'), { encoding: 'utf8' });
  return true;
};

const templateProject = ({
  inputPath,
  outputPath,
  level = 0,
  dirFilterFunc = (dirPath, level) => {
    const name = path.basename(dirPath);
    return level !== 0 || (name !== 'node_modules' && name !== 'build' && name !== 'builds');
  },
  fileFilterFunc = (filePath, level) => {
    return true;
  },
  relativePath = './',
  outGeneratorsPaths = [],
  binaryFilesAbsolutePath,
  binaryFilesRelativePath,
  fileIndex = 0
}) => {
  binaryFilesRelativePath = binaryFilesRelativePath || './binary-files';
  
  inputPath = path.resolve(inputPath);
  outputPath = path.resolve(outputPath);

  binaryFilesAbsolutePath = binaryFilesAbsolutePath || path.join(outputPath, './binary-files');

  const convertInToOut = (inPath) => path.resolve(path.join(outputPath, path.resolve(inPath).substr(inputPath.length)));
  const getFuncName = (inputFilePath) => 'generate' + capitalizeFirstLetter(camelCase(path.parse(inputFilePath).name)) + '_' + path.parse(inputFilePath).ext.substr(1);

  fs.ensureDirSync(outputPath);
  
  const dirs = map(
    filter(
      getDirectoriesNames(inputPath),
      (name) => dirFilterFunc(path.join(inputPath, name), level)
    ),
    (name) => path.join(inputPath, name)
  );

  const filesPaths = map(
    filter(
      getFilesNames(inputPath),
      (name) => fileFilterFunc(path.join(inputPath, name), level)
    ),
    (name) => path.join(inputPath, name)
  );
  
  for(let i = 0; i < filesPaths.length; i++) {
    const filePath = filesPaths[i];
    const outFile = path.parse(convertInToOut(filePath));
    const outFileName = outFile.name + (outFile.ext === '.js' ? '' : outFile.ext) + '.template.js';
    const outFilePath = path.join(outFile.dir, outFileName);
    
    if(codifyFile({
      relativePath,
      inputFilePath: filePath,
      outputFilePath: outFilePath,
      functionName: getFuncName(filePath),
      binaryFilesAbsolutePath,
      binaryFilesRelativePath,
      fileIndex: ++fileIndex
    })) {
      outGeneratorsPaths.push(path.join(relativePath, outFileName));
    }
  }

  for(let i = 0; i < dirs.length; i++) {
    fileIndex = templateProject({
      inputPath: dirs[i],
      outputPath: convertInToOut(dirs[i]),
      level: level + 1,
      dirFilterFunc,
      fileFilterFunc,
      relativePath: path.join(relativePath, path.parse(dirs[i]).name),
      outGeneratorsPaths,
      binaryFilesAbsolutePath,
      binaryFilesRelativePath,
      fileIndex
    });
  }

  if(level === 0) {
    return {
      generatorsPaths: outGeneratorsPaths
    };
  }
  return fileIndex;
};
exports.templateProject = async () => {
  const help = getAndRemoveOption(cmdOptions, 'h', 'help');
  if(help) {
    console.log(`This command generates a project generator for a given project. i.e. it creates a project with a generate command that generates a replica of the project specified. The generator that is generated at face value seems pointless. But the idea is the user will update the generator project and add options to it so as to make the generator configurable/smarter. The code for the generator is very simple and relies mostly on the backtick (\`) strings making it very easy to customise using \${} templates.`);
    console.log(`P.S. templateProject stands for generate a project generator from project XYZ. So like make project XYZ a template. Thats the best name I could come up with as generateGenerator sound aweful :|`);
    console.log(`This command takes the following arguments:`);
    console.log(` --i <path_to_project_to_template>. Where <path_to_project_to_template> is the absolute or relative path to the project you want to generate a generator for. Aliases(1): --in --input --folder --dir --directory --inFolderPath --inputFolderPath --folderPath --inDirectoryPath --inputDirectoryPath --directoryPath --inDirPath --inputDirPath --dirPath --p --proj --project --projPath --projectPath`);
    console.log(` [--o <output_path>]. Where <output_path> is the path you want to put the generated project generator in. Default "./templator-generator-projects/template-generators/<name_of_input_folder>. Aliases(1): --out --output --outFolderPath --outputFolderPath --outDirectoryPath --outputDirectoryPath --outDirPath --outputDirPath`);
    console.log(``);
    console.log(`(1) Aliases also work if you use them in kebab-case instead of camelCase.`);
    return;
  }

  const input = getAndRemoveOption(cmdOptions, 'i', 'in', 'input', 'folder', 'dir', 'directory', 'inFolderPath', 'inputFolderPath', 'folderPath', 'inDirectoryPath', 'inputDirectoryPath', 'directoryPath', 'inDirPath', 'inputDirPath', 'dirPath', 'p', 'proj', 'project', 'projPath', 'projectPath');
  if(!input) {
    throw new Error('Input project path argument is required. Specify it using --i <path_to_project_to_template>. Where <path_to_project_to_template> is the absolute or relative path to the project you want to generate a generator for. (for more info add --h or --help to the command');
  }

  let inputPath;
  if(path.isAbsolute(input)) {
    if(!fs.existsSync(input)) {
      throw new Error(`Could not find input project at "${input}". Folder does not exist!`);
    }
    inputPath = input;
  }
  else {
    const possiblePaths = [
      path.resolve(input),
      path.resolve(path.join('./templator-generator-projects/base-templates', input)),
      path.resolve(path.join('./base-templates', input)),
      path.resolve(path.join(__dirname, '../templator-generator-projects/base-templates', input)),
      path.resolve(path.join(__dirname, '..', input))
    ];
    for(let i = 0; i < possiblePaths.length; i++) {
      if(fs.existsSync(possiblePaths[i])) {
        inputPath = possiblePaths[i];
        break;
      }
    }
    if(!inputPath) {
      throw new Error(`Could not resolve input project "${input}". tried "${possiblePaths.join('", "')}" none exist!`);
    }
    console.log(`Using input project "${inputPath}"`);
  }

  const outputPath = path.resolve(getAndRemoveOption(cmdOptions, 'o', 'out', 'output', 'outputPath', 'outFolderPath', 'outputFolderPath', 'outDirectoryPath', 'outputDirectoryPath', 'outputDir', 'outDirPath', 'outputDirPath') || path.join('./templator-generator-projects/template-generators', path.basename(inputPath)));

  const { generatorsPaths } = templateProject({
    inputPath,
    outputPath
  });

  await generateProject({ projectName: path.basename(inputPath), ...cmdOptions, generatorPath: path.join(__dirname, '../templator-generator-projects/template-generators/base-generator'), outputPath, generatorsPaths });

  console.log(`Generator for "${inputPath}" successfully written to "${outputPath}."`);
  console.log(`Note this is just a dummy generator. The idea is you go to ${outputPath} and customise/parametrise your generator so it becomes dynamic/generic/configurable or smart like you!"`);
  console.log(`To run the generator either`);
  console.log(`(1)`);
  console.log(`  a- run \`generate-project --g ${JSON.stringify(outputPath)} [--o <where_to_write_the_output_generated_project>] [--optionsFile <path_to_a_json_options_file_for_your_smartly_configured_generator>] [--<other_inline_option(s)_for_your_smartly_configured_generator_key> <other_inline_option(s)_for_your_smartly_configured_generator_value>]\``);
  console.log(`(2)`);
  console.log(`  a- run \`cd ${JSON.stringify(outputPath)}`);
  console.log(`  b- run \`npm generate -- --g ${JSON.stringify(outputPath)} [--o <where_to_write_the_output_generated_project>] [--optionsFile <path_to_a_json_options_file_for_your_smartly_configured_generator>] [--<other_inline_option(s)_for_your_smartly_configured_generator_key> <other_inline_option(s)_for_your_smartly_configured_generator_value>]\``);
};

