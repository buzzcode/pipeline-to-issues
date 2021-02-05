const core = require('@actions/core');
const github = require('@actions/github');

try {
  // get input filename, and validate it
  const resultsFile = core.getInput('pipeline-results-json');
  console.log(`Processing file: ${resultsFile}`);

  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
 
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}