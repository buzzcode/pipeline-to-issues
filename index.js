const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

try {
    // get input filename, and validate it
    const resultsFile = core.getInput('pipeline-results-json', {required: true} );
    var flawData;

    // validate file exists, and read from it
    try {
        if(fs.existsSync(resultsFile)) {
            console.log(`Processing file: ${resultsFile}`);

            flawData = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
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

    // walk through the list of flaws in the input file
    for( var i=0; i < flawData.findings.length; i++) {
        var flaw = flawData.findings[i];
        let flawString = JSON.stringify(flaw, undefined, 2)
        console.log(`processing flaw ${flawString}`)
    }

    // add to repo's Issues (checking for duplicates)


    // progress counter for large flaw counts



} catch (error) {
    core.setFailed(error.message);
}