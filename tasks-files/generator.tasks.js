const fs = require('fs-extra');
const path = require('path');
const { cmdOptions, execCmd, getAndRemoveOption } = require( '../utils' );

const generateProject = async ({ generatorPath, outputPath, ...generateOptions }) => {

  generatorPath = path.resolve(generatorPath);
  outputPath = path.resolve(outputPath);

  const cwd = process.cwd();

  try {
    process.chdir(generatorPath);
    if(!fs.existsSync(path.join(generatorPath, './node_modules'))) {
      console.warn(`Generator at "${generatorPath}" does not have dependencies installed. Will run "npm install" in ${generatorPath}.`);
      await execCmd('npm', ['install']);
    }
    const promise = execCmd('npm', ['run-script', 'generate', '--', '--o', outputPath], { stdio: ['pipe', 'inherit', 'inherit'] });
    const child = promise.childProcess;
    child.stdin.setDefaultEncoding('utf-8');
    child.stdin.write(JSON.stringify(generateOptions));
    child.stdin.end();
    await promise;
  }
  catch(err) {
    throw err;
  }
  finally {
    process.chdir(cwd);
  }
};
const generateProjectFromCommandLineArguments = async () => {
  const help = getAndRemoveOption(cmdOptions, 'h', 'help');
  if(help) {
    console.log(`This command generates a project with from a given project generator. What it does is just call the generate command for that project generator. It is useful cause if you have multiple project template generators, this command is like a central command to generate any of then instead of going to each one individually and running its generate command.`);
    console.log(`This command takes the following arguments:`);
    console.log(` --g <project_generator>. Where <project_generator> is the absolute or relative path to the project generator you want to run (1). Aliases(2): --gen --genPath --generator --generatorPath --p --proj --project --projPath --projectPath`);
    console.log(`     generator can be the first positional argument too \`generate-project <project_generator>\``);
    console.log(` [--o <output_path>]. Where <output_path> is the path you want to put the generated project in. Default "./templator-generator-projects/generated-templates/<name_of_generator_folder>. Aliases(2): --out --output --outputPath --outputDirPath --outputDir`);
    console.log(`     output_path can be the first positional argument too \`generate-project --g <project_generator> <output_path>\``);
    console.log(`     output_path can be the second positional argument too \`generate-project <project_generator> <output_path>\``);
    console.log(` [--optionsFile <json_generator_options_file_path>]. Where <json_generator_options_file_path> is the path you want to send to the project generator to configure the generation process. Aliases(2): --jsonFile --optionsJsonFile --optionsJSONFile --generateOptionsFile --generateOptionsJsonFile' --generateOptionsJSONFile"`);
    console.log(` [--<option_key_to_send_to_generator> <option_value_to_send_to_generator>]. These have higher priority from those in the json file. e.g. --writeEmptyFiles (Aliases: --WriteEmptyFiles --_WriteEmptyFiles), --lineSeperator (Aliases: --LineSeperator, --_LineSeperator)`);
    console.log(` This command also accepts piped input as json strings for options that will be sent to the generator. The piped json options have less priority that the options json file.`);
    console.log(``);
    console.log(`(1) if path is relative it will try to match relative to project running the command or folder this command is executed from. It will also try ./templator-generator-projects/template-generators relative to project running the command or folder this command is executed from`);
    console.log(`(2) Aliases also work if you use them in kebab-case instead of camelCase.`);
    return;
  }
  const generator = getAndRemoveOption(cmdOptions, 0, 'g', 'gen', 'genPath', 'generator', 'generatorPath', 'p', 'proj', 'project', 'projPath', 'projectPath');
  if(!generator) {
    throw new Error('Project name argument is required. Specify it using --g <project_generator>. Where <project_generator> is the generator project directory that you wish to run to generate your project. (for more info add --h or --help to the command');
  }
  let generatorPath;
  if(path.isAbsolute(generator)) {
    if(!fs.existsSync(generator)) {
      throw new Error(`Could not find generator at "${generator}". Folder does not exist!`);
    }
    generatorPath = generator;
  }
  else {
    const possiblePaths = [
      path.resolve(generator),
      path.resolve(path.join('./templator-generator-projects/template-generators', generator)),
      path.resolve(path.join('./template-generators', generator)),
      path.resolve(path.join('./templator-generator-projects/generators', generator)),
      path.resolve(path.join('./generators', generator)),
      path.resolve(path.join(__dirname, '../templator-generator-projects/template-generators', generator)),
      path.resolve(path.join(__dirname, '..', generator))
    ];
    for(let i = 0; i < possiblePaths.length; i++) {
      if(fs.existsSync(possiblePaths[i])) {
        generatorPath = possiblePaths[i];
        break;
      }
    }
    if(!generatorPath) {
      throw new Error(`Could not resolve generator "${generator}". tried "${possiblePaths.join('", "')}" none exist!`);
    }
    console.log(`Using generator at "${generatorPath}".`)
  }

  const outputPath = path.resolve(getAndRemoveOption(cmdOptions, 0, 'o', 'out', 'output', 'outputPath', 'outFolderPath', 'outputFolderPath', 'outDirectoryPath', 'outputDirectoryPath', 'outputDir', 'outDirPath', 'outputDirPath') || path.join('./templator-generator-projects/generated-templates', path.basename(generator)));

  let generateOptionsFromStdin;
  if(process.stdin && !process.stdin.readableEnded && !process.stdin.isTTY) {
    const jsonStr = await new Promise((resolve, reject) => {
      process.stdin.setEncoding('utf-8');
      const chunks = [];
      process.stdin.on('data', (chunk) => {
        chunks.push(chunk);
      });
      process.stdin.on('error', (err) => {
        reject(err);
      });
      process.stdin.on('end', () => {
        resolve(chunks.join(''));
      });
    });
    try {
      generateOptionsFromStdin = JSON.parse(jsonStr);
    }
    catch(err) {
      throw new Error(`Could not parse json options from stdin pipe. It does not look that it is the correct format.`);
    }
  }

  const jsonFilePath = getAndRemoveOption(cmdOptions, 'jsonFile', 'optionsFile', 'optionsJsonFile', 'optionsJSONFile', 'generateOptionsFile', 'generateOptionsJsonFile', 'generateOptionsJSONFile');
  let generateOptionsFromFile;
  if(jsonFilePath) {
    if(!fs.existsSync(jsonFilePath)) {
      throw new Error(`Could not find json options file "${jsonFilePath}" which resolves to ${path.resolve(jsonFilePath)}`);
    }
    try {
      generateOptionsFromFile = JSON.parse(fs.readFileSync(jsonFilePath, { encoding: 'utf8' }));
    }
    catch(err) {
      throw new Error(`Could not parse json options file "${jsonFilePath}" which resolves to ${path.resolve(jsonFilePath)}. It does not look that it is the correct format.`);
    }
  }

  return generateProject({ ...generateOptionsFromStdin, ...generateOptionsFromFile, ...cmdOptions, generatorPath, outputPath });
};

exports.generateProject = (options) => {
  if(options) {
    return generateProject(options);
  }
  return generateProjectFromCommandLineArguments();
};
