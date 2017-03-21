/* eslint max-nested-callbacks: off */
/* eslint-env mocha */

import _             from 'lodash';
import fs            from 'fs-extra';
import path          from 'path';
import { expect }    from 'chai';
import * as markdown from '../../src/libraries/markdown';
import { md5 }       from '../../src/libraries/utils';
import * as VARS     from '../../src/libraries/variables';

describe('Markdown Converter', function () {
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
      markdown.extract(file, function (error, metadata) {
        expect(error).to.not.be.an('error');

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
      let picker = function (data) {
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

      let pagedatas = markdown.transform([metadata], options);
      let pagedata  = pagedatas[0];

      expect(pagedata).to.have.property('output');
      expect(pagedata).to.have.property('data');
      expect(pagedata).to.have.property('template');
      expect(pagedata).to.have.deep.property('data.articles');
      expect(pagedata).to.have.deep.property('data.tags');
      expect(pagedata).to.have.deep.property('data.categories');
      expect(pagedata).to.have.deep.property('data.authors');

      expect(pagedata.output).to.equal(path.join(options.output, output));
      expect(pagedata.template).to.equal(path.join(VARS.ROOT_PATH, options.renderer[0].template));

      expect(pagedata.data.articles).to.be.an('array');
      expect(pagedata.data.tags).to.be.an('object');
      expect(pagedata.data.categories).to.be.an('object');
      expect(pagedata.data.authors).to.be.an('object');

      expect(pagedata.data.categories).to.have.property('category');
      expect(pagedata.data.tags).to.contain.all.keys(['tag1', 'tag2']);
      expect(pagedata.data.authors).to.have.property('david');
    });
  });
});
