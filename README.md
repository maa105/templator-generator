This projects helps developers creates smart/paramertizable/configurable/dynamic templates for their projects. It generates a basic template generator from a project. Then a smart developer should edit the template to make it smart/paramertizable/configurable/dynamic. After that he can then generate a project from the generator and passing options to the generator to customise the generation process.

The generators are very modular. That is there is a `file-generator` called `<file>.template.js` generated for each file (used generate that file), and a `directory-generator` file named `index.js` inside each directory (including the root directory) used to generate that directory. The user can make use of these sub generators if he so wishes (maybe to hand craft a certain folder structure).

The `file-generators` and `directory-generators` are themselves very dynamic. Giving the developer possibility of customizing the output file/directory name/path or generating multiple files/directories even entire folder structure from any of these sub generators. (more on this below).

# Keywords/Legend

- `file-generator` a file that genrates a specific file. The templator creates one `file-generator` file for each file of the input project. The `file-generator` is located in the same path as the file it should generate and its name is `<original_file_name>.template.js` (i.e. suffixed by `.template.js`) 
- `directory-generator` a file that genrates a specific directory and its contents (files and sub-directories). The templator creates one `directory-generator` file for each directory of the input project (including the root directory). The `directory-generator` is located directly under the directory it should generate and its name is `index.js`
- `entry-generators` either a `file-generator` or a `directory-generator`
- `filesEntries` a JSON object representing a folder structure. The keys of this JSON object represent the file/directory name, and the values are either other `filesEntries` object incase of a directory, or an array of strings (possibly many levels deep [[string],[string],[[[string]]]), or a string pointing to a binary file that represents the file to be inserted at this location.
- `codeLines` an array that represents the lines of a code (or text in general) file. (it can be multiple levels deep but leaf nodes should always be strings)
  e.g: NOTE: below the `index.js` is under the `src` folder, whereas the `package.json` is at the root
```json
{
  `package.json`: [
    `{`,
    `  "name": "hello-world",`,
    `  "version": "1.0.0",`,
    `  "author": "maa105",`,
    `  "scripts": {`,
    `    "start": "node src/index.js",`,
    `   }`,
    `}`
  ],
  `src`: {
    `index.js`: [
      `console.log('Hello, world');`
    ]
  }
}
```
- `snippet` The `templator-generator` project as of version 5 contains a snippeting system. a `snippet` is a part of a file. One can build through adding multiple `snippets` together. .
- `includes` Usually code have dependencies. And code in `snippets` belonging to the same file may have same dependencies. Inorder not to duplicate the dependency in all the `snippets`, the concept of `includes` is developed. An `include` in shared code between multiple `snippets` belonging to one file.
- `snippetCompiler` is used to build a file out of `snippets` you can add `snippets` and `includes` to it. its constructor takes in an object of keyedIncludes, these are the list of `includes` the `snippets` added to this `snippetCompiler` can include.

# Instalation 
```
  npm install -g templator-generator
```

# CLI Commands

### `template-project <input_project_path> [<output_generator_path>] [--ignore <gitignore_style_file_path>]`

Creates a generator project for folder <input_project_path>.

You can specify an output path for the generator in <output_generator_path> but by default it will put the generator in `./templator-generator-projects/template-generators/<project_name>` (<project_name> is the last path segment in <input_project_path>).

Personally I do not to specify an output path, this way I can use the `generate-project <project_name>` <project_name> being just the name of the generator no need to specify path.

To specify an ignore file (.gitignore style) add --ignore <gitignore_style_file_path>. Defaults to .gitignore inside input project, then ./templator.ignore then templator.ignore in input project finally if none are found it will ignore all nod_modules. Currently there is one preset for react use it as follows: \`--ignore react\`

To add more presets add your preset to `./ignores/<your_preset_name>.ignore` and issue a pull request.

You can also specify the input `--i <input_project_path>` and the output `--o <output_generator_path>`.

For more info on this command and aliases you can use run `template-project --h`

### `generate-project <generator_path> [<output_path>] [--jsonOptionsPath <json_options_file_path>] [--<option_key> <option_value>]`

Runs generator at <generator_path> which will generate a project and put this output project in <output_path>.

As mentioned above in `template-project` documentation the idea of templating a project is you make it paramertizable/configurable. You can pass your paramertization/configuration options to the generator through this command in multiple ways:

1- Through a JSON file using the `--jsonOptionsPath <json_options_file_path>` option

2- Through piping in to this command a valid JSON string representing the paramertization/configuration options

3- Through normal cli options `--<option_key> <option_value>`

You can specify an output path for the generator in <output_generator_path> but by default it will put the generator in `./templator-generator-projects/template-generators/<project_name>` (<project_name> is the last path segment in <input_project_path>).

You can also specify the generator `--g <input_project_path>` and the output `--o <output_generator_path>`.

For more info on this command and aliases you can use run `generate-project --h`

# Snippeting System

As of version 5, I have added a snippeting system where you can dynamically append snippets to generate a file. In the same spirit as the rest of the project this system is designed to be extremely dynamic as well.

To indicate a directory should be treated as a snippet generator, the directory name should be suffixed by `.snippets.js` for exampe a directory named `index.snippets.js` will generate a file called `index.js` from the snippets within it. All files inside the snippet directory are treated as snippets. Shared `includes` for `index.js` are to be inside a directory named `includes`. Then name of the snippet file or the include file will become the key for that `include`/`snippet`.

## Why the snippet system?

Thats a good question. At first I thought that just plain file generation is enough. Which technically is true. But then in a project I was working on I had some `file-generators` need some functions from other modules (foreign key between tables). So as I was generating code for one module/table depending on the forign keys I needed to add function to another module. These functions share common pattern so I had to use the some `file-generators` as `snippets` and manually append them to other fileEntries, which is ok, but not pretty.

So the snippet system comes with the concept of includes and merging/appending/concating snippets dynamically when merging `file-entries` from different generators.

I have included a project called `snippet-builder-test` under `./templator-generator-projects/base-templates` to demonstrate the snippets system. I also created a generator for this project which you can find in `./templator-generator-projects/template-generators/snippet-builder-test` this is a generator of the `snippet-builder-test` which I modified a bit to demonstrate the dynamic appending of snippets. For starter look at file `./index.snippets.js/hello-world.snippet.js` and `./index.snippets.js/hi-mom.snippet.js` line 32 and notice how I added the include `greet` to both of them. Now if you run `generate-project snippet-builder-test ./output-folder` you will see the a file `index.js` which has the the include `greet` on the top and the two snippets belonging to `hello-world.snippet.js` and `hi-mom.snippet.js` but you will also note a foreign line not from the `snippet-generators` inside `index.snippets.js` directory. To find out where this line came from go to `greet.template.js` file line 34-35 you will notice I added a snippet to `index.js`. This is really cool.

Please note while using this system always use the function `mergeFileEntries` and `concatFileEntries` from the `utils.js` file and NOT `Object.assign` or lodash's `assign` or manually writing entries to `filesEntries`. `mergeFileEntries` and `concatFileEntries` smartly merges `snippets`/`filesEntries` so you do not loose any code. If you find out that some snippets are not written/missing from the generated project it is often the case that you used `Object.assign`, or manually updated a `filesEnties` object overwriting some code. In short use `mergeFileEntries` and `concatFileEntries` to compose `filesEntries` dynamically.

To add a snippet to a path simply create a snippet and added to that `fileEntry` like

```js
  const generateFilesEntries = (generateOptions, generatorOptions = {}) => {
    return { 'index.js': new utils.Snippet({ key: 'greeting-humans', codeLines: [`greet('Greetings', 'humans');`], sortOrder: -1, includes: ['greet'] }) };
};
```

note the "greet" `include` above should be defined in the `includes` of the `index.js`. You can technically add new includes using `includes: [{ key: 'lodash', codeLines: ['const _ = require("lodash");'], sortOrder: 0 }]`. But I believe it is cleaner to include all your `includes` in the includes directory :D

When merging/concating `fileEntries` (using `mergeFileEntries` and `concatFileEntries` of `utils.js`) `snippets`/`snippetCompilers` will be automatically merged and their `includes` merged. And once the write to file system steps comes along the `snippet`/`snippetCompiler` compile method is used to compile the `snippet`/`snippetCompiler` and generate `codeLines` from it taking into account the `includes`

Also Note from above code the `snippet` has a key. This is used to ensure no duplicate `snippet` is added to the same file. 

# Discussion

The templator (`template-project` command) will generate the same folder structure of the original project. Each file of the original project will have a `file-generator` file in the output with the same name suffixed by `.template.js` and each folder of the original project will have a `directory-generator` file for it named `index.js` placed inside the same folder path of the original directory. The generators (`<file>.template.js` for files or the `index.js` for directories) have 2 main exposed function of basically the same signature:

1- `generateFilesEntries(generateOptions, generatorOptions)`
   This will not write the files to disk it will however generate the `filesEntries` that represents the output. It takes 2 arguments:
   - `generateOptions` is basically the paramertization we have been talking about. This is for the developer to decide what goes into these options. (e.g. if you are generating a react project template one option might be `includeRedux` of type `boolean` and in the `package.json.template.js` file -which generates the `package.json` file- you can read this option and include redux as a dependency or not. You can also read it in other parts of generator and do with it whatever you wish with it)
   - `generatorOptions` It is basically a super class with base options:
     - `lineSeperator` determaines the line seperator of the generated code (by default it is CRLF '\r\n')
     - `writeEmptyFiles` this determaines whether a generated file with content an empty string ('') should be written (note null or undefined will never be written)
     
     NOTE: Most of the time you dont need to worry about this argument (unless you are composing a folder structure and calling `entry-generators` directly i.e. not through CLI)

     Additional `generatorOptions` for `file-generators`:
     - `addFilePath` when calling for example the `file-generator` for a file called `component.js`. The `file-generator` will add an entry to the returned `filesEntries` with key `component.js`, and under this key are codeLines representing the file ({ 'component.js': [...codelines] }`). This option if false makes the file-generator return the codeLines directly.
     
     Additional `generatorOptions` for `directory-generators`:
     - `addDirectoryPath` when calling for example a `directory-generators` for a directory called `dir1`. The `directory-generators` will add an entry to the returned `filesEntries` with key `dir1` (the name of the directory), and under this key are all the outputs of the `file-generators` under `dir1` and the `directory-generators` of `dir1` direct subdirectories (`{ dir1: { file1:[...codelines], subdir:{...subDirFileEntries} } }`). This option if false makes the `directory-generators` not put this key (`{dir1:...}`) but rather return what is under the key `dir1` directly (`{file1:[...codelines],subdir:{...subDirFileEntries}}`)
     - `generateRootFiles` when calling a `directory-generators` this option controls where or not it should call its file generators. if it is false it will not call its direct `file-generators`.
     - `generateSubDirectories` when calling a directory generator this option controls where or not it should call its direct subdirectories `directory-generators`. if it is false it will not call its subdirectory `directory-generators`.
        
        NOTE `generateRootFiles` and `generateSubDirectories` cannot be both false for obvious reasons
