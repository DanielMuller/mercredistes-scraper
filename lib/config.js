const _ = require('lodash')
const YAML = require('js-yaml')
const fs = require('fs')
const path = require('path')

function getAllFiles (filePath) {
  try {
    const files = fs.readdirSync(filePath)
    return (_.flatten(files.map(function (file) {
      if (fs.statSync(filePath + '/' + file).isDirectory()) {
        return (getAllFiles(filePath + '/' + file))
      }
      return (filePath + '/' + file)
    })))
  } catch (err) {
    return ([])
  }
}
const resources = () => {
  const elements = {}
  const resFiles = getAllFiles('./resources')
  resFiles.map((file) => {
    if (path.extname(file).toLowerCase() !== '.yml') {
      return undefined
    }
    const doc = YAML.load(fs.readFileSync(file, 'utf8'))
    if (doc) {
      delete doc.Outputs
      const methodName = file.split('/').slice(2).map((name) => { return _.upperFirst(name) }).join('').replace(/\.yml$/i, '')
      elements[methodName] = doc
    }
    return undefined
  })
  const fctFiles = getAllFiles('./services')
  fctFiles.map((file) => {
    if (path.extname(file).toLowerCase() !== '.yml') {
      return undefined
    }
    const doc = YAML.load(fs.readFileSync(file, 'utf8'))
    if (doc && doc.properties) {
      _.forOwn(doc.properties, (property, resourceName) => {
        const methodName = file.split('/').slice(2).map((name) => { return _.upperFirst(name) }).join('').replace(/\.yml$/i, '') + _.upperFirst(resourceName)
        elements[methodName] = _.merge(elements[methodName] || {}, { Properties: property })
      })
    }
    return undefined
  })
  return elements
}
const functions = () => {
  const elements = {}
  const fctFiles = getAllFiles('./services')
  fctFiles.map((file) => {
    if (path.extname(file).toLowerCase() !== '.yml') {
      return undefined
    }
    if (/^.*doc\.yml$/i.test(file)) {
      return undefined
    }
    const doc = YAML.load(fs.readFileSync(file, 'utf8'))
    if (doc) {
      delete doc.properties
      const methodName = file.split('/').slice(2).map((name) => { return _.upperFirst(name) }).join('').replace(/\.yml$/i, '')
      elements[methodName] = doc
    }
    return undefined
  })
  return elements
}
const outputs = () => {
  const elements = {}
  const outFiles = getAllFiles('./resources')
  outFiles.map((file) => {
    if (path.extname(file).toLowerCase() !== '.yml') {
      return undefined
    }
    if (/^.*doc\.yml$/i.test(file)) {
      return undefined
    }
    const doc = YAML.load(fs.readFileSync(file, 'utf8'))
    if (doc && doc.Outputs) {
      _.forOwn(doc.Outputs, (output, resourceName) => {
        const methodName = file.split('/').slice(2).map((name) => { return _.upperFirst(name) }).join('').replace(/\.yml$/i, '') + _.upperFirst(resourceName)
        elements[methodName] = _.merge(elements[methodName] || {}, output)
      })
    }
    return undefined
  })
  return elements
}
module.exports.resources = resources
module.exports.functions = functions
module.exports.outputs = outputs
