'use strict';

const path = require('path');

module.exports = {
  FRONTEND_PATH: path.normalize(__dirname + '/../../frontend'),
  FRONTEND_PATH_BUILD: path.normalize(__dirname + '/../../dist')
};
