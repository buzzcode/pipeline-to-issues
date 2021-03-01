//
// do the work of actually importing the flaws
// 

const fs = require('fs');
const { request } = require('@octokit/request');

// https://www.color-hex.com/color-palette/700 (among others)
const flawLabels = [
    {
        'name': 'VeracodeFlaw: Very High',
        'color': 'f71297',
        'description': 'A Veracode Flaw, Very High severity'
    },
    {
        'name': 'VeracodeFlaw: High',
        'color': 'd11141',
        'description': 'A Veracode Flaw, High severity'
    },
    {
        'name': 'VeracodeFlaw: Medium',
        'color': 'f37735',
        'description': 'A Veracode Flaw, Medium severity'
    },
    {
        'name': 'VeracodeFlaw: Low',
        'color': 'ffc425',
        'description': 'A Veracode Flaw, Low severity'
    },
    {
        'name': 'VeracodeFlaw: Very Low',
        'color': '0057e7',
        'description': 'A Veracode Flaw, Very Low severity'
    },
    {
        'name': 'VeracodeFlaw: Informational',
        'color': '00b159',
        'description': 'A Veracode Flaw, Informational severity'
    }
];

// create the labels we need to tag issues with
async function createLabels(options) {
    const githubOwner = options.githubOwner;
    const githubRepo = options.githubRepo;
    const githubToken = options.githubToken;

    // create label, accept error code if it already exists
    console.log(`creating VeracodeFlaw labels for ${githubOwner}/${githubRepo}`);

    var authToken = 'token ' + githubToken;

    for(const element of flawLabels) {
        await request('POST /repos/{owner}/{repo}/labels', {
            headers: {
                authorization: authToken
            },
            owner: githubOwner,
            repo: githubRepo,
            data: {
                "name": element.name,
                "color": element.color,
                "description": element.description
            }
        })
        .then( result => {
            console.log(`VeracodeFlaw label \"${element.name}\" successfully created, result: ${result.status}`);
        })
        .catch( error => {
            // 422 (Unprocessable Entity) = label exists
            if(error.status == 422) {
                console.warn(`VeracodeFlaw label \"${element.name}\" probably exists, ${error.message}`);
            } else {
                throw new Error (`Error ${error.status} creating VeracodeFlaw label \"${element.name}\": ${error.message}`);
            }           
        });
    }
}

// Map of existing VeracodeFlaw ID's
var veracodeFlaws = new Map()

function addVeracodeFlaw() {

}

function veracodeFlawExists() {

}

function createVeracodeFlawID() {
    // [VID:CWE:filename:linenum]

}

// given a flaw title, extract the FlawID string
function getVeracodeFlawID(title) {
    let start = title.indexOf('[VID');
    if(start == -1) {
        return null;
    }
    let end = title.indexOf(']', start);

    return title.substring(start, end+1);
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

async function getAllVeracodeIssues(options) {
    const githubOwner = options.githubOwner;
    const githubRepo = options.githubRepo;
    const githubToken = options.githubToken;

    var authToken = 'token ' + githubToken;

    // when searching for issues, the label list is AND-ed (all requested labels must exist for the issue),
    // so we need to loop through each severity level manually
    for(const element of flawLabels) {

        // get list of all flaws with the VeracodeFlaw label
        console.log(`Getting list of \"${element.name}\" flaws`);

        let done = false;
        let pageNum = 1;

        let uriName = encodeURIComponent(element.name);
        let reqStr = `GET /repos/{owner}/{repo}/issues?labels=${uriName}&page={page}`
        //let uriStr = encodeURIComponent(reqStr);

        while(!done) {
            //await request('GET /repos/{owner}/{repo}/issues?labels=VeracodeFlaw&page={page}&per_page={pageMax}', {
            await request(reqStr, {
                headers: {
                    authorization: authToken
                },
                owner: githubOwner,
                repo: githubRepo,
                page: pageNum,
                //pageMax: 2
            })
            .then( result => {
                console.log(`result: ${result.status}, ${result.data.length} flaw(s) found`);

                // walk findings and populate VeracodeFlaws map
                result.data.forEach(element => {
                    let flawID = getVeracodeFlawID(element.title);

                    // Map using VeracodeFlawID as index, for easy searching.  element.id for a useful value
                    if(flawID === null){
                        console.warn(`Flaw \"${element.title}\" has no Veracode Flaw ID, ignored.`)
                    } else {
                        veracodeFlaws.set(flawID, element.id);
                    }

                })

                // check if we need to loop
                // (if there is a link field in the headers, we have more than will fit into 1 query, so 
                //  need to loop.  On the last query we'll still have the link, but the data will be empty)
                if(result.headers.link !== undefined && (result.headers.link.length && result.data.length > 0)) {
                        pageNum += 1;
                }
                else 
                    done = true;
            })
            .catch( error => {
// TODO: test
                throw new Error (`Error ${error.status} getting VeracodeFlaw issues: ${error.message}`);
            
            });
        }
    }
}




//
// do the actual work of importing the flaws
//
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
        }
    } catch(err) {
        throw new Error(err);
    }

    // create the label 
    await createLabels(options)
    // .then( val => {
    //     console.log(val);
    // })
    .catch( error => {
        console.error(error.message)                // TODO: ???
        throw new Error(error.message)                   // TODO: fixme
    });

    // get a list of all open VeracodeSecurity issues in the repo
    await getAllVeracodeIssues(options)
    .catch( error => {
        console.error(error.message)
        throw new Error()                   // TODO: fixme   
    });

    // walk through the list of flaws in the input file
    for( var i=0; i < flawData.findings.length; i++) {
        var flaw = flawData.findings[i];

        //console.debug(`processing flaw ${flawString}`)

        

        // add to repo's Issues (checking for duplicates)


        // progress counter for large flaw counts



    }
}

module.exports = { importFlaws }