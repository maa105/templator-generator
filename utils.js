const fs = require('fs-extra');
const path = require('path');
const { camelCase, assign, omit } = require( 'lodash' );
const { spawn } = require( 'child_process' );

const cmdOptions = require('minimist')(((args) => {
  const secondArg = args[1];
  if(secondArg.indexOf('\\gulp.js') === secondArg.length - 8 || secondArg.indexOf('/gulp.js') === secondArg.length - 8 || secondArg.indexOf('\\gulp') === secondArg.length - 5 || secondArg.indexOf('/gulp') === secondArg.length - 5) {
    return args.slice(3); // gulp
  }
  return args.slice(2); // .bin
})(process.argv));
exports.cmdOptions = cmdOptions;

const singleQuoteStringify = (str, encloseWithSingleQuote = true) => {
  const stringified = JSON.stringify(str);
  return (encloseWithSingleQuote ? '\'' : '') + stringified.substr(1, stringified.length - 2).replace(/\\"/gmi, '"').replace(/'/gmi, '\\\'') + (encloseWithSingleQuote ? '\'' : '');
};
exports.singleQuoteStringify = singleQuoteStringify;

const backTickStringify = (str, encloseWithBackTick = true) => {
  const stringified = JSON.stringify(str);
  return (encloseWithBackTick ? '`' : '') + stringified.substr(1, stringified.length - 2).replace(/\\"/gmi, '"').replace(/`/gmi, '\\`').replace(/\${/gmi,'\\${') + (encloseWithBackTick ? '`' : '');
};
exports.backTickStringify = backTickStringify;

const capitalizeFirstLetter = (str) => (str.substr(0, 1).toUpperCase() + str.substr(1));
exports.capitalizeFirstLetter = capitalizeFirstLetter;

const lowerFirstLetter = (str) => ((str.substr(0, 1).toLowerCase()) + str.substr(1));
exports.lowerFirstLetter = lowerFirstLetter;

const getAndRemoveOption = (options, ...keys) => {
  for(let i = 0; i < keys.length; i++) {
    if(options[keys[i]]) {
      const opt = options[keys[i]];
      delete options[keys[i]];
      return opt;
    }
    if(options[camelCase(keys[i])]) {
      const opt = options[camelCase(keys[i])];
      delete options[camelCase(keys[i])];
      return opt;
    }
  }
};
exports.getAndRemoveOption = getAndRemoveOption;

const isDirectory = (source) => fs.lstatSync(source).isDirectory();
exports.isDirectory = isDirectory;

const getDirectoriesNames = (source) => fs.readdirSync(source).filter((name) => isDirectory(path.join(source, name)));
exports.getDirectoriesNames = getDirectoriesNames;

const getDirectoriesPaths = (source) => fs.readdirSync(source).filter((name) => isDirectory(path.join(source, name))).map((name) => path.join(source, name));
exports.getDirectoriesPaths = getDirectoriesPaths;

const getFilesNames = (source) => fs.readdirSync(source).filter((name) => !isDirectory(path.join(source, name)));
exports.getFilesNames = getFilesNames;

const getFilesPaths = (source) => fs.readdirSync(source).filter((name) => !isDirectory(path.join(source, name))).map((name) => path.join(source, name));
exports.getFilesPaths = getFilesPaths;

exports.wait = (duration, data) => new Promise((resolve) => setTimeout(resolve.bind(null, data), duration));

/**
 * promisified wrapper to spawn method
 * @param {string} cmd 
 * @param {string[]} cmdArgs 
 * @param {{errorMessage:string,env:object|true,cwd:string,detached:boolean,shell:boolean,stdio:[import('stream').Stream|string]}} options 
 * @returns {Promise<any> & {childProcess:import('child_process').ChildProcess}}
 */
const execCmd = (cmd, cmdArgs = [], options = {}) => {
  const errorMessage = options.errorMessage || ('Error executing ' + cmd + (cmdArgs ? ('' + cmdArgs.join(' ')) : ''));
  options = assign({ detached: false, shell: true, stdio: 'inherit' }, omit(options, 'errorMessage'));
  if(options.env === true) {
    options.env = Object.assign({}, process.env);
  }
  const buildCmd = spawn(cmd, cmdArgs, options);
  const ret = new Promise((resolve, reject) => {
    try {
      let rejected = false;
      buildCmd.on('error', async (err) => {
        if(!rejected) {
          rejected = true;
          reject(err);
        }
      });
      buildCmd.on('exit', async (code) => {
        if (code !== 0) {
          setTimeout(() => {
            if(!rejected) {
              rejected = true;
              reject(new Error(errorMessage + '. Code: ' + code));
            }
          }, 150);
        }
        else {
          resolve();
        }
      });
    }
    catch(err) {
      console.error('Global Error:', err);
      reject(err || new Error('Global Error'));
    }
  });
  ret.childProcess = buildCmd;
  return ret;
};
exports.execCmd = execCmd;
