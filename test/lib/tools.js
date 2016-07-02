
var chdir = require('chdir');

var shell = require("shelljs");
var assert = require("assert")

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

      if( !shell.test('-d', 'tmp') ) shell.mkdir('tmp');
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
