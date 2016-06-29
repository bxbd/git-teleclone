#!/usr/bin/env node

'use strict';
var assert = require('chai').assert;
var chdir = require('chdir');

// var moment = require('moment');
var program = require('commander');
var shell = require('shelljs');
var fs = require('fs');

var tools = require('./lib/tools.js');
var git = tools.git;
var git_tc = tools.git_tc;
var nodegit = require("nodegit");

var workspace = tools.setup_workspace();
var Teleclone = require('../lib/index');

describe('Teleclone', function(){
    before(function(done) {
        var test = this;
        var gitdir = tools.setup_workspace();
        chdir(gitdir, function() {
            git('init');
            return nodegit.Repository.open('.').then(function(repo) {
                test.repo = repo;
                assert.instanceOf(repo, nodegit.Repository, 'it\'s a repo!');
                done();
            });
        });

    });

    // after(function() {
    //     chdir.pop();
    // });

    it('should be a valid repository', function(done) {
        console.log(this.repo);
        assert.instanceOf(this.repo, nodegit.Repository, 'it\'s a repo!');
        return this.repo.getMasterCommit().then(function(firstCommitOnMaster) {
            console.log(firstCommitOnMaster);
            done();
        });
    });

//
//                     // assert.fail('not ok!', 'ok.');
//                     // var promise =
//
//                     var x = nodegit.Repository.open(".");
//                     x.then(function(repo) {
//                     // .done(
//                     // return setTimeout(function() {
//                         assert.instanceOf(repo, 'Repository', 'it\'s a repo!');
//                         assert.instanceOf(repo, 'Repository', 'it\'s a repo!');
//                         // assert.fail('not ok!', 'ok.');
//                         // assert.equal(result, 1, 'maybeFirst([1, 2, 3]) is 1');
//                         // done();
//                     },
//                     function(err) {
//                         console.log(err);
//                         assert.fail(err, 'ok.');
//                     });
//                     // console.log(x);
//                     // return x;
// // assert.fail('!', x);
//                 });
//                                         // assert.instanceOf(repo, 'Repository', 'it\'s a repo!');


        // assert.fail('not ok!', 'ok.');
        // done();
        // var nodegit = require("nodegit");
        // nodegit.Repository.open(".").then(function(repo) {
        //     assert.typeOf(repo, 'Repository');
        //     assert.fail('not ok!', 'ok.');
        //     // assert.equal(result, 1, 'maybeFirst([1, 2, 3]) is 1');
        //     done();
        // })

    // });
});

// (function() {
//     assert('OK!');
//     nodegit.Repository.open(".").then(function(repo) {
//         assert('OK!');
//         global.teleclone = new Teleclone(repo);
//         assert('OK!');
//         teleclone.init(function(self) {
//             assert('OK!');
//             console.log(self);
//         });
//     })
// })();


// describe('git setup', function(){
//    git('init');
//
//    shell.echo('1 init\n').to('testfile');
//    //~ describe('create testfile', function() {
//       //~ assert.equal( true, shell.cat('testfile') == 'init' );
//    //~ });
//
//    git('add testfile', false, {empty_ok: true});
//
//    git('commit testfile -m "initial commit"');
//    git('status');
//
//    git('ls-files --full-name --stage');
// });
//
// describe('TelecloneTarget', function(){
//     it
//     nodegit.Repository.open(".").then(function(repo) {
//         assert.equal(repo, true, 'Repo Opened');
//         var tc = new Teleclone(repo);
//                assert.equal(tc, true, 'OK!');
//
//     });

   // shell.echo('1 init\n').to('testfile');
   // //~ describe('create testfile', function() {
   //    //~ assert.equal( true, shell.cat('testfile') == 'init' );
   // //~ });
   //
   // git('add testfile', false, {empty_ok: true});
   //
   // git('commit testfile -m "initial commit"');
   // git('status');
   //
   // git('ls-files --full-name --stage');
// });
