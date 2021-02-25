//
// do the work of actually importing the flaws
// 

const fs = require('fs');
const { request } = require('@octokit/request');

function createLabel(options) {
    const githubOwner = options.githubOwner;
    const githubRepo = options.githubRepo;
    const githubToken = options.githubToken;

    // create label, accept error code if it already exists
    console.log(`creating VeracodeFlaw label for ${githubOwner}/${githubRepo}`);

    var authToken = 'token ' + githubToken;

    return request('POST /repos/{owner}/{repo}/labels', {
        headers: {
            authorization: authToken
        },
        owner: githubOwner,
        repo: githubRepo,
        data: {
            "name":"VeracodeSecurity",
            "color":"4661af",
            "description":"A security vulnerability found by the Veracode scanner"
        }
    })
    .then( result => {
        return(`VeracodeFlaw label successfully created, result: ${result.status}`);
    })
    .catch( error => {
        // 422 = label exists
        if(error.status == 422) {
            return('VeracodeFlaw label already exists');
        } else {
            throw new Error (`Error ${error.status} creating VeracodeFlaw label: ${error.message}`);
        }           
    });
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

function getAllVeracodeIssues() {

}

function flawExists() {

}

async function importFlaws(options) {
    const resultsFile = options.resultsFile;
    const githubOwner = options.githubOwner;
    const githubRepo = options.githubRepo;
    const githubToken = options.githubToken;
    var flawData;

    // basic sanity checking
    if(resultsFile === undefined || resultsFile === null)
        throw new Error('missing results file')
    if(githubOwner === undefined || githubOwner === null)
        throw new Error('missing github owner')
    if(githubRepo === undefined || githubRepo === null)
        throw new Error('missing github repo')
    if(githubToken === undefined || githubToken === null)
        throw new Error('missing github token')

    // validate file exists, and read from it
    try {
        if(fs.existsSync(resultsFile)) {
            console.log(`Processing file: ${resultsFile}`);

            flawData = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        } else {
            throw `Unable to locate scan results file: ${resultsFile}`;
            //core.setFailed(`Unable to locate file: ${resultsFile}`)
        }
    } catch(err) {
        //core.setFailed(`FATAL Error attempting to locate file: ${resultsFile}`);
        throw new Error(err);
    }

    // create the label 
    await createLabel(options)
    .then( val => {
        console.log(val);
    })
    .catch( error => {
        console.error(error.message)
    });
   

    //console.log(result);
    // .then( result => {
    //     console.log(result)
    // })
    // .catch( error => {
    //     console.error(`caught error ${error}`)
    // });

    // get a list of all open VeracodeSecurity issues in the repo
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