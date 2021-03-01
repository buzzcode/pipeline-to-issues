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
        'description': 'A Veracode Flaw, Very High severity',
        'severity': 5
    },
    {
        'name': 'VeracodeFlaw: High',
        'color': 'd11141',
        'description': 'A Veracode Flaw, High severity',
        'severity': 4
    },
    {
        'name': 'VeracodeFlaw: Medium',
        'color': 'f37735',
        'description': 'A Veracode Flaw, Medium severity',
        'severity': 3
    },
    {
        'name': 'VeracodeFlaw: Low',
        'color': 'ffc425',
        'description': 'A Veracode Flaw, Low severity',
        'severity': 2
    },
    {
        'name': 'VeracodeFlaw: Very Low',
        'color': '0057e7',
        'description': 'A Veracode Flaw, Very Low severity',
        'severity': 1
    },
    {
        'name': 'VeracodeFlaw: Informational',
        'color': '00b159',
        'description': 'A Veracode Flaw, Informational severity',
        'severity': 0
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

async function addVeracodeFlaw(options, flaw) {
    const githubOwner = options.githubOwner;
    const githubRepo = options.githubRepo;
    const githubToken = options.githubToken;

    const vid = getVeracodeFlawID(flaw);
    console.debug(`Adding VeracodeFlaw ${vid}`);

    var authToken = 'token ' + githubToken;

    await request('POST /repos/{owner}/{repo}/issues', {
        headers: {
            authorization: authToken
        },
        owner: githubOwner,
        repo: githubRepo,
        data: {
            "title": flaw.issue_type + ` ${vid}`,
            "labels": [severityToLabel(flaw.severity)],
        }
    })
    .then( result => {
        console.log(`VeracodeFlaw \"${vid}\" successfully created, result: ${result.status}`);
    })
    .catch( error => {
        // 422 (Unprocessable Entity) = label exists
        //if(error.status == 422) {
        //    console.warn(`VeracodeFlaw label \"${element.name}\" probably exists, ${error.message}`);
        //} else {
            throw new Error (`Error ${error.status} creating VeracodeFlaw \"${vid}\": ${error.message}`);
        //}           
    });
}

function createVeracodeFlawID(flaw) {
    // [VID:CWE:filename:linenum]
    return('[VID:' + flaw.cwe_id +':' + flaw.files.source_file.file + ':' + flaw.files.source_file.line)
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


var severityXref = new Map()

function buildSeverityXref() {
    flawLabels.forEach( element => {
        severityXref.set(element.severity, element.name)
    })
}

function severityToLabel(sevNumber) {
    return severityXref.get(sevNumber);
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
                console.log(`${result.data.length} flaw(s) found, (result code: ${result.status})`);

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
// TODO: do I need link.length??                
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

    buildSeverityXref();

    // walk through the list of flaws in the input file
    for( var i=0; i < flawData.findings.length; i++) {
        var flaw = flawData.findings[i];

        let vid = createVeracodeFlawID(flaw);
        console.debug(`processing flaw ${flaw.issue_id}, VeracodeID: ${vid}`);

        // check for duplicate
        if(veracodeFlaws.has(vid)) {
            console.warn('Issue already exists, skipping import');
            continue;
        }

        // add to repo's Issues
        await addVeracodeFlaw(options, flaw)
        .catch( error => {
            console.error(error.message)
            throw new Error()                   // TODO: fixme   
        })

        // progress counter for large flaw counts
        if(i % 25 == 0)
            console.log(`Processed ${i} flaws`)
    }
}

module.exports = { importFlaws }