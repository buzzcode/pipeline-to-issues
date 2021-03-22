




const flawLabels = [
    {
        'name': 'VeracodeFlaw: Very High',
        'color': 'd92b85',
        'description': 'A Veracode Flaw, Very High severity',
        'severity': 5
    },
    {
        'name': 'VeracodeFlaw: High',
        'color': 'e61f25',
        'description': 'A Veracode Flaw, High severity',
        'severity': 4
    },
    {
        'name': 'VeracodeFlaw: Medium',
        'color': 'fd7333',
        'description': 'A Veracode Flaw, Medium severity',
        'severity': 3
    },
    {
        'name': 'VeracodeFlaw: Low',
        'color': 'ffcc33',
        'description': 'A Veracode Flaw, Low severity',
        'severity': 2
    },
    {
        'name': 'VeracodeFlaw: Very Low',
        'color': 'c9da2c',
        'description': 'A Veracode Flaw, Very Low severity',
        'severity': 1
    },
    {
        'name': 'VeracodeFlaw: Informational',
        'color': '8dbd3e',
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
        console.log(`Getting list of existing \"${element.name}\" issues`);

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