// https://gist.github.com/Loopiezlol/e00c35b0166b4eae891ec6b8d610f83c

const path = require('path')
const process = require('process')
const { spawnSync } = require('child_process')

const noStdErr = { stdio: ['inherit', 'inherit', 'ignore'] }
const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN
const GITHUB_USERNAME = process.env.GITHUB_USERNAME
const GITHUB_REPO = process.env.GITHUB_REPO
const GITHUB_COMMIT_EMAIL = process.env.GITHUB_COMMIT_EMAIL
const GITHUB_COMMIT_USER = process.env.GITHUB_COMMIT_USER
// leaving this without https:// in order to reuse it when adding the remote
const gitRepositoryURL = `github.com/${GITHUB_USERNAME}/${GITHUB_REPO}.git`

function runCommand (commandString, options) {
  let [command, ...args] = commandString.match(/(".*?")|(\S+)/g)
  args = args.map(item => {
    return item.replace(/^"/, '').replace(/"$/, '')
  })
  const cmd = spawnSync(command, args, options)
  // you should probably obfuscate the credentials before logging
  if (cmd.stderr) {
    const errorString = cmd.stderr.toString()
    if (errorString) {
      throw new Error(
        `Git command failed
        ${commandString}
        ${errorString}`
      )
    }
  }
}

module.exports.clone = async () => {
  // install git binary

  if (process.env.IS_LOCAL !== 'true') {
    await require('lambda-git')({
      targetDirectory: '/tmp/lambda'
    })
  }

  runCommand(`git clone --quiet https://${gitRepositoryURL} ${path.join('/tmp', GITHUB_REPO)}`, noStdErr)
  process.chdir(path.join(path.join('/tmp', GITHUB_REPO)))
  runCommand(`git pull origin master`, noStdErr)
  return process.cwd()
}

module.exports.commit = (message) => {
  // update local git config with email and username (required)
  runCommand(`git config --local user.email ${GITHUB_COMMIT_EMAIL}`)
  runCommand(`git config --local user.name "${GITHUB_COMMIT_USER}"`)
  // stage local files
  runCommand('git add .')
  // commit changes
  // commit by :robot:
  runCommand(`git commit -m "${message}"`, { quotes: true })
  // replace the remote with an authenticated one
  runCommand('git remote rm origin')
  runCommand(
    `git remote add origin https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@${GITHUB_REPO}`
  )
  return true
}
module.exports.push = () => {
  // push changes to remote
  runCommand('git push --porcelain --set-upstream origin master')
  // terminate the lambda
  return true
}