2- `generate(outputPath, generateOptions, generatorOptions)`
   This function will call `generateFilesEntries` function and then use the `filesEntries` to write the output to disk using the provided `outputPath` argument
   
Lets take a look at an `entry-generator`. A typical `file-generator`'s `generateFilesEntries` function looks like this:

```js
1-  const generateFilesEntries = (generateOptions, generatorOptions = {}) => {
2-    const fileName = `hello.js`; // you can customise the output file name or path(put '../some_path/filename' or 'some_path/filename' or './some_path/filename' or even absolute path [using '/some_path/filename' or '~/some_path/filename'])
3-    const filePath = `/path/to/greetings/hello.js`;
4-
5-    const codeLines = [
6-      `console.log('HELLO, world!');`
7-    ];
8-    return generatorOptions.addFilePath ? { [fileName]: codeLines } : codeLines; // you can return multiple files or an entire folder structure if you'd like, you can also use absolute paths by starting the key with slash(/) or tilda backslash(~/)
9-  };
10- exports.generateFilesEntries = generateFilesEntries;
```

As you might have noticed from the comments on line `2-` and `8-` you could easily configure the name of the file generated, its path (you can make it absolute path by starting with `/` or `~/`), or even return multiple files/folders. The sky is the limit. a reasonable update to above generator would be

