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

hexo.extend.generator.register('test', function (locals) {
  const authors = {};

  locals.posts.data.forEach((p) => {
    const { author, path, title, date } = p;
    if (!author) return;
    if (!(author in authors)) authors[author] = [];
    authors[author].push({ path, title, date });
  });
  const names = Object.keys(authors).sort();
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
