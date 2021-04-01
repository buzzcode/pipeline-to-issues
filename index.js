//
// entry point when called from a Workflow Action
//

const core = require('@actions/core');
const github = require('@actions/github');

const importFlaws = require('./importer').importFlaws;

console.log('WARNING');
console.log('WARNING: This Action has been deprecated.');
console.log('WARNING: Please switch to https://github.com/buzzcode/veracode-flaws-to-issues');
console.log('WARNING');

try {
    // get input params
    const resultsFile = core.getInput('pipeline-results-json', {required: true} );
    const token = core.getInput('github-token', {required: true} );
    const waitTime = core.getInput('wait-time');                // default set in Action.yml

    // other params
    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;
    // context {{ github.repository }}  = 'owner/reponame'

    //console.log(`Calling with: resultsFile: ${resultsFile}, token: ${token}, waitTime: ${waitTime}, owner: ${owner}, repo: ${repo}`)

    // do the thing
    importFlaws(
        {resultsFile: resultsFile,
         githubOwner: owner,
         githubRepo: repo,
         githubToken: token,
         waitTime: waitTime}
    )
    .catch(error => {console.error(`Failure at ${error.stack}`)});
} catch (error) {
    core.setFailed(error.stack);
}