```js
1-  const generateFilesEntries = ({ greetingName = 'hello', greetingEntity = 'world' }, generatorOptions = {}) => {
2-    const fileName = `${greetingName}.js`;
4-
5-    const codeLines = [
6-      `console.log('${greetingName.toUpperCase()}, ${greetingEntity}!');`
7-    ];
8-    return generatorOptions.addFilePath ? { [fileName]: codeLines } : codeLines;
9-  };
10- exports.generateFilesEntries = generateFilesEntries;
```

Notice I removed `filePath` cause I dont need it here. and customise the file name from the generate options.

Now calling `generate-project <generator_path> --greetingName Hi --greetingEntity maa105` will generate a file called `Hi.js` in it is `console.log('Hi, maa105!');`. Pretty neat.

### `codeLines`

`codeLines` are converted to a string before being written to a file. This is done by first flattening the `codeLines` array so it becomes `string[]` then filtering all null/undefined entries from it. Then joining the array using `lineSeperator` (typically CRLF `\r\n`)

### `utils.js` file
#### `codeTransform`

The `codeTransform` function is a very useful util function in the `utils.js` file. It comes in handy when parametrizing your generator. Here is a list of what it does/can do:
- Flattens all input arrays into one array.
- CAN pass all entries into a map function IF any input argument is of type function (or an object with key `mapFunc`).
- Re-flattens the output from map stage above.
- Filters all null/undefined lines.
- CAN trim end of lines IF any input argument is an object with key `trimEnd`.
- CAN add prefix to the begining of all lines IF any input argument is an object with key `prefix`
- CAN add suffix to the end of all lines INCLUDING the last line IF any input argument is an object with key `suffix`
- CAN add seperator to the end of all lines EXCEPT the last line IF any input argument is a string (or an object with key `seperator`) --very useful see below
- CAN indent all the lines IF any input argument is a number (or an object with key `indentCount` [also can use `indentChar` to specify indent character like `\t` or just space -defaults to space])

