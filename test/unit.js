#!/usr/bin/env node

'use strict';
var assert = require('chai').assert;

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
function boogie() {console.log('boogie!!')}

describe('Teleclone', function(){
    before(function(done) {
        var test = this;
        var gitdir = tools.setup_workspace();

        test.test_token = gitdir.split('/').pop();

        test.origdir = process.cwd();
        process.chdir(gitdir);

        git('init');
        //i'm pretty sure i had a reason for writing to files like this
        // shell.echo('1 init\n').to('testfile');

        fs.writeFileSync('testfile', '1 init\n');

        git('add testfile', false, {empty_ok: true});

        git('commit testfile -m "initial commit"');
        git('status');

        git('ls-files --full-name --stage');
        test.commits = [ git('rev-parse HEAD').output ];

        return nodegit.Repository.open('.').then(function(repo) {
            test.repo = repo;
            test.repo.getMasterCommit().then(function(firstCommitOnMaster) {
                test.our_hash = firstCommitOnMaster.id().toString();
                done();
            });
        });
    });

    after(function() {
        process.chdir(this.origdir);
    });

    describe('Verify repository objects', function() {
        it('should match init', function() {
            assert.instanceOf(this.repo, nodegit.Repository, 'it\'s a repo!');

                // assert.instanceOf(firstCommitOnMaster, nodegit.Commit, 'it\'s a commit!');
                // boogie();
            var expected_hash = this.commits[0];
            assert.strictEqual(this.our_hash, expected_hash, 'nodegit repo hash does not match shell created hash');
        });
    });

    describe('Setup Teleclone object', function() {
        before(function(done) {
            var test = this;
            test.tc = new Teleclone(this.repo);
            return test.tc.open(done);
        });
        it('should construct successfully', function() {
            assert.instanceOf(this.tc, Teleclone);
            assert.instanceOf(this.tc.config, Teleclone.TelecloneConfig);
        });
        it('can have a remote added to it', function() {
            this.test_target = 'sftp://localhost:4000/' + this.test_token + '/';
            this.tc.config.add_target('mytarget', this.test_target);
        });
        it('has our added remote', function() {
            var targets = this.tc.targets();

            assert.equal(Object.keys(targets).length, 1, "number of targets doesn't match");
            assert.ok('mytarget' in targets, "doesn't have 'mytarget'");

            var mytarget = targets['mytarget'];
            assert.instanceOf(mytarget, Teleclone.TelecloneTarget);
            assert.equal(mytarget.target_url, this.test_target, "target string doesn't match");
        });
        it('connects to its target', function(done) {
            this.tc.connect(done);
        });

        // this.tc.config.add_target('mytarget', 'sftp://localhost:4000/' + this.test_token + '/');
    });
});


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
