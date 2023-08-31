/**
 * @type {import('@wcj/ejs-cli/lib/watch.mjs').Options}
 */
export default {
  watchOption: {

  },
  globelData: {},
  data: {
    "template/about/index.ejs": "./about.json",
    "template/index.ejs": "./data.json",
    "template/home.ejs": {
      "name": "Hello World",
      "age": 362
    }
  }
};