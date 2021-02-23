//
// do the work of actually importing the flaws
// 
const fs = require('fs');


function createLabel() {
    //owner = github.context.repo.owner
    //repo = github.context.repo.repo

    // create label, accept error code if it already exists



}

// convert from the severity number in the results file to a string
function mapSeverity(sevNumber) {
    switch(sevNumber) {
        case 5:
            return 'Very High';
            break;
        case 4:
            return 'High';
            break;
        case 3:
            return 'Medium';
            break;
        case 2:
            return 'Low';
            break;
        case 1:
            return 'Very Low';
            break;
        case 0:
            return 'Informational';
            break;
        default:
            return 'Unknown';
    }
}

function getVeracodeFlaws() {

}

function flawExists() {

}

function importFlaws() {



    flawData = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));


    // create the label 
    createLabel();

    // get a list lof all open VeracodeSecurity issues in the repo
    getAllVeracodeIssues();

    // walk through the list of flaws in the input file
    for( var i=0; i < flawData.findings.length; i++) {
        var flaw = flawData.findings[i];

        // turn on Step Debug Logs (https://docs.github.com/en/actions/managing-workflow-runs/enabling-debug-logging)
        //  to see core.debug output
        //core.debug('1');
        //let flawString = JSON.stringify(flaw, undefined, 2)
        //console.log(`processing flaw ${flawString}`)

        

        // add to repo's Issues (checking for duplicates)


        // progress counter for large flaw counts



    }
}

module.exports = { importFlaws }