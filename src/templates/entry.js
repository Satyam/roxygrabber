export default entry = {
  title: '',
  locale: 'es_ES',
  description: '',
  fullURL: '',
  published_time: '',
  modified_time: '',
  metaBLock: '', // tags, categories, date, author, etc
  content: '',
  categories: [], // for posts
  tags: [], // for posts
  author: '', // defaults to {{site.author}}
  schema: '', // see: https://schema.org/docs/full.html https://schema.org/BlogPosting BlogPosting, WebPage, WebPage/AboutPage,WebPage/ContactPage,WebPage/CollectionPage
};

export const template = {
  menu,
  contentClass, // categories, home, post, posts
  contentProps, // in posts:  itemprop="articleBody"
  articleFooter, // link to more... , <- previous | next ->
  clientScript,
};
export const site = {
  root,
  name,
  authorEmail,
  descr,
};
