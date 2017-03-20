/* eslint max-nested-callbacks: off */
/* eslint-env mocha */

import _             from 'lodash';
import fs            from 'fs-extra';
import path          from 'path';
import async         from 'async';
import { expect }    from 'chai';
import { findFiles } from '../../src/libraries/utils';
import * as VARS     from '../../src/libraries/variables';

describe('Utilities Test', function () {
  describe('test function findFiles', function () {
    let rootPath = path.join(VARS.TEMPORARY_PATH, './unitest/utils/');
    let testFiles = [
      'folder/file.md',
      'folder/folder/file.md',
      'folder/folder/folder/file.md',
      'folder/folder/folder/file.html',
    ];

    before(function (done) {
      let tasks = _.map(testFiles, function (file) {
        return function (callback) {
          file = path.join(rootPath, file);
          fs.ensureFile(file, callback);
        };
      });

      async.parallel(tasks, done.bind(null));
    });

    it('can filter files from folder', function () {
      findFiles(rootPath, function (error, files) {
        expect(error).to.not.be.an('error');

        expect(files).to.have.lengthOf(testFiles.length - 1);
      });
    });
  });
});