As you might have deduced from above bullets the input argument type of `codeTransform` is important. Arrays are treated as code lines (or collections to be passed to supplied map function to generate code lines), functions are treated as map function, numbers treated as indent count, and plain objects treated as configuration object with possible keys (`mapFunc`, `trimEnd`, `seperator`, `prefix`, `suffix`, `indentCount`, `indentChar`)

##### Use case:
Say you have an array of table columns and want to generate a create table MySQL SCRIPT
```js
  const generateFilesEntries = ({ tableName, columns }, generatorOptions = {}) => {
    const fileName = `${tableName}.create-table.sql`;

    const uniqCols = filter(columns, ({ unique }) => unique);
    const codeLines = [
      `CREATE TABLE IF NOT EXISTS \`${tableName}\` (`,
      codeTransform(columns, ({ colName, dataType, size, canBeNull, autoIncrement, skip }) => (
          skip ?
          null
          : `\`${colName}\` ${dataType}${size ? `(${size})` : ``}${canBeNull ? `` : ` NOT NULL`}${autoIncrement ? ` AUTO_INCREMENT`: ``}`
        )), ',', 2),
      `);`
    ];
    return generatorOptions.addFilePath ? { [fileName]: codeLines } : codeLines;
  };
```

The above snippet from the `file-generator` the `codeTransform` will pass each column to the map function which returns null for columns with `skip=true` and the sql syntax for creating that column otherwise. It will then remove null entries append commas to end of all lines except the last line and finally indent all the lines by 2 spaces. VERY HANDY if you ask me.

#### `doubleQuoteStringify(str)`, `singleQuoteStringify(str)`, `backTickStringify(str)`

These three functions given a string will escape the string and enclose it with `"` or `'` or `` ` `` respectively

