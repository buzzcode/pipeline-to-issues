//
// do the work of actually importing the flaws
// 

const fs = require('fs');
const { request } = require('@octokit/request');

/* Map of files that contain flaws
 *  each entry is a struct of {CWE, line_number}  
 *  for some admittedly loose, fuzzy matching to prevent duplicate issues */
var flawFiles = new Map();

var severityXref = new Map();       // for faster lookups, map severity # to text string

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
    console.log('Creating VeracodeFlaw labels');

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

function createVeracodeFlawID(flaw) {
    // [VID:CWE:filename:linenum]
    return('[VID:' + flaw.cwe_id +':' + flaw.files.source_file.file + ':' + flaw.files.source_file.line + ']')
}

// given an Issue title, extract the FlawID string (for existing issues)
function getVeracodeFlawID(title) {
    let start = title.indexOf('[VID');
    if(start == -1) {
        return null;
    }
    let end = title.indexOf(']', start);

    return title.substring(start, end+1);
}

function parseVeracodeFlawID(vid) {
    let parts = vid.split(':');

    return ({
        "prefix": parts[0],
        "cwe": parts[1],
        "file": parts[2],
        "line": parts[3].substring(0, parts[3].length - 1)
      })
}

function addExistingFlawToMap(vid) {
    let flawInfo = parseVeracodeFlawID(vid);
    let flaw = {'cwe': flawInfo.cwe,
                'line': flawInfo.line};
    
    if(flawFiles.has(flawInfo.file)) {
        // already have some flaws in this file, so just add this specific flaw to the array
        let flaws = flawFiles.get(flawInfo.file);
        flaws.push(flaw);
    } else {
        // add this file into the map, with the fist of (possible) multiple flaws
        flawFiles.set(flawInfo.file, [flaw])
    }
}

function issueExists(vid) {
    // same file and CWE, +/- 10 lines of code
    let flawInfo = parseVeracodeFlawID(vid)

    if(flawFiles.has(flawInfo.file)) {
        // check all the flaws in this file to see if we have a match
        for(i = 0; i < flawFiles.get(flawInfo.file).length; i++) {
            let existingFlaw = flawFiles.get(flawInfo.file)[i];
            
            // check CWE
            if(flawInfo.cwe == existingFlaw.cwe) {
                // check (+/- 10 lines)
                let newFlawLine = parseInt(flawInfo.line);

                let existingFlawLine = parseInt(existingFlaw.line);
                if( (newFlawLine >= (existingFlawLine - 10)) && (newFlawLine <= (existingFlawLine + 10)) ) {
                    return true;
                }
            }
        }
    }

    return false;
}

function buildSeverityXref() {
    flawLabels.forEach( element => {
        severityXref.set(element.severity, element.name)
    })
}

function severityToLabel(sevNumber) {
    return severityXref.get(sevNumber);
}

// get existing Veracode-entered flaws, to avoid dups
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
        let reqStr = `GET /repos/{owner}/{repo}/issues?labels=${uriName}&state=open&page={page}`
        //let reqStr = `GET /repos/{owner}/{repo}/issues?labels=${uriName}&state=open&page={page}&per_page={pageMax}`

        while(!done) {
            await request(reqStr, {
                headers: {
                    authorization: authToken
                },
                owner: githubOwner,
                repo: githubRepo,
                page: pageNum,
                //pageMax: 3
            })
            .then( result => {
                console.log(`${result.data.length} flaw(s) found, (result code: ${result.status})`);

                // walk findings and populate VeracodeFlaws map
                result.data.forEach(element => {
                    let flawID = getVeracodeFlawID(element.title);

                    // Map using VeracodeFlawID as index, for easy searching.  Line # for simple flaw matching
                    if(flawID === null){
                        console.warn(`Flaw \"${element.title}\" has no Veracode Flaw ID, ignored.`)
                    } else {
                        addExistingFlawToMap(flawID);
                    }
                })

                // check if we need to loop
                // (if there is a link field in the headers, we have more than will fit into 1 query, so 
                //  need to loop.  On the last query we'll still have the link, but the data will be empty)
                if( (result.headers.link !== undefined) && (result.data.length > 0)) {
                        pageNum += 1;
                }
                else 
                    done = true;
            })
            .catch( error => {
                throw new Error (`Error ${error.status} getting VeracodeFlaw issues: ${error.message}`);
            });
        }
    }
}

