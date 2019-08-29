'use strict'

const fs = require('fs')
const got = require('got')
const listing = require('../lib/listing')
const debug = require('../lib/debug') // eslint-disable-line no-unused-vars
const jsDiff = require('diff')
const doChanges = require('../lib/changes')
const GITHUB_USERNAME = process.env.GITHUB_USERNAME
const GITHUB_REPO = process.env.GITHUB_REPO

module.exports.handler = async (event) => {
  const year = parseInt(event.year)
  const state = {
    year: year,
    previousList: {},
    newList: {},
    diff: {}
  }
  return listing(year)
    .then(newList => {
      state.newList = newList
      return year
    })
    .then(fetchPreviousList)
    .then(previousList => {
      state.previousList = previousList
      return state
    })
    .then(diffVersions)
    .then(state => {
      if (state.diff.added.length > 0 || state.diff.removed.length > 0) {
        return doChanges(state)
      } else {
        return noChanges(state)
      }
    })
}

const noChanges = (state) => {
  state.status = 'no changes'
  return state
}

const fetchPreviousList = (year) => {
  const commit = 'master'
  const currentVersionUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/${commit}/data/${year}.json`
  return got(currentVersionUrl, { json: true })
    .then(res => res.body)
    .then(data => {
      const indexedData = {}
      data.forEach(item => {
        indexedData[item.url] = item
      })
      return indexedData
    })
}

const diffVersions = (state) => {
  const previousItems = Object.keys(state.previousList).sort()
  const newItems = Object.keys(state.newList).sort()
  const changes = jsDiff.diffArrays(previousItems, newItems)
  state.diff['added'] = [].concat(...changes.filter(item => item.added === true).map(item => item.value))
  state.diff['removed'] = [].concat(...changes.filter(item => item.removed === true).map(item => item.value))
  return state
}

const save = (year, data) => { // eslint-disable-line no-unused-vars
  return new Promise((resolve, reject) => {
    fs.writeFile('/tmp/result.json', JSON.stringify(data, null, 2), (err) => {
      if (err) {
        reject(err)
      }
      resolve(data)
    })
  })
}
