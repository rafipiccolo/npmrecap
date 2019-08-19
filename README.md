# Description

This module gives a recapitulative of the installed modules of a project and simplifies auditing and updating.

Internally it executes :
- "npm audit --json"
- "npm outdated --json"
- "https://packagephobia.now.sh/ on each module of your package.json"


# Run

Go into a node project and type the following :

	$> npm install -g npmrecap
	$> npmrecap

if u want to install it locally :

	$> npm install -D npmrecap
	$> npm run npmrecap

If u dont want to install it you can start it directly with :

	$> npx npmrecap

# Options

	$> node index.js --help
	Options:
	  --version   Show version number                                      [boolean]
	  --help      Show help                                                [boolean]
	  --reporter  choose a format to display result
	                                     [choices: "json", "text"] [default: "text"]

# Sample output

this command will give something like the following

	$> node index.js
		┌──────────────┬─────────┬─────────────────┬──────────┐
		│ package      │ size    │ vulnerabilities │ outdated │
		├──────────────┼─────────┼─────────────────┼──────────┤
		│ TOTAL        │ 6.02 MB │                 │          │
		├──────────────┼─────────┼─────────────────┼──────────┤
		│ async        │ 694 kB  │                 │          │
		├──────────────┼─────────┼─────────────────┼──────────┤
		│ cli-table    │ 127 kB  │                 │          │
		├──────────────┼─────────┼─────────────────┼──────────┤
		│ pretty-bytes │ 8.66 kB │                 │          │
		├──────────────┼─────────┼─────────────────┼──────────┤
		│ request      │ 4.68 MB │                 │          │
		├──────────────┼─────────┼─────────────────┼──────────┤
		│ yargs        │ 513 kB  │                 │          │
		└──────────────┴─────────┴─────────────────┴──────────┘


Alternatively u can get a json output

	$> node index.js --reporter=json
	{
	    "dependencies": {
	        "async": {
	            "size": 694474
	        },
	        "cli-table": {
	            "size": 126628
	        },
	        "pretty-bytes": {
	            "size": 8656
	        },
	        "request": {
	            "size": 4680047
	        },
	        "yargs": {
	            "size": 512825
	        }
	    },
	    "size": 6022630,
	    "audit": 0
	}
	

