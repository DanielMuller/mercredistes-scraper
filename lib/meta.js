'use strict'
import got from 'got'

const metascraper = require('metascraper')([
  require('metascraper-image')()
])

export default (state) => {
  const getImageUrlPromises = []
  const dataList = {}
  state.diff.added.forEach(key => {
    state.newList[key].image = setImagePath(state.newList[key])
    dataList[key] = state.newList[key]
  })
  Object.keys(dataList).forEach(key => {
    const item = dataList[key]
    const getImageUrlPromise = getImageUrl(item.url)
      .then(image => {
        return [key, image]
      })
    getImageUrlPromises.push(getImageUrlPromise)
  })
  return Promise.all(getImageUrlPromises)
    .then(results => {
      results.forEach(item => {
        const [key, image] = item
        state.newList[key].srcImage = image
      })
      return state
    })
}

const setImagePath = (item) => {
  const [year] = item.date.split('-')
  return 'images/' + year + '/' + item.url.replace(/^https?:\/\//i, '').replace(/[^0-9a-z]/gi, '-').replace(/-$/, '').replace(/--+/g, '-') + '.jpg'
}

const getImageUrl = (pageUrl) => {
  return got(pageUrl)
    .then(res => {
      const html = res.body
      const url = res.url
      return metascraper({ html, url })
    })
    .then(metadata => {
      return metadata.image
    })
    .catch()
}
