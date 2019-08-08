'use strict'

module.exports = (data) => {
  if (typeof data === 'object') {
    console.log(JSON.stringify(data, null, 2))
  } else {
    console.log(data)
  }
  return data
}
