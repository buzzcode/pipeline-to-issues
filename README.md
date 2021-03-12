# Import Veracode Static Analysis Pipeline Scan to GitHub Issues - GitHub Action

This action can be used in a workflow after a Veracode Static Analysis Pipeline Scan to take the results of the scan and import them into GitHub as Issues.

Typically this is done with the filtered results of the Pipeline Scan, see [Pipeline Scan commands](https://help.veracode.com/r/r_pipeline_scan_commands) .

Note that when Issues are added, a tag is inserted into the Issue title.  The tag is of the form `[VID:<cwe>:<file>:<line>]`.  This tag is used to prevent duplicate issues from getting created.  There is some very simple matching of same file, same CWE, +/- 10 lines that will get resolved as the same issue.

---

## Inputs

### `pipeline-results-json`

**Required** The path to the pipeline results file in JSON format (typically the filtered results).
|Default value |  `"filtered_results.json"`|
--- | ---

### `github-token`

**Required** GitHub token needed to access the repo.  Normally, when run in a Workflow, use the `{{ secrets.GITHUB-TOKEN }}` that is created by GitHub.  See [here](https://docs.github.com/en/actions/reference/authentication-in-a-workflow) for further information.

### `wait-time`

**Optional** GitHub (at least the free/public version) has a rate limiter to prevent a user from adding Issues too quickly.  This value is used to insert a small delay between each new issue created so as to not trip the rate limiter.  This value sets the number of seconds between each issue.  See [here](https://docs.github.com/en/rest/guides/best-practices-for-integrators#dealing-with-rate-limits) for additional information.
| Default value | `"2"` |
--- | ---

## Example usage

```yaml
  . . . 
# This first step is assumed to exist already in your Workflow
scan:
    runs-on: ubuntu-latest
    container: 
      image: veracode/pipeline-scan:latest
      options: --user root
    steps:
      - name: get archive
        uses: actions/download-artifact@v2
        with:
          name: scan-target
          path: /tmp

      - name: scan
        run: |
          java -jar /opt/veracode/pipeline-scan.jar \
              -vid ${{ secrets.VERACODE_API_ID }}   \
              -vkey ${{ secrets.VERACODE_API_KEY }} \
              --file /tmp/upload.zip                \
              --fail_on_severity="Very High,High"   \
        continue-on-error: true

      - name: save filtered results file
        uses: actions/upload-artifact@v2
        with:
          name: filtered-results
          path: filtered_results.json
  	
# This step will import the flaws from the previous step above
  import-issues:
    needs: scan
    runs-on: ubuntu-latest
    steps:
      - name: get scan results
        uses: actions/download-artifact@v2
        with:
          name: filtered-results

      - name: import flaws as issues
        uses: buzzcode/pipeline-to-issues@main
        # uses: buzzcode/pipeline-to-issues@v1
        with:
          pipeline-results-json: 'filtered_results.json'
          github-token: ${{ secrets.GITHUB_TOKEN }}
 ```