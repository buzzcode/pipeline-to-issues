//
// entry point when called via CLI (mostly for testing)
//

const  program  = require('commander');
const importFlaws = require('./importer').importFlaws;

program
    .version('0.0.1')
    .requiredOption('-r, --results <path>', 'Pipeline Scan results file to create issues from', 'results.json')
    .parse(process.argv)

try {
    let opts = program.opts();
    importFlaws({
        resultsFile: opts['results']
    })
} catch (error) {
    console.error(error.message);
}
