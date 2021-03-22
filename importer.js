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


function buildSeverityXref() {
    flawLabels.forEach( element => {
        severityXref.set(element.severity, element.name)
    })
}

function severityToLabel(sevNumber) {
    return severityXref.get(sevNumber);
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