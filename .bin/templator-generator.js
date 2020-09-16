#!/usr/bin/env node

const { cmdOptions, getAndRemoveOption, execCmd } = require('../utils');
const { generateProject } = require('../tasks-files');
const path = require('path');
const fs = require( 'fs-extra' );

const outputPath = cmdOptions._[0] || getAndRemoveOption(cmdOptions, 'name', 'folder', 'directory', 'path') || '.';

generateProject({ ...cmdOptions, generatorPath: path.join(__dirname, '../templator-generator-projects/template-generators/empty-templator-generator-template'), outputPath, version: fs.readJSONSync(path.join(__dirname, '..', 'package.json')).version })
.then(() => {
  const cwd = process.cwd();
  process.chdir(path.resolve(outputPath));
  return execCmd('npm', ['i']).then(() => true).catch(() => false).finally(() => process.chdir(cwd));
})
.then((installedDependencies) => {
  console.log(`"templator-generator" project successfully created in "${outputPath}" next:`)
  console.log(`  - Run \`cd ${JSON.stringify(outputPath)}\``)
  if(!installedDependencies) {
    console.log(`  - Run \`npm install\``)
  }
  console.log(`  - \`npm run-script template-project -- --i <path>\` where <path> is the path to the project you want to create a generator for`)
  console.log(`  - By default the generator is put in "./templator-generator-projects/template-generators/<proj_name>" (use [--o <output_path>] to change it)`)
  console.log(`  - Go to "./templator-generator-projects/template-generators/<proj_name>"`)
  console.log(`  - Parametrise the generator so it becomes configurable and smart like you`)
  console.log(`  - Run \`npm run-script generate-project -- --g <gen_name> --<option> <option_value>\` where <gen_name> is same as <proj_name> above, and <option>(s) depends on your parametrisation`)
  console.log(`  - You can also pipe in the options as json string in to the command like \`cat ./generate-options.json | npm run-script generate-project -- --g <gen_name>\``)
  console.log(`  - Or \`npm run-script generate-project -- --g <gen_name> --optionsFile ./generate-options.json\``)
  console.log(`  - The generated project will be put by default in ./templator-generator-projects/generated-templates/<proj_name>`)
  console.log(`  - To customise output location use --o option as \`npm run-script generate-project -- --g <gen_name> --o <output_folder_path> --<option> <option_value>\``)
  console.log(`  - To get rid of the npm run-script and th '--' empty option you can run \`npm run-script link\``)
  console.log(`    But BE AWARE the commands will be available globally e.g. \`template-project --i <path>\` or \`generate-project --g <gen_name> --<option> <option_value>\``)
  console.log(`    Which I think is cleaner. To remove the link run \`npm run-script unlink\``)
});