// delay method to deal with rate-limiting
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class ApiError extends Error {
    constructor(message) {
        super(message);
        this.code = 403;
    }
}

// add the flaw to GitHub as an Issue
async function addVeracodeIssue(options, flaw) {
    const githubOwner = options.githubOwner;
    const githubRepo = options.githubRepo;
    const githubToken = options.githubToken;

    var vid = createVeracodeFlawID(flaw);
    console.debug(`Adding Issue for ${vid}`);

    var authToken = 'token ' + githubToken;

    // build the Issue body text
    let bodyText = `**Filename:** ${flaw.files.source_file.file}`;
    bodyText += `\n\n**Line:** ${flaw.files.source_file.line}`;
    bodyText += `\n\n**CWE:** ${flaw.cwe_id} (${flaw.issue_type})`;
    bodyText += '\n\n' + decodeURI(flaw.display_text);

    await request('POST /repos/{owner}/{repo}/issues', {
        headers: {
            authorization: authToken
        },
        owner: githubOwner,
        repo: githubRepo,
        data: {
            "title": `${flaw.issue_type} ${vid}`,
            "labels": [severityToLabel(flaw.severity)],
            "body": bodyText
        }
    })
    .then( result => {
        console.log(`Issue for \"${vid}\" successfully created, result: ${result.status}`);
    })
    .catch( error => {
        // 403 possible rate-limit error
        if((error.status == 403) && (error.message.indexOf('abuse detection') > 0) ) {

            console.warn(`GitHub rate limiter tripped, ${error.message}`);

            throw new ApiError('Rate Limiter tripped');
        } else {
            throw new Error (`Error ${error.status} creating Issue for \"${vid}\": ${error.message}`);
        }           
    });
}

//
// do the actual work of importing the flaws
//
async function importFlaws(options) {
    const resultsFile = options.resultsFile;
    const githubOwner = options.githubOwner;
    const githubRepo = options.githubRepo;
    const githubToken = options.githubToken;
    const waitTime = parseInt(options.waitTime);
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

    console.log(`Importing flaws into  ${githubOwner}/${githubRepo}.  ${waitTime} seconds between imports (to handle GitHub rate limiting)`);

    // create the label 
    await createLabels(options)
    // .catch( error => {
    //     console.error(error.message)
    //     throw new Error(error.message)
    // });

    // get a list of all open VeracodeSecurity issues in the repo
    await getAllVeracodeIssues(options)
    // .catch( error => {
    //     console.error(error.message)
    //     throw new Error()  
    // });

    buildSeverityXref();

    // walk through the list of flaws in the input file
    var index;
    for( index=0; index < flawData.findings.length; index++) {
        let flaw = flawData.findings[index];

        let vid = createVeracodeFlawID(flaw);
        console.debug(`processing flaw ${flaw.issue_id}, VeracodeID: ${vid}`);

        // check for duplicate
        if(issueExists(vid)) {
            console.warn('Issue already exists, skipping import');
            continue;
        }

        // add to repo's Issues
        // (in theory, we could do this w/o await-ing, but GitHub has rate throttling, so single-threading this helps)
        await addVeracodeIssue(options, flaw)
        .catch( error => {
            if(error instanceof ApiError) {

                // TODO: fall back, retry this same issue, continue process

                // for now, only 1 case - rate limit tripped
                //console.warn('Rate limiter tripped.  30 second delay and time between issues increased by 2 seconds.');
                // await sleep(30000);
                // waitTime += 2;

                // // retry this same issue again, bail out if this fails
                // await addVeracodeIssue(options, flaw)
                // .catch( error => {
                //     throw new Error(`Issue retry failed ${error.message}`);
                // })

                throw error;
            } else {
                //console.error(error.message);
                throw error; 
            }
        })

        // progress counter for large flaw counts
        if( (index > 0) && (index % 25 == 0) )
            console.log(`Processed ${index} flaws`)

        // rate limiter, per GitHub: https://docs.github.com/en/rest/guides/best-practices-for-integrators
        if(waitTime > 0)
            await sleep(waitTime * 1000);
    }

    console.log(`Done.  ${index} flaws processed.`);
}

module.exports = { importFlaws }