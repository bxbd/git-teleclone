#!/usr/bin/env node

"use strict";

global._ = require('lodash');

var Teleclone = require("./lib/index");
// global.minimist = require('minimist');
// function parse_arguments(cmdline, arg_opts) {
//     return minimist(cmdline, arg_opts);
// }

// global.express = require('express');
//
// function cmd_target(args, cb){
//     command_handler.apply(this, ['target', args, cb]);
// }
// function cmd_connect(args, cb){
//     command_handler.apply(this, ['connect', args, cb]);
// }
// function cmd_watch(args, cb){
//     command_handler.apply(this, ['watch', args, cb]);
// }
// function cmd_disconnect(args, cb){
//     command_handler.apply(this, ['disconnect', args, cb]);
// }
// function cmd_unwatch(args, cb){
//     command_handler.apply(this, ['unwatch', args, cb]);
// }
//
// function command_handler(cmd, args, cb){
//     console.log('cmd: ' + cmd + '!');
//     console.log('-----------');
//     console.log(arguments);
//     console.log('-----------');
//     console.log(cb);
//     console.log('-----------');
//
//     return cb();
// }
function main() {

    var tc = new Teleclone();

    tc.show();
}

main();
