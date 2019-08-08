'use strict'

// Example api request:
// GET "https://sheets.googleapis.com/v4/spreadsheets/15Jt5Bqr5bznd6Rsn0nN-Pnz7bzDzIeWDTDG_hfNo6cU/values/Sheet1\!A1:D5?key=AIzaSyBA0jyKBahYuyyFhA0_zcDMhw7Td4p88yk"

const got = require('got')
const key = process.env.GOOGLE_ACCESS_TOKEN
let apiClient = null
// const debug = require('./debug')

const sheetIds = {
  2019: '15Jt5Bqr5bznd6Rsn0nN-Pnz7bzDzIeWDTDG_hfNo6cU',
  2018: '1PY4IYH-uzeclSAoAYIByMa0zFVYoQqkuItrbqAfTg_k',
  2017: '1PQCcmD-afW48LxRFa6RDBDyzH0iauA80XNzO3LenAtA',
  2016: '1PQCcmD-afW48LxRFa6RDBDyzH0iauA80XNzO3LenAtA'
}

const fetch = (year) => {
  const sheetId = sheetIds[year]
  apiClient = got.extend({
    baseUrl: `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`,
    query: `key=${key}`,
    json: true
  })
  return getSpreadsheetInfo()
    .then(getSheetInfo)
    .then(getSheetData)
}

const getSpreadsheetInfo = (sheetId) => {
  return apiClient('').then(res => res.body)
}

const getSheetInfo = (data) => {
  return data.sheets.filter(item => item.properties.sheetId === 0).map(item => {
    return {
      name: item.properties.title,
      rowCount: item.properties.gridProperties.rowCount,
      columnCount: item.properties.gridProperties.columnCount
    }
  })[0]
}

const getSheetData = (info) => {
  return apiClient(`/values/${info.name}!A1:C250`).then(res => res.body.values)
}

module.exports = fetch
