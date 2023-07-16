const invalidCharsRx = /[^a-z0-9 -]/g;
const multipleSpacesRx = /\s+/g;
const multipleDashesRx = /-+/g;
// remove accents, swap ñ for n, etc
const from = 'àáäâèéëêìíïîòóöôùúüûñç·/_,:;';
const to = 'aaaaeeeeiiiioooouuuunc------';

hexo.extend.helper.register('slugify', (str) => {
  if (!str) return str;
  let s = str.trim().toLowerCase();

  for (let i = 0, l = from.length; i < l; i++) {
    s = s.replaceAll(from.charAt(i), to.charAt(i));
  }

  return s
    .replaceAll(invalidCharsRx, '') // remove invalid chars
    .replaceAll(multipleSpacesRx, '-') // collapse whitespace and replace by -
    .replaceAll(multipleDashesRx, '-'); // collapse dashes
});
