const { assign, mapKeys, kebabCase } = require( 'lodash' );

const generatorTasks = require('./generator.tasks');
const templatorTasks = require('./templator.tasks');

assign(exports, generatorTasks, mapKeys(generatorTasks, (t, taskName) => kebabCase(taskName)));
assign(exports, templatorTasks, mapKeys(templatorTasks, (t, taskName) => kebabCase(taskName)));
