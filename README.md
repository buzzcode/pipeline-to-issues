# Import Veracode Static Analysis Pipeline Scan to GitHub Issues - GitHub Action

This action can be used in a workflow after a Veracode Static Analyis Pipeline Scan to take the results of the scan and import them into GitHub as Issues.

Typically this is done with the filtered results of the Pipeline Scan, see [Pipeline Scan commands](https://help.veracode.com/r/r_pipeline_scan_commands) .

---

## Inputs

### `pipeline-results-json`

**Required** The path to the pipeline json results file (typically the filtered results).
|Default value |  `"filtered_results.json"`|
--- | ---

### `github-token`

**Required** GitHub token needed to access the repo.  Normally, when run in a Workflow, use the `{{ secrets.GITHUB-TOKEN }}` that is created by GitHub.  See [here](https://docs.github.com/en/actions/reference/authentication-in-a-workflow) for further information.

### `wait-time`

**Optional** GitHub (at least the free/public version) has a rate limiter to prevent a user from adding Issues too quickly.  This value is used to insert a small delay between each new issue created so as to not trip the rate limiter.  This value sets the number of seconds between each issue.  See [here](https://docs.github.com/en/rest/guides/best-practices-for-integrators#dealing-with-rate-limits) for additional informarion.
| Default value | `"2"` |
--- | ---

## Example usage

```yaml
# This first step is assumed to exist already existing step in your Workflow
- name: Run Veracode Pipeline Scanner
  id: pipeline scan
  uses: xxx
  with:
  	yyy
  	zzz
# This step will import the flaws from the previous step above
- name: Flaw importer action step
  id: import
  #uses: buzzcode/pipeline-to-issues@v0.0.1
  uses: buzzcode/pipeline-to-issues@main
  with:
    pipeline-results-json: 'test/results.json'
    github-token: ${{ secrets.GITHUB_TOKEN }}
 ```