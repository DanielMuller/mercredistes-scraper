'use strict'

import getSheet from './sheets'
const fieldMap = [
  'date',
  'name',
  'url'
]
// const debug = require('./debug')

const build = (year) => {
  year = year.toString()
  return getSheet(year)
    .then(removeInvalid)
    .then(toObject)
    .then(cleanData.bind(null, year))
    .then(toIndex)
}

const toObject = (data) => {
  const objData = []

  data.forEach((item) => {
    const objItem = {}
    fieldMap.map((value, key) => {
      objItem[`${value}`] = item[key].trim()
      return objItem
    })
    objData.push(objItem)
  })

  return objData
}

const toIndex = (data) => {
  const indexedData = {}
  data.forEach(item => {
    indexedData[item.url] = item
  })
  return indexedData
}

const removeInvalid = (data) => {
  const reduced = []
  const dateField = fieldMap.indexOf('date')
  const urlField = fieldMap.indexOf('url')
  if (dateField < 0 || urlField < 0) {
    return []
  }

  data.forEach(item => {
    let valid = true
    if (item.length < fieldMap.length) {
      valid = false
    }
    if (!isPlausibleDate(item[dateField])) {
      valid = false
    }
    if (!isPlausibleUrl(item[urlField])) {
      valid = false
    }
    if (valid) {
      reduced.push(item)
    }
  })
  return reduced
}

const cleanData = (srcYear, data) => {
  const clean = []
  data.forEach((item, k) => {
    const [isoDate, deadwood] = cleanDate(item.date, srcYear)
    if (item.name === '' && deadwood) {
      item.name = deadwood
    }
    const [name, photographer] = parseName(item.name)
    if (isoDate) {
      item.date = isoDate
      item.name = name
      item.photographer = photographer
      clean.push(item)
    }
  })
  return clean
}
const cleanDate = (date, srcYear) => {
  let deadwood = null
  const dateSeparator = getDateSeparator(date)

  const dateParse = dateSeparator === '.' ? date.match(/^(\d+)(-\d+)?(\.\d+\.\d+)(.*)$/) : date.match(/^(\d+)(-\d+)?(\/\d+\/\d+)(.*)$/)

  date = `${dateParse[1]}${dateParse[3]}`
  let [day, month, year] = date.split(dateSeparator)
  if (dateParse[4]) {
    deadwood = dateParse[4]
  }
  try {
    day = ('00' + parseInt(day).toString()).slice(-2)
    month = ('00' + parseInt(month).toString()).slice(-2)
    year = ('20' + parseInt(year).toString()).slice(-4)
    if (srcYear < 2018) {
      if (srcYear !== year) {
        if (Math.abs(parseInt(srcYear) - parseInt(year)) >= 2) {
          year = srcYear
        } else {
          return [false, null]
        }
      }
    } else {
      year = srcYear
    }
    return [`${year}-${month}-${day}`, deadwood]
  } catch (err) {
    console.error(`Error in parsing date: ${err}`)
    return [false, null]
  }
}

const isPlausibleDate = (string) => {
  if (!string) {
    return false
  }
  return string.match(/\d+[./]\d+[./]\d+/)
}

const getDateSeparator = (string) => {
  if (string.match(/\d+\/\d+\/\d+/)) {
    return '/'
  }
  return '.'
}

const isPlausibleUrl = (string) => {
  if (!string) {
    return false
  }
  return string.match(/https?:\/\//)
}

const parseName = (string) => {
  try {
    let name = cleanName(string.trim())
    let photographer = null
    const matches = name.match(/^(.+)\((.+)\)$/)
    if (matches) {
      photographer = matches[2].trim()
      name = matches[1].trim()
    }
    if (photographer) {
      photographer = photographer.replace(/^photos?( de)? /i, '')
    }

    if (photographer && photographer.indexOf(',') > -1) {
      const tmp = photographer.split(',').map(item => item.trim())
      photographer = tmp.pop()
      name = `${name} (${tmp.join(', ')})`
    }
    if (photographer && (
      photographer.match(/^\d[\d-.]+$/) || (
        photographer.match(/([\s]+)/g) && photographer.match(/([\s]+)/g).length > 3
      ))) {
      name = `${name} (${photographer})`
      photographer = null
    }
    if (photographer) {
      photographer = photographer.replace(/^\d+/, '').replace(/[()]/g, '')
    }
    if (photographer === null && process.env.default_photographer) {
      photographer = process.env.default_photographer
    }
    return [name, photographer]
  } catch (err) {
    return [false, null]
  }
}

const cleanName = (string) => {
  return string.replace(/\(\(+/g, '(').replace(/\)\)+/g, ')')
}

export default build
