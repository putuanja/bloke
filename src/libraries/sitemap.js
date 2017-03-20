import _          from 'lodash';
import fs         from 'fs-extra';
import path       from 'path';
import xmlbuilder from 'xmlbuilder';
import dateformat from 'dateformat';
import * as VARS  from './variables';

export function build (files, options, callback) {
  if (3 > arguments.length) {
    return build(files, {}, options);
  }

  if (!_.isFunction(callback)) {
    throw new Error('callback is not provided');
  }

  options = _.defaultsDeep(options, {
    output     : path.join(VARS.ROOT_PATH, './sitemap.xml'),
    changefreq : 'weekly',
    fileName   : 'sitemap',
    siteRoot   : '/',
    stripIndex : true,
    lastMod    : dateformat(new Date(), 'yyyy-mm-dd\'T\'HH:MM:ss'),
    priority   : '0.5',
    redirect (file) {
      return file;
    },
  });

  let siteRoot = _.trimEnd(options.siteRoot, '\/');
  let feed     = xmlbuilder.create('feed', {
    version  : '1.0',
    encoding : 'UTF-8'
  });

  let urlset = feed
  .ele('urlset')
  .att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
  .att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
  .att('xsi:schemaLocation', 'http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd');

  _.forEach(options.map, function (siteUrl) {
    let url = urlset.ele('url');

    url.ele('loc').txt(siteUrl);
    url.ele('lastmod').txt(options.lastMod);
    url.ele('changefreq').txt(options.changefreq);
    url.ele('priority').txt(options.priority);
  });

  _.forEach(files, function (file) {
    let url = urlset.ele('url');

    if (options.stripIndex) {
      file = file.replace('index.html', '');
    }

    url.ele('loc').txt(siteRoot + options.redirect(file));
    url.ele('lastmod').txt(options.lastMod);
    url.ele('changefreq').txt(options.changefreq);
    url.ele('priority').txt(options.priority);
  });

  let xmlString = feed.end({
    pretty  : true,
    indent  : '  ',
    newline : '\n'
  });

  fs.ensureFileSync(options.output);
  fs.writeFile(options.output, xmlString, function (error) {
    if (error) {
      callback(error);
      return;
    }

    callback(null, {
      file   : options.output,
      assets : options.output.replace(VARS.ROOT_PATH, ''),
      size   : xmlString.length,
    });
  });
}
