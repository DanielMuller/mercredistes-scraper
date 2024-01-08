import { writeFile } from 'fs'
import got from 'got'
import listing from '../lib/listing'
import debug from '../lib/debug' // eslint-disable-line no-unused-vars
import { diffArrays } from 'diff'
import doChanges from '../lib/changes'
const GITHUB_USERNAME = process.env.GITHUB_USERNAME
const GITHUB_REPO = process.env.GITHUB_REPO

export async function handler (event) {
  console.log('Event', JSON.stringify(event, null, 2))
  const year = parseInt(event.year)
  const state = {
    year,
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
  return got(currentVersionUrl).json()
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
  const changes = diffArrays(previousItems, newItems)
  state.diff.added = [].concat(...changes.filter(item => item.added === true).map(item => item.value))
  state.diff.removed = [].concat(...changes.filter(item => item.removed === true).map(item => item.value))
  return state
}

const save = (year, data) => { // eslint-disable-line no-unused-vars
  return new Promise((resolve, reject) => {
    writeFile('/tmp/result.json', JSON.stringify(data, null, 2), (err) => {
      if (err) {
        reject(err)
      }
      resolve(data)
    })
  })
}
