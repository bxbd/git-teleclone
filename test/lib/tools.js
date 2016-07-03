
var chdir = require('chdir');

var shell = require("shelljs");
var fs = require("fs");
var assert = require("assert");
var keypair = require("keypair");
var forge = require("node-forge");

var _git_run = function(cmd, quiet) {
   //~ if( !cmd.match(/^git(rig)? /) ) cmd = 'git ' + cmd;

   // console.log('$ ' + cmd);
   var ret = shell.exec(cmd, {silent: true});

   ret.output = ret.output.replace(/^\s*|\s$/g, '');
   if( ret.output == '' ) {
      ret.lines = [];
   }
   else {
      ret.lines = ret.output.split("\n");
   }

   // console.log('>? ' + ret.code);
   if( !quiet ) {
    //   console.log(ret.output + '\n--');
   }
   // console.log('');
   return ret;
}

var _git_test = function(cmd, italso, opts) {
   if( !opts ) opts = {};
   return describe('$ ' + cmd, function() {
      var ret = _git_run(cmd, false);
      it('should exit with 0', function(done) {
         assert.equal( 0, ret.code );
         done();
      })
      if( !opts['empty_ok'] ) {
         it(ret.output, function(done) {
            assert.notEqual( '', ret.output );
            done();
         })
      }
      if( italso ) {
         for( var i = 0; i < italso.length; i++ ) {
            var a = italso[i];
            it( a[0], function() { a[1](ret, a[2]) } );
         }
      }
   console.log(this);
      return ret;
   });
}
module.exports = {

   git: function(cmd, italso, opts) {
      return _git_run('git ' + cmd, italso, opts);
   },
   gittc: function(cmd, italso, opts) {
      return _git_run('git teleclone ' + cmd, italso, opts);
   },
   setup_workspace: function(cb) {
      var token = require('crypto').randomBytes(64).toString('hex');
      var gitdir = 'test-' + token.substr(0, 6);

      if( !shell.test('-d', 'tmp') ) {
          shell.mkdir('tmp');

          console.log("Generating ssh keys for testing server");
          var pair = keypair();
          var publicKeyObj = forge.pki.publicKeyFromPem(pair.public);
          var publicKey = forge.ssh.publicKeyToOpenSSH(publicKeyObj);

          fs.writeFileSync('tmp/server.key.pub', publicKey);
          fs.writeFileSync('tmp/server.key', pair.private);
      }

      this.keys = [];
      this.keys.public = fs.readFileSync('tmp/server.key.pub');
      this.keys.private = fs.readFileSync('tmp/server.key');
    //   process.chdir('tmp/');

      gitdir = 'tmp/' + gitdir;

      shell.mkdir(gitdir);
      shell.ln('-sf', gitdir, 'tmp/last-test');

        if( cb ) {
            chdir( gitdir, cb );
            return gitdir;
        }

    //   process.chdir(gitdir);

      return gitdir;
   }
};
