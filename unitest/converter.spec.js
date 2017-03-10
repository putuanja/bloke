/* eslint max-nested-callbacks: off */
/* eslint-env mocha */

import _           from 'lodash';
import fs          from 'fs-extra';
import path        from 'path';
import { expect }  from 'chai';
import { convert } from '../src/libraries/converter';
import { md5 }     from '../src/libraries/utils';
import * as VARS   from '../src/variables';

describe('Theme Compiler', function () {
  describe('create new data by configure of theme', function () {
    it('can convert new formated data by config', function () {
      let metadata = {
        hashcode : 'b2ea23db3e2948c7e4b57fd8ca3864ca',
        markdown : 'file.md',
        html     : 'my main html content',
        summary  : 'summary of content',
        title    : 'article_title',
        tag      : 'tag1,tag2',
        category : 'category',
        author   : 'david',
      };

      let output = './index.html';
      let picker = function (data, setting) {
        return { output, data };
      };

      let options = {
        output   : './output_folder/',
        renderer : [
          {
            template : './templates/index.pug',
            picker   : picker,
          }
        ],
      };

      let pagedatas = convert([metadata], options);
      let pagedata  = pagedatas[0];

      expect(pagedata).to.have.property('output');
      expect(pagedata).to.have.property('data');
      expect(pagedata).to.have.property('template');
      expect(pagedata).to.have.deep.property('data.articles');
      expect(pagedata).to.have.deep.property('data.tags');
      expect(pagedata).to.have.deep.property('data.archives');
      expect(pagedata).to.have.deep.property('data.authors');

      expect(pagedata.output).to.equal(path.join(options.output, output));
      expect(pagedata.template).to.equal(path.join(VARS.ROOT_PATH, options.renderer[0].template));

      expect(pagedata.data.articles).to.be.an('array');
      expect(pagedata.data.tags).to.be.an('object');
      expect(pagedata.data.archives).to.be.an('object');
      expect(pagedata.data.authors).to.be.an('object');

      expect(pagedata.data.archives).to.have.property('category');
      expect(pagedata.data.tags).to.contain.all.keys(['tag1', 'tag2']);
      expect(pagedata.data.authors).to.have.property('david');
    });
  });
});
