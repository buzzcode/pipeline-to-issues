//
// entry point when called via CLI (mostly for testing)
//

const  program  = require('commander');
const dotenv = require('dotenv');
const importFlaws = require('./importer').importFlaws;

dotenv.config();
var githubOwner = process.env.GITHUB_OWNER;
var githubRepo = process.env.GITHUB_REPO;
var githubToken = process.env.GITHUB_TOKEN;

program
    .version('0.0.1')
    .requiredOption('-r, --results <path>', 'Pipeline Scan results file to create issues from', 'filtered_results.json')
    .option('-go, --github-owner <string>', 'GitHub owner name')
    .option('-gr, --github-repo <string>', 'GitHub repo name')
    .option('-t, --token <string>', 'GitHub auth token')
    .parse()

try {
    let opts = program.opts();

    // cmd-line opts override env vars
    if(opts.githubOwner !== undefined)
        githubOwner = opts.githubOwner;
    if(opts.githubRepo !== undefined)
        githubRepo = opts.githubRepo;
    if(opts.githubToken !== undefined)
        githubTOken = opts.githubToken;

    // do the thing
    importFlaws(
        {resultsFile: opts['results'],
         githubOwner: githubOwner,
         githubRepo: githubRepo,
         githubToken: githubToken}
    )
} catch (error) {
    console.error(error.message);
}

