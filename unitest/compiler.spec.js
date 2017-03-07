/* eslint max-nested-callbacks: off */
/* eslint-env mocha */

import _           from 'lodash';
import fs          from 'fs-extra';
import path        from 'path';
import { expect }  from 'chai';
import { compile } from '../src/libraries/compiler';
import { md5 }     from '../src/libraries/utils';
import * as VARS   from '../src/variables';

describe('Markdown Compiler', function () {
  describe('compile markdown file to data', function () {
    let file     = path.join(VARS.TEMPORARY_PATH, './unitest/compiler/article.md');
    let title    = 'my article title';
    let author   = 'my name';
    let date     = new Date() + '';
    let category = 'my category';
    let tags     = 'tag1, tag2';
    let content  = 'main content';

    before(function () {
      let source = [
        `<!-- title: ${title} -->`,
        `<!-- author: ${author} -->`,
        `<!-- date: ${date} -->`,
        `<!-- category: ${category} -->`,
        `<!-- tag: ${tags} -->`,
        content,
      ];

      fs.ensureDirSync(path.dirname(file));
      fs.writeFileSync(file, source.join('\n'));
    });

    after(function () {
      fs.removeSync(file);
    });

    it('can extract data from head of markdown file', function (done) {
      compile([file], function (error, metadatas) {
        expect(error).to.not.be.an('error');
        expect(metadatas).to.have.lengthOf(1);

        let metadata = metadatas[0];
        expect(metadata.title).to.be.equal(title);
        expect(metadata.author).to.be.equal(author);
        expect(metadata.date).to.be.equal(date);
        expect(metadata.category).to.be.equal(category);
        expect(metadata.tag).to.be.equal(tags);
        expect(metadata.markdown).to.be.equal(file);
        expect(strip(metadata.html)).to.be.equal(content);
        expect(strip(metadata.summary)).to.be.equal(content);

        let state = fs.statSync(file);
        expect(metadata.hashcode).to.be.equal(md5(file + state.size + state.mtime));

        done();
      });
    });

    function strip (html) {
      return _.trim(html.replace(/<[^>]+>/g, ''), '\n');
    }
  });
});
