//
// entry point when called from a Workflow Action
//

const core = require('@actions/core');
const github = require('@actions/github');

const importFlaws = require('./importer').importFlaws;
//import importFlaws from './importer.js'

try {
    // get input params
    const resultsFile = core.getInput('pipeline-results-json', {required: true} );
    const token = core.getInput('github-token', {required: true} );
    const waitTime = core.getInput('wait-time');

    // other params
    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;
    // context {{ github.repository }}  = 'owner/reponame'

    console.log(`Calling with: resultsFile: ${resultsFile}, token: ${token}, waitTime: ${waitTime}, owner: ${owner}, repo: ${repo}`)

    // do the thing
    // importFlaws(
    //     {resultsFile: resultsFile,
    //      githubOwner: owner,
    //      githubRepo: repo,
    //      githubToken: token,
    //      waitTime: waitTime}
    // )
    // .catch(error => {console.error(`Failure.  ${error.message}`)});
} catch (error) {
    core.setFailed(error.message);
}
