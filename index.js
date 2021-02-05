const core = require('@actions/core');
const github = require('@actions/github');

try {
    // get input filename, and validate it
    const resultsFile = core.getInput('pipeline-results-json');
    console.log(`Processing file: ${resultsFile}`);
    // validate file exists

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