If you do not want to enclose the strings just escape use `doubleQuoteEscape(str)`, `singleQuoteEscape(str)`, `backTickEscape(str)`

##### Use case:

Let us take out greeting generator from above:

```js
  const generateFilesEntries = ({ greetingName = 'hello', greetingEntity = 'world' }, generatorOptions = {}) => {
    const fileName = `${greetingName}.js`;

    const codeLines = [
      `const entity = singleQuoteStringify(greetingEntity);`,
      `console.log('${singleQuoteEscape(greetingName.toUpperCase())}, ' + entity +'!');`
      `console.log(\`${backTickEscape(greetingName.toUpperCase())}, \${entity}!\`);`
    ];
    return generatorOptions.addFilePath ? { [fileName]: codeLines } : codeLines;
  };
  exports.generateFilesEntries = generateFilesEntries;
```

say we call this generator with `` greetingName = Hi\Hello`s `` and `` greetingEntity = o'clock ``

We will get:

```js
  const entity = 'o\'clock';
  console.log('Hi\\Hello`s, ' + entity +'!');
  console.log(`Hi\\Hello\`s, ${entity}!`)
```

#### `new SnippetCompiler({ name, keyedIncludes })`

A `snippetCompiler` is like a repository to build a file from multiple snippets. Most of the time the `snippetCompiler` is added as a `fileEntry` through the sippeting system (directory with `.snippets.js` prefix etc...). Then different generators from different parts of the project can append to it by adding `snippets` with the same path as the `snippetCompiler`'s `fileEntry` (possibly by utlising relative or root absolute path [`~/`,`/`] in their output `filesEntries` [check `./templator-generator-projects/template-generators/snippet-builder-test/greet.template.js` line 34-36]).

`name` is just for error logging purposes and will never show in the compiled file.
`keyedIncludes` these are the list of all includes available to snippets in this `snippetCompiler`. Please note that includes in the `keyedIncludes` are not added to the output file unless one or more `snippet` in the `snippetCompiler` have them as an `include` or they are explicitly added using the `addInclude` method.

`SnippetCompiler.addSnippet(snippet | snipperCompiler | { key, codeLines, sortOrder, [snippet] })`

Appends a `snippet`/`snippetCompiler` to the `snipetCompiler`. (If snippet is passed inside an object like `compiler.addSnippet({ key, snippet })` it will have higher precedence than the `codeLines` [i.e. the `codeLines` will be then ignored])

`SnippetCompiler.addInclude({ key, codeLines, sortOrder })`

Explicitly add an `include` to the compiler (i.e. it will be in the output compiled file)

`SnippetCompiler.compile()`

Compiles the `snippets` and `includes` and generates the `codeLines`. (used by the disk writing phase)

Appends a `snippet`/`snippetCompiler` to the `snipetCompiler`. (If snippet is passed inside an object like `compiler.addSnippet({ key, snippet })` it will have higher precedence than the `codeLines` [i.e. the `codeLines` will be then ignored])

#### `new Snippet({ key, codeLines, sortOrder, includes, keyedIncludes })`

Please note that `snippets` are in a sense `snippetCompilers` in that they have the functions as `snippetCompilers` (adding other snippets etc...) so that is why you have `keyedIncludes` in the input parameters, but most of the time you will provide `key`, `codeLines` and possibly and array of `includes` (array of strings of include keys).

#### `mergeFileEntries(...filesEntries)` and `concatFileEntries(...filesEntries)`

Merges multiple  `filesEntries` into one `filesEntries` taking into account `snippets` on the same path, joining them together instead of overwritting each other as is the case if `Object.assign` was used.
