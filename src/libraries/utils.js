import _         from 'lodash';
import fs        from 'fs-extra';
import path      from 'path';
import crypto    from 'crypto';
import colors    from 'colors';
import columnify from 'columnify';

export function findFiles (regexp = /\.md$/, folder, callback) {
  if (3 > arguments.length) {
    return findFiles(/\.md$/, regexp, folder);
  }

  if (!_.isFunction(callback)) {
    throw new Error('callback is not provided');
  }

  if (!fs.existsSync(folder)) {
    callback(new Error('folder is not found'));
  }

  let files = [];
  _.forEach(fs.readdirSync(folder), function (filename) {
    let file = path.join(folder, filename);

    if (fs.statSync(file).isDirectory()) {
      findFiles(regexp, file, function (error, subFiles) {
        files = files.concat(subFiles);
      });
    }
    else if (regexp.test(filename)) {
      files.push(file);
    }
  });

  callback(null, files);
}

export function md5 (source) {
  let md5sum = crypto.createHash('md5');
  md5sum.update(source);
  return md5sum.digest('hex');
}

export let quickSort = (function () {
  const INSERT_SORT_THRESHOLD = 10;

  function compare (a, b, desc, key) {
    if (_.isFunction(key)) {
      return true === desc
      ? key(a) > key(b)
      : key(a) < key(b);
    }

    if (_.isString(key) && a.hasOwnProperty(key) && b.hasOwnProperty(key)) {
      return true === desc
      ? a[key] > b[key]
      : a[key] < b[key];
    }

    return true === desc
    ? a > b
    : a < b;
  }

  function isort (xs, begin, end, desc, key) {
    for (let a = begin, b; a < end; a += 1) {
      let t = xs[a];

      for (b = a; b > begin && compare(t, xs[b - 1], desc, key); b -= 1) {
        xs[b] = xs[b - 1];
      }

      xs[b] = t;
    }

    return xs;
  }

  function medianOfThree (a, b, c, desc, key) {
    if (compare(a, b, desc, key)) {
      if (compare(b, c, desc, key)) {
        return b;
      }

      if (compare(a, c, desc, key)) {
        return c;
      }

      return a;
    }

    if (compare(a, c, desc, key)) {
      return a;
    }

    if (compare(b, c, desc, key)) {
      return c;
    }

    return b;
  }

  function vecswap (xs, a, b, c) {
    for (let j = c - n, i = a, n = Math.min(b - a, c - b); j < c; j += 1, i += 1) {
      let t = xs[i];
      xs[i] = xs[j];
      xs[j] = t;
    }

    return a + (c - b);
  }

  function sort (xs, begin, end, desc, key) {
    if (end < begin + INSERT_SORT_THRESHOLD) {
      isort(xs, begin, end, desc, key);
      return;
    }

    let i     = begin - 1;
    let j     = end;
    let u     = i;
    let v     = j;
    let pivot = medianOfThree(xs[begin], xs[Math.floor((begin + end) / 2)], xs[end - 1], desc, key);

    while (i < j) {
      i += 1;

      while (i < j && compare(xs[i], pivot, desc, key)) {
        i += 1;
      }

      j -= 1;
      while (i < j && compare(pivot, xs[j], desc, key)) {
        j -= 1;
      }

      if (i < j) {
        let t = xs[i];
        xs[i] = xs[j];
        xs[j] = t;

        if (!compare(xs[i], pivot, desc, key)) {
          u     += 1;
          t     = xs[i];
          xs[i] = xs[u];
          xs[u] = t;
        }

        if (!compare(pivot, xs[j], desc, key)) {
          v     -= 1;
          t     = xs[j];
          xs[j] = xs[v];
          xs[v] = t;
        }
      }
    }

    j = vecswap(xs, i, v, end);
    i = vecswap(xs, begin, u + 1, i);

    sort(xs, begin, i, desc, key);
    sort(xs, j, end, desc, key);
  }

  return function quickSort (xs, desc, key, begin, end) {
    sort(xs, 'number' === typeof begin ? begin : 0, 'number' === typeof end ? end : xs.length, desc, key);
    return xs;
  };
})();

/**
 * Print results
 * @param  {Array}  stats   result set
 * @param  {Object} options columnify setting
 */
export function printStats (stats, options) {
  /* istanbul ignore if */
  if (_.isEmpty(stats)) {
    /* eslint no-console:off */
    trace(colors.yellow('Generate completed but nothing to be generated.'));
    return false;
  }

  options = _.defaultsDeep(options, {
    headingTransform (heading) {
      return (heading.charAt(0).toUpperCase() + heading.slice(1)).white.bold;
    },
    config: {
      assets: {
        align: 'right',
        dataTransform (file) {
          return colors.green(file).bold;
        },
      },
      size: {
        align: 'right',
        dataTransform (size) {
          return formatBytes(size);
        },
      },
    },
  });

  /* eslint no-console:off */
  trace(columnify(stats, options) + '\n');
  return true;
}

export function printByPad (table) {
  let log  = trace.bind(trace, ' ');
  let max  = 0;
  let nmax = 0;

  let messages = _.map(table, function ({ name, text }) {
    name = name.charAt(0).toUpperCase() + name.slice(1);

    let content = `${name}: ${colors.blue(text)}`;
    let size    = content.length;

    if (max < size) {
      max = size;
    }

    if (nmax < name.length) {
      nmax = name.length;
    }

    return { name, text, content, size };
  });

  log(colors.gray(_.repeat('-', max)));

  _.forEach(messages, function ({ content, name }) {
    log(_.repeat(' ', nmax - name.length) + content);
  });

  log(colors.gray(_.repeat('-', max)));
}

/**
 * format size by unit
 * @param  {Number} bytes    size
 * @param  {Number} decimals
 * @return {String}
 */
export function formatBytes (bytes, decimals) {
  if (0 === bytes) {
    return '0 Bytes';
  }

  let k     = 1000;
  let dm    = decimals + 1 || 3;
  let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let i     = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * print stats
 */
export function trace () {
  /* eslint no-console:off */
  !process.env.SILENT && console.log.apply(console, arguments);
}

/**
 * convert name
 * @param  {String} name
 * @return {Object}
 * @description
 * convert "-", "_", "camelName", "NAME", "name"
 * "-hyphen" for style class
 * "_underscore" for filename
 * "camelName" for javascript variables
 */
export function convertName (name) {
  let camelcase = name.replace(/[- _]([\w])/g, ($all, $1) => {
    return $1.toUpperCase();
  })
  .replace(/^[A-Z]/, ($all) => {
    return $all.toLowerCase();
  });

  let underscore = camelcase.replace(/[A-Z]/g, ($all) => {
    return `_${$all.toLowerCase()}`;
  });

  let hyphen = camelcase.replace(/[A-Z]/g, ($all) => {
    return `-${$all.toLowerCase()}`;
  });

  let blank = camelcase.replace(/[A-Z]/g, ($all) => {
    return ` ${$all.toLowerCase()}`;
  })
  .replace(/^[a-z]/, ($all) => {
    return $all.toUpperCase();
  });

  let upCamelcase = camelcase.replace(/^[a-z]/, ($all) => {
    return $all.toUpperCase();
  });

  return {
    camelcase,
    upCamelcase,
    underscore,
    hyphen,
    blank,
  };
}