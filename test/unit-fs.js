#!/usr/bin/env node

'use strict';
var assert = require('chai').assert;

// var moment = require('moment');

// const path = require('path');
var program = require('commander');
var shell = require('shelljs');
var fs = require('fs');
var SSH = require('ssh2');
var net = require('net');
var chalk = require('chalk');

var tools = require('./lib/tools.js');
var git = tools.git;
var git_tc = tools.git_tc;
var nodegit = require("nodegit");

var workspace = tools.setup_workspace();
var Teleclone = require('../lib/index');

function sshd_log() {
    console.log.apply(this, arguments);
}



describe('Teleclone', function(){
    before(function(done) {
        var test = this;
        var gitdir = tools.setup_workspace.apply(this);

        test.test_token = gitdir.split('/').pop();

        test.origdir = process.cwd();
        process.chdir(gitdir);

        shell.mkdir('src');
        shell.mkdir('target');

        process.chdir('src');

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
            // this.test_target = 'file://..:4000/' + this.test_token + '/';
            this.test_target = path.resolve('../target/');
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

        // describe('Test SFTP', function() {
        //     before(function(done) {
        //         shell.
        //         // maybe we use the shells sshd until we get the tests set up right
        //         // this.sshd = new SSH.Server({
        //         //     privateKey: this.keys.private,
        //         //     port: 4000
        //         // }, function(client) {
        //         //     sshd_log('Client connected!');
        //         //     client.on('authentication', function(ctx) {
        //         //         ctx.accept();
        //         //     });
        //         //     client.on('ready', function() {
        //         //         sshd_log('Client authenticated!');
        //         //     });
        //         //     client.on('session', function(accept, reject) {
        //         //         var session = accept();
        //         //         session.once('exec', function(accept, reject, info) {
        //         //             sshd_log('Client wants to execute: ' + inspect(info.command));
        //         //             var stream = accept();
        //         //             stream.end();
        //         //         });
        //         //         session.on('end', function() {
        //         //             sshd_log('Client disconnected');
        //         //         });
        //         //     });
        //         // });
        //         //
        //         // var test = this;
        //         // this.sshd.listen(4000, '127.0.0.1', function() {
        //         //     console.log('Listening on port ' + this.address().port);
        //         //     done();
        //         // });
        //     });
        //     after(function() {
        //         this.sshd.close();
        //     });
            //
            // it('connects to its target', function(done) {
            //     // this.tc.connect( function(err) {
            //     //     done();
            //     // });
            // });
            // it('remote fs is empty', function(done) {
            //     done();
            // });
            // it('initiate watch loop', function(done) {
            //
            //     done();
            // });
            // it('file edit is uploaded', function(done) {
            //     //edit a file, then check the fs the ssh server keeps, and see it there
            //     done();
            // });
            // it('file edit conflict', function(done) {
            //     //change the file on the remote fs, edit the local and watch the sparks
            //
            //     //cases:
            //         //old commit
            //         //commit found after fetch/pull
            //         //commit not found
            //
            //     done();
            // });
            // it('fill', function(done) {
            //     done();
            // });
            // it('sync', function(done) {
            //     done();
            // });
            // it('', function(done) {
            //     done();
            // });
            // it('', function(done) {
            //     done();
            // });
        // });

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
