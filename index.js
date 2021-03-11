//
// entry point when called from a Workflow Action
//

const core = require('@actions/core');
const github = require('@actions/github');

const importFlaws = require('./importer').importFlaws;
//import importFlaws from './importer.js'

// context {{ github.repository }}  = owner/reponame

try {
    // get input params
    const resultsFile = core.getInput('pipeline-results-json', {required: true} );
    const token = core.getInput('github-token', {required: true} );
    const waitTime = core.getInput('wait-time');

    // other params
    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;
    

    //const time = (new Date()).toTimeString();
    //core.setOutput("time", time);
    
    // Get the JSON webhook payload for the event that triggered the workflow
    //const payload = JSON.stringify(github.context.payload, undefined, 2)
    //console.log(`The event payload: ${payload}`);


        //owner = github.context.repo.owner
    //repo = github.context.repo.repo

    console.log(`Calling with: resultsFile: ${resultsFile}, waitTime: ${waitTime}, owner: ${owner}, repo: ${repo}`)

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
