#!/usr/bin/env node

const { cmdOptions, getAndRemoveOption } = require('../utils');
const { generateProject } = require('../tasks-files');
const path = require('path');
const fs = require( 'fs-extra' );
const path = require( 'path' );

const outputPath = cmdOptions._[0] || getAndRemoveOption(cmdOptions, 'name', 'folder', 'directory', 'path') || '.';

console.log('generateProject', generateProject);

generateProject({ ...cmdOptions, generatorPath: path.join(__dirname, '../projects/template-generators/empty-templator-generator-template'), outputPath })
.then(() => {
  console.log(`"templator-generator" project successfully created in "${outputPath}" next:`)
  console.log(`  - run \`cd ${JSON.stringify(outputPath)}\``)
  console.log(`  - run \`npm install\``)
  console.log(`  - \`template-project --i <path>\` where <path> is the path to the project you want to create a generator for`)
  console.log(`  - go to "./projects/template-generators/<proj_name>"`)
  console.log(`  - parametrise the generator so it becomes configurable and smart like you`)
  console.log(`  - run \`generate-project --g <gen_name> --<option> <option_value>\` where <gen_name> is same as <proj_name> above, and <option}(s) depends on your parametrisation`)
  console.log(`  - you can also pipe in the options as json string in to the command like \`cat ./generate-options.json | generate-project --g <gen_name>\``)
  console.log(`  - or \`generate-project --g <gen_name> --optionsFile ./generate-options.json\``)
  console.log(`  - the generated project will be put by default in ./projects/generated-templates/<proj_name>`)
  console.log(`  - to customise output location use --o option as \`generate-project --g <gen_name> --o <output_folder_path> --<option> <option_value>\``)
})
.finally(() => {
  const package = fs.readJSONSync(path.join(__dirname, '..', 'package.json'));
  console.log(package);
  console.log(package.version);
});
