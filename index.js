const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

try {
    // get input filename, and validate it
    const resultsFile = core.getInput('pipeline-results-json', {required: true} );

    // validate file exists
    try {
        if(fs.existsSync(resultsFile)) {
            console.log(`Processing file: ${resultsFile}`);
        } else {
            console.log(`Unable to locate file: ${resultsFile}`);
        }
    } catch(err) {
        core.setFailed(`FATAL: Unable to locate file: ${resultsFile}`);
    }

    const time = (new Date()).toTimeString();
    core.setOutput("time", time);
    
    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload: ${payload}`);

    // walk through the list of flaws in the input file

    // add to repo's Issues (checking for duplicates)


    // progress counter for large flaw counts



} catch (error) {
    core.setFailed(error.message);
}