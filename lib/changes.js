'use strict'
import { unlinkSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import debug from '../lib/debug' // eslint-disable-line no-unused-vars
import meta from '../lib/meta'
import { clone, commit, push } from '../lib/git'
import { env } from 'process'
import request from 'sync-request'

const doChanges = (state) => {
  state.repoPath = clone()
  return addItems(state)
    .then(removeItems)
    .then(buildNewDataList)
    .then(writeNewDataList)
    .then(state => {
      commit('Update content using a :robot:')
      if (env.stage === 'production') {
        push()
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
        unlinkSync(
          join(state.repoPath, 'assets', imgPath)
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
  writeFileSync(
    join(state.repoPath, 'data', state.year + '.json'),
    JSON.stringify(newList, null, 2)
  )
  return state
}

const downloadImg = (filepath, url) => {
  try {
    console.log('download start')
    const res = request('GET', url)
    writeFileSync(filepath, res.body)
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
    const imgAbsPath = join(repoPath, 'assets', imgPath)
    const imgAbsDir = dirname(imgAbsPath)
    console.log('Download: ' + srcUrl + ' to ' + imgAbsPath)

    if (!existsSync(imgAbsDir)) {
      mkdirSync(imgAbsDir)
    }

    downloadImg(
      imgAbsPath,
      srcUrl
    )
  })
  return state
}

export default doChanges
