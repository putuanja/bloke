/* eslint max-nested-callbacks: off */
/* eslint-env mocha */

import fs         from 'fs-extra';
import path       from 'path';
import { expect } from 'chai';
import { render } from '../../src/libraries/renderer';
import * as VARS  from '../../src/libraries/variables';

describe('Render HTML Files', function () {
  describe('render html by converted datas', function () {
    let folder   = path.join(VARS.TEMPORARY_PATH, './unitest/renderer/');
    let template = path.join(folder, './template.pug');

    before(function () {
      let source = [
        '#myContent= JSON.stringify(articles)',
        '#myPage= JSON.stringify(page)',
      ];

      fs.ensureDirSync(folder);
      fs.ensureFileSync(template);
      fs.writeFileSync(template, source.join('\n'));
    });

    after(function () {
      fs.removeSync(folder);
    });

    it('can render html files', function (done) {
      let pagedata = {
        output   : path.join(folder, 'dist/index.html'),
        template : template,
        data     : {
          articles : [0, 1],
          page     : {
            perSize : 10,
            total   : 1,
            current : 1,
          },
        },
      };

      let options = {
        engine: {
          use: 'pug',
        },
        src: VARS.TEMPORARY_PATH,
      };

      render([pagedata], options, function (error, pages) {
        expect(error).to.not.be.an('error');
        expect(pages).to.have.lengthOf(1);

        let page = pages[0];
        expect(page).to.have.property('file');
        expect(page).to.have.property('assets');
        expect(page).to.have.property('size');

        expect(page.file).to.equal(pagedata.output);
        expect(fs.existsSync(page.file)).to.be.true;
        expect(page.assets).to.equal(page.file.replace(VARS.ROOT_PATH, ''));

        let state = fs.statSync(page.file);
        expect(page.size).to.equal(state.size);

        let buffer  = fs.readFileSync(page.file);
        let content = buffer.toString();

        let parseHTMLObject = function (domId) {
          let regexp = new RegExp(`<div id="${domId}">(.+?)<\/div>`);
          let match  = regexp.exec(content);
          let html   = match[1];
          let json   = html.replace(/&quot;/g, '"');

          return JSON.parse(json);
        };

        let htmlContent = parseHTMLObject('myContent');
        expect(htmlContent).to.be.an('array');
        expect(htmlContent).to.include.members([0, 1]);

        htmlContent = parseHTMLObject('myPage');
        expect(htmlContent).to.be.an('object');
        expect(htmlContent).to.have.property('perSize');
        expect(htmlContent).to.have.property('total');
        expect(htmlContent).to.have.property('current');

        expect(htmlContent.perSize).to.equal(pagedata.data.page.perSize);
        expect(htmlContent.total).to.equal(pagedata.data.page.total);
        expect(htmlContent.current).to.equal(pagedata.data.page.current);

        done();
      });
    });
  });
});
