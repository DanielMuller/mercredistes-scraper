'use strict'
const fs = require('fs')
const path = require('path')
const debug = require('../lib/debug') // eslint-disable-line no-unused-vars
const meta = require('../lib/meta')
const git = require('../lib/git')
const process = require('process')
const request = require('sync-request')

const doChanges = (state) => {
  state.repoPath = git.clone()
  return addItems(state)
    .then(removeItems)
    .then(buildNewDataList)
    .then(writeNewDataList)
    .then(state => {
      git.commit('Update content using a :robot:')
      if (process.env.stage === 'production') {
        git.push()
      }
      state.status = 'Content updated'
      return state
    })
}

const addItems = (state) => {
  if (state.diff.added.length > 0) {
    return meta(state)
      .then(doDownloads)
  }
  return new Promise((resolve, reject) => {
    resolve(state)
  })
}

const removeItems = (state) => {
  if (state.diff.removed.length > 0) {
    state.diff.removed.forEach(item => {
      try {
        const imgPath = state.previousList[item].image
        fs.unlinkSync(
          path.join(state.repoPath, 'assets', imgPath)
        )
      } catch (err) {}
    })
  }
  return state
}

const buildNewDataList = (state) => {
  const newData = JSON.parse(JSON.stringify(state.previousList))
  if (state.diff.removed.length > 0) {
    state.diff.removed.forEach(item => {
      delete newData[item]
    })
  }
  if (state.diff.added.length > 0) {
    state.diff.added.forEach(item => {
      newData[item] = state.newList[item]
    })
  }
  state.newData = newData
  return state
}

const writeNewDataList = (state) => {
  const newList = []
  Object.keys(state.newData).forEach(key => {
    newList.push(state.newData[key])
  })
  fs.writeFileSync(
    path.join(state.repoPath, 'data', state.year + '.json'),
    JSON.stringify(newList, null, 2)
  )
  return state
}

const downloadImg = (filepath, url) => {
  try {
    console.log('download start')
    const res = request('GET', url)
    fs.writeFileSync(filepath, res.body)
    console.log('download end')
    return true
  } catch (e) {
    console.error('Download Error: ' + url + ' to ' + filepath + '(' + e.message + ')')
    return null
  }
}

const doDownloads = (state) => {
  state.diff.added.forEach(key => {
    const imgPath = state.newList[key].image
    const srcUrl = state.newList[key].srcImage
    const repoPath = state.repoPath
    const imgAbsPath = path.join(repoPath, 'assets', imgPath)
    const imgAbsDir = path.dirname(imgAbsPath)
    console.log('Download: ' + srcUrl + ' to ' + imgAbsPath)

    if (!fs.existsSync(imgAbsDir)) {
      fs.mkdirSync(imgAbsDir)
    }

    downloadImg(
      imgAbsPath,
      srcUrl
    )
  })
  return state
}

module.exports = doChanges
