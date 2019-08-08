'use strict'
const fs = require('fs')
const path = require('path')
const debug = require('../lib/debug') // eslint-disable-line no-unused-vars
const meta = require('../lib/meta')
const git = require('../lib/git')
const download = require('image-downloader')

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

const downloadImg = async (filepath, url) => {
  try {
    const options = {
      url: url,
      dest: filepath
    }
    const res = await download.image(options)
    return res.filename
  } catch (e) {
    return null
  }
}

const doDownloads = (state) => {
  state.diff.added.forEach(key => {
    const imgPath = state.newList[key].image
    const srcUrl = state.newList[key].srcImage
    const repoPath = state.repoPath
    downloadImg(
      path.join(repoPath, 'assets', imgPath),
      srcUrl
    )
  })
  return state
}

module.exports = doChanges

//   if (options.added.length > 0 || options.removed.length > 0) {
//     return git.clone().then(repoPath => {
//       options.removed.forEach(item => {
//         const [imgPath] = item.split('|')
//         try {
//           fs.unlinkSync(
//             path.join(repoPath, 'assets', imgPath)
//           )
//         } catch (err) {}
//       })
//       options.added.forEach(item => {
//         const [imgPath, srcUrl] = item.split('|')
//         downloadImg(
//           path.join(repoPath, 'assets', imgPath),
//           srcUrl
//         )
//       })
//
//       fs.writeFileSync(
//         path.join(repoPath, 'data', year + '.json'),
//         JSON.stringify(options.data, null, 2)
//       )
//       git.commit('Update content using a :robot:')
//       // git.push()
//       return options.data
//     })
//   }
//   return options.data
// }
