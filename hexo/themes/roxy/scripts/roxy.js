const invalidCharsRx = /[^a-z0-9 -]/g;
const multipleSpacesRx = /\s+/g;
const multipleDashesRx = /-+/g;
// remove accents, swap ñ for n, etc
const from = 'àáäâèéëêìíïîòóöôùúüûñç·/_,:;';
const to = 'aaaaeeeeiiiioooouuuunc------';

function slugify(str) {
  if (!str) return str;
  let s = str.trim().toLowerCase();

  for (let i = 0, l = from.length; i < l; i++) {
    s = s.replaceAll(from.charAt(i), to.charAt(i));
  }

  return s
    .replaceAll(invalidCharsRx, '') // remove invalid chars
    .replaceAll(multipleSpacesRx, '-') // collapse whitespace and replace by -
    .replaceAll(multipleDashesRx, '-'); // collapse dashes
}

hexo.extend.helper.register('slugify', slugify);

let names;
const getAuthorNames = (locals) => {
  const authors = {};
  if (!names) {
    locals.posts.data.forEach((p) => {
      const { author, path, title, date } = p;
      if (!author) return;
      if (!(author in authors)) authors[author] = [];
      authors[author].push({ path, title, date });
    });
    names = Object.keys(authors).sort();
  }
  return [names, authors];
};

hexo.extend.generator.register('test', function (locals) {
  const [names, authors] = getAuthorNames(locals);
  return [
    {
      path: 'authors/index.html',
      data: {
        authors: names.map((author) => ({
          author,
          path: `authors/${slugify(author)}.html`,
          count: authors[author].length,
        })),
      },
      layout: ['authors'],
    },
    ...names.map((author) => {
      const data = authors[author];
      return {
        path: `authors/${slugify(author)}.html`,
        data: {
          author,
          posts: data.sort((a, b) => a.date - b.date),
        },
        layout: ['author'],
      };
    }),
  ];
});

hexo.extend.generator.register('fileList', (locals) => ({
  path: 'files.json',
  data: {
    json: {
      pages: locals.pages.data
        .sort((a, b) => (a.title === b.title ? 0 : a.title < b.title ? -1 : 1))
        .map((p) => ({
          file: p.source,
          title: p.title,
        })),
      posts: locals.posts.data
        .sort((a, b) =>
          a.source === b.source ? 0 : a.source < b.source ? 1 : -1
        )
        .map((p) => ({
          file: p.source,
          title: p.title,
          date: p.date.format('YYYY-MM-DD'),
        })),
      categories: locals.categories.map((cat) => cat.name).sort(),
      tags: locals.tags.map((t) => t.name),
      authors: getAuthorNames(locals)[0],
    },
    layout: ['noop'],
  },
}));
