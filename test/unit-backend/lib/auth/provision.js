const expect = require('chai').expect;
const q = require('q');
const _ = require('lodash');

describe('The lib/auth/provision module', function() {
  let getModule, constants;

  beforeEach(function() {
    constants = this.moduleHelpers.requireBackend('lib/constants');
    getModule = () => this.moduleHelpers.requireBackend('lib/auth/provision')(this.moduleHelpers.dependencies);
  });

  describe('The getAuthDataFromRequest fn', function() {
    let mapping, headers, req;

    beforeEach(function() {
      mapping = {
        [constants.SPECIAL_AUTH_FIELDS.username]: 'auth-username',
        [constants.SPECIAL_AUTH_FIELDS.domain]: 'auth-domain',
        firstname: 'auth-firstname',
        lastname: 'auth-lastname',
        email: 'auth-username'
      };
      headers = {
        'auth-username': 'alice',
        'auth-domain': 'alice.org',
        'auth-firstname': 'Alice',
        'auth-lastname': 'Rose',
        otherfield: 'other field'
      };
      req = {
        get: key => headers[key]
      };

      this.moduleHelpers.addDep('esn-config', (key) => {
        expect(key).to.equal('mapping');

        return {
          inModule(module) {
            expect(module).to.equal(constants.MODULE_NAME);

            return {
              get() {
                return q(_.cloneDeep(mapping));
              }
            };
          }
        };
      });
      this.moduleHelpers.addDep('domain', {
        getByName(name) {
          expect(name).to.equal(headers['auth-domain']);

          return q({ id: 'domainId' });
        }
      });
    });

    it('should convert the request to auth data', function(done) {
      getModule()
        .getAuthDataFromRequest(req)
        .done((authData) => {
          expect(authData).to.deep.equal({
            domainId: 'domainId',
            mapping: {
              // no more special mappings here
              firstname: 'auth-firstname',
              lastname: 'auth-lastname',
              email: 'auth-username'
            },
            user: {
              'auth-username': 'alice',
              'auth-domain': 'alice.org',
              'auth-firstname': 'Alice',
              'auth-lastname': 'Rose'
            },
            username: 'alice'
          });
          done();
        });

    });
  });

  describe('The provisionUser fn', function() {
    let coreUserMock;

    beforeEach(function() {
      coreUserMock = {};
      this.moduleHelpers.addDep('user', coreUserMock);
    });

    it('should provision new user if not exist', function(done) {
      const payload = {
        username: 'alice',
        user: { name: 'Alice' }
      };
      const translatedUser = { _id: 'translated user' };

      coreUserMock.findByEmail = (email, callback) => {
        expect(email).to.equal(payload.username);
        callback();
      };
      coreUserMock.translate = (baseUser, _payload) => {
        expect(baseUser).to.not.exist;
        expect(_payload).to.deep.equal(payload);

        return translatedUser;
      };
      coreUserMock.provisionUser = (user) => {
        expect(user).to.equal(translatedUser);
        done();
      };

      getModule().provisionUser(payload);
    });

    it('should update the user if exists', function(done) {
      const payload = {
        username: 'alice',
        user: { name: 'Alice' }
      };
      const translatedUser = { _id: 'translated user' };
      const foundUser = { _id: 'found user' };

      coreUserMock.findByEmail = (email, callback) => {
        expect(email).to.equal(payload.username);
        callback(null, foundUser);
      };
      coreUserMock.translate = (baseUser, _payload) => {
        expect(baseUser).to.deep.equal(foundUser);
        expect(_payload).to.deep.equal(payload);

        return translatedUser;
      };
      coreUserMock.update = (user) => {
        expect(user).to.equal(translatedUser);
        done();
      };

      getModule().provisionUser(payload);
    });
  });

  describe('The getTrustedHeaders fn', function() {
    let mapping, headers, req, trustedHeadders;

    beforeEach(function() {
      mapping = {
        [constants.SPECIAL_AUTH_FIELDS.username]: 'auth-user',
        [constants.SPECIAL_AUTH_FIELDS.domain]: 'auth-domain',
        firstname: 'AUTH-FIRST-NAME',
        lastname: 'AUTH-LAST-NAME'
      };
      headers = {
        'auth-user': 'peter.wilson@open-paas.org',
        'auth-domain': 'open-paas.org.local',
        'AUTH-FIRST-NAME': 'JÃ©rÃ´me',
        'AUTH-LAST-NAME': 'LoÃ¯c'
      };
      req = {
        get: key => headers[key]
      };
      trustedHeadders = {};
    });

    it('should return decoded name', function() {
      trustedHeadders = getModule().getTrustedHeaders(req, mapping);
      expect(trustedHeadders).to.deep.equal({
        'auth-domain': 'open-paas.org.local',
        'AUTH-FIRST-NAME': 'Jérôme',
        'AUTH-LAST-NAME': 'Loïc',
        'auth-user': 'peter.wilson@open-paas.org'
      });
    });
  });
});
