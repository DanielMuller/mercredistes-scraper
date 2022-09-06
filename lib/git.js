// https://gist.github.com/Loopiezlol/e00c35b0166b4eae891ec6b8d610f83c
// https://github.com/lambci/git-lambda-layer#simple-example-on-nodejs-w-https

import { join } from 'path'
import { env, chdir } from 'process'
import { execSync } from 'child_process'

const GITHUB_TOKEN = env.GITHUB_ACCESS_TOKEN
const GITHUB_USERNAME = env.GITHUB_USERNAME
const GITHUB_REPO = env.GITHUB_REPO
const GITHUB_COMMIT_EMAIL = env.GITHUB_COMMIT_EMAIL
const GITHUB_COMMIT_USER = env.GITHUB_COMMIT_USER
// leaving this without https:// in order to reuse it when adding the remote
const gitRepositoryURL = `github.com/${GITHUB_USERNAME}/${GITHUB_REPO}.git`

export function clone () {
  execSync(`rm -rf ${join('/tmp', GITHUB_REPO)}`)
  execSync(`git clone --quiet https://${gitRepositoryURL} ${join('/tmp', GITHUB_REPO)}`)
  return join('/tmp', GITHUB_REPO)
}

export function commit (message) {
  chdir(`${join('/tmp', GITHUB_REPO)}`)

  execSync(`git config --local user.email ${GITHUB_COMMIT_EMAIL}`)
  execSync(`git config --local user.name "${GITHUB_COMMIT_USER}"`)

  execSync('git add .')

  execSync(`git commit -m "${message}"`)

  execSync('git remote rm origin')
  execSync(`git remote add origin https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@${gitRepositoryURL}`)
  return true
}

export function push () {
  chdir(`${join('/tmp', GITHUB_REPO)}`)
  execSync('git push --porcelain --set-upstream origin master')
  return true
}
