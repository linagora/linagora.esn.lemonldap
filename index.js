'use strict';

const AwesomeModule = require('awesome-module');
const Dependency = AwesomeModule.AwesomeModuleDependency;
const glob = require('glob-all');
const path = require('path');
const FRONTEND_JS_PATH = __dirname + '/frontend/app/';
const FRONTEND_JS_PATH_BUILD = __dirname + '/dist/';

const MODULE_NAME = 'lemonldap';
const AWESOME_MODULE_NAME = 'linagora.esn.' + MODULE_NAME;

const awesomeModule = new AwesomeModule(AWESOME_MODULE_NAME, {
  dependencies: [
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.webserver.wrapper', 'webserver-wrapper'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.esn-config', 'esn-config'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.domain', 'domain'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.passport', 'passport'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.auth', 'auth'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.logger', 'logger'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.ldap', 'ldap'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.user', 'user'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.i18n', 'i18n')
  ],

  states: {
    lib: function(dependencies, callback) {
      const lib = require('./backend/lib')(dependencies);

      return callback(null, {
        lib
      });
    },

    deploy: function(dependencies, callback) {
      const app = require('./backend/webserver/application')(dependencies);

      const webserverWrapper = dependencies('webserver-wrapper');

      // Register every exposed frontend scripts
      let frontendJsFilesFullPath, frontendJsFilesUri;

      if (process.env.NODE_ENV !== 'production') {
        frontendJsFilesFullPath = glob.sync([
          FRONTEND_JS_PATH + '**/*.module.js',
          FRONTEND_JS_PATH + '**/!(*spec).js'
        ]);

        frontendJsFilesUri = frontendJsFilesFullPath.map(filepath => filepath.replace(FRONTEND_JS_PATH, ''));
      } else {
        frontendJsFilesFullPath = glob.sync([
          FRONTEND_JS_PATH_BUILD + '*.js'
        ]);

        frontendJsFilesUri = frontendJsFilesFullPath.map(filepath => filepath.replace(FRONTEND_JS_PATH_BUILD, ''));
      }

      webserverWrapper.injectAngularAppModules(MODULE_NAME, frontendJsFilesUri, [AWESOME_MODULE_NAME], ['esn'], {
        localJsFiles: frontendJsFilesFullPath
      });

      const lessFile = path.join(FRONTEND_JS_PATH, 'app.less');

      webserverWrapper.injectLess(MODULE_NAME, [lessFile], 'esn');

      webserverWrapper.addApp(MODULE_NAME, app);

      return callback();
    },

    start: function(dependencies, callback) {
      this.lib.init();
      callback();
    }
  }
});

module.exports = awesomeModule;
