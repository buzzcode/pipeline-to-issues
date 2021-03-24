//
// do the work of actually importing the flaws
// 

const fs = require('fs');
const { request } = require('@octokit/request');
const processPipelineFlaws = require('./pipeline').processPipelineFlaws;
const label = require('./label');
const util = require('./util');

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

    // figure out which file type we're dealing with, pipeline or policy
    let scanType = '';
    if('pipeline_scan' in flawData)
        scanType = 'pipeline';
    else if('_embedded' in flawData)
        scanType = 'policy';
    else 
        throw new Error ('Unknown file type for input file');

    console.log(`Importing ${scanType} flaws into  ${githubOwner}/${githubRepo}.  ${waitTime} seconds between imports (to handle GitHub rate limiting)`);

    // create the labels 
    await label.createLabels(options)

    label.buildSeverityXref();          // TODO: cleanup, merge into label init?

    // process the flaws
    if(scanType == 'pipeline') {
        await processPipelineFlaws(options, flawData)
        .then (count => {
            console.log(`Done.  ${count} flaws processed.`);
        })
    } else {
        await processPolicyFlaws(options, flawData)
        .then (count => {
            console.log(`Done.  ${count} flaws processed.`);
        })
    }
}

module.exports = { importFlaws };