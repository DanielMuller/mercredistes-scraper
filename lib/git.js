// https://gist.github.com/Loopiezlol/e00c35b0166b4eae891ec6b8d610f83c
// https://github.com/lambci/git-lambda-layer#simple-example-on-nodejs-w-https

const path = require('path')
const process = require('process')
const { execSync } = require('child_process')

const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN
const GITHUB_USERNAME = process.env.GITHUB_USERNAME
const GITHUB_REPO = process.env.GITHUB_REPO
const GITHUB_COMMIT_EMAIL = process.env.GITHUB_COMMIT_EMAIL
const GITHUB_COMMIT_USER = process.env.GITHUB_COMMIT_USER
// leaving this without https:// in order to reuse it when adding the remote
const gitRepositoryURL = `github.com/${GITHUB_USERNAME}/${GITHUB_REPO}.git`

module.exports.clone = () => {
  execSync(`rm -rf ${path.join('/tmp', GITHUB_REPO)}`)
  execSync(`git clone --quiet https://${gitRepositoryURL} ${path.join('/tmp', GITHUB_REPO)}`)
  return path.join('/tmp', GITHUB_REPO)
}

module.exports.commit = (message) => {
  process.chdir(`${path.join('/tmp', GITHUB_REPO)}`)

  execSync(`git config --local user.email ${GITHUB_COMMIT_EMAIL}`)
  execSync(`git config --local user.name "${GITHUB_COMMIT_USER}"`)

  execSync('git add .')

  execSync(`git commit -m "${message}"`)

  execSync('git remote rm origin')
  execSync(`git remote add origin https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@${gitRepositoryURL}`)
  return true
}

module.exports.push = () => {
  process.chdir(`${path.join('/tmp', GITHUB_REPO)}`)
  execSync('git push --porcelain --set-upstream origin master')
  return true
}
