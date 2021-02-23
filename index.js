//
// entry point when called from a Workflow Action
//

const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

import importFlaws from './importer.js'


try {
    // get input filename, and validate it
    const resultsFile = core.getInput('pipeline-results-json', {required: true} );
    var flawData;

    // validate file exists, and read from it
    try {
        if(fs.existsSync(resultsFile)) {
            console.log(`Processing file: ${resultsFile}`);

            //flawData = JSON.parse(flawRawData.toString());
        } else {
            //console.log(`Unable to locate file: ${resultsFile}`);
            core.setFailed(`Unable to locate file: ${resultsFile}`)
        }
    } catch(err) {
        core.setFailed(`FATAL Error attempting to locate file: ${resultsFile}`);
    }

    //const time = (new Date()).toTimeString();
    //core.setOutput("time", time);
    
    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload: ${payload}`);

    importFlaws(resultsFile);

} catch (error) {
    core.setFailed(error.message);
}
