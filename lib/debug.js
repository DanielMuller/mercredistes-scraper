'use strict'

export default (data) => {
  if (typeof data === 'object') {
    console.log(JSON.stringify(data, null, 2))
  } else {
    console.log(data)
  }
  return data
}
