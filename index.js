#!/usr/bin/env node
//	Sortino
//	(SORTO THE SORTER)
//	Sort images in directories

//	Rodrigo Lanas
//	rodrigo@contraculto.com

//	BASIC NEEDS

var fs = require('fs')
var _ = require('underscore')
var readline = require('readline')
var http = require('http')
var HttpDispatcher = require('httpdispatcher')
var dispatcher = new HttpDispatcher();
var opn = require('opn')
const osHomedir = require('os-homedir')

var settings = {}

//	HTML

var html_head = `
	<html>
		<head>
			<title>Sortino - Image sorting</title>
		</head>
		<body>`

var html_foot= `
			<style>
				body{margin:10px;background:#fff;font-family:sans-serif}
				#command{margin-bottom:10px;padding:10px 10px 0 10px;background:#192B43}
				#command a{display:inline-block;margin:0 20px 10px 0;text-decoration:none;color:#fff}
				#command a:hover{text-decoration:underline}
				img{}
			</style>
			<script src="https://code.jquery.com/jquery-3.0.0.min.js" integrity="sha256-JmvOoLtYsmqlsWxa7mDSLMwa6dZ9rrIdtrrVYRnDRH0=" crossorigin="anonymous"></script>
			<script>
				$("a").on("click", function() {
					console.log("	_ Click");
					var data = {img: $('#img').data('img'), dir: $(this).data("dir")}
					$.post("/move", data, function(res) {
						console.log(res);
						$("#img").replaceWith(res);
					});
				});
			</script>
		</body>
	</html>`

//	MOVE FILE

function moveFile(img, dir) {
	fs.renameSync(settings.source + "/" + img, settings.dest + "/" + dir + "/" + img, function(e) {
		if ( e ) {
			return false
		} else {
			return true
		}
	});
}

//	Main page, image, navigation.

dispatcher.onGet("/", function(req, res) {
	res.writeHead(200, {'Content-Type': 'text/html'})
	var files = fs.readdirSync(settings.source)
	fs.readFile(settings.source + '/' + files[0], (e, data) => {
		if ( e ) throw e

		var html_control = '<div id="command">'
		var dest_folders = fs.readdir(settings.dest, function(err, folders) {
			_.each(folders, function(dest) {
				if ( fs.lstatSync(settings.dest + "/" + dest).isDirectory() ) {
					//console.log('<a href="javascript:void(0);" data-dir="' + dest + '">' + dest + '</a>')
					html_control += '<a href="javascript:void(0);" data-dir="' + dest + '">' + dest.replace(/_[0-9]+/, '') + '</a>'
				} else {
					//console.log('reg file')
				}
			})
			html_control += '</div>'
			var content = '<img id="img" data-img="' + files[0] + '" src="data:img/jpg;base64,' + data.toString('base64') + '" alt="' + files[0] + '" />';

			res.end(html_head + html_control + content + html_foot)
		})
	})

})    

//	Ajax. Receives post, returns base64 image.

dispatcher.onPost("/move", function(req, res) {
	if ( req.params ) {
		console.log("	_ " + req.params.img + " -> /" + req.params.dir)
		
		fs.access(settings.dest + "/" + req.params.dir, fs.F_OK, function(err) {

			if (!err) {
				moveFile(req.params.img, req.params.dir)
		
					var files = fs.readdirSync(settings.source)
					fs.readFile(settings.source + "/" + files[0], (e, data) => {
						console.log("\n	_ " + files[0])
						res.end('<img id="img" data-img="'+files[0]+'" src="data:img/jpg;base64,' + data.toString('base64') + '" alt="' + files[0] + '" />')
					})
			} else {
				fs.mkdir(settings.dest + '/' + req.params.dir, function(e) {
					if ( e ) {
						console.log("	_ Could not create directory")
						//console.log(e)
					} else {
						if ( moveFile(req.params.img, req.params.dir) ) {
			
							var files = fs.readdirSync(setting.source)
							fs.readFile(setting.source + files[0], (e, data) => {
								console.log("	> " + files[0])
								res.end('<img id="img" data-img="' + files[0] + '" src="data:img/jpg;base64,' + data.toString('base64') + '" alt="' + files[0] + '" />')
							});
						} else {
							console.log("	_ Could not move image")
						}
					}
				})
			}
		})
	} else {
		console.log('Move: No data')
	}
})

//	Extra method for HttpDispatcher. Matches GET and POST requests.

dispatcher.onGetPost = function(url, cb) {
	this.on('get', url, cb);
	this.on('post', url, cb);
}

//	SETTINGS page

dispatcher.onGetPost("/settings", function(req, res) {

	if ( req.method == "POST" ) {
		if ( req.params && typeof req.params.port != "undefined" && req.params.port != "" && typeof req.params.source != "undefined" && req.params.source != "" && typeof req.params.dest != "undefined" && req.params.dest != "" ) {
			fs.writeFile("settings", req.params.port + "\n" + req.params.source + "\n" + req.params.dest, function(err) {
				settings.port = req.params.port
				settings.source = req.params.source
				settings.dest = req.params.dest
				console.log("\n	_ Settings saved\n");
				//opn("http://localhost:" + req.params.source);
			})
		}
	}

	var content = `
					<style>
						body{margin:10px;background:#fff;font-family:sans-serif}
						input{border:1px solid silver;padding:5px;width:300px}
					</style>
					<form method="post" target="">
						<h2>Sortino Settings</h2>
						<p>
							<label for="port">Port</label><br>
							<input type="text" name="port" id="port" value="` + settings.port + `">
						</p>
						<p>
							<label for="source">Source dir</label><br>
							<input type="text" name="source" id="source" value="` + settings.source + `">
						</p>
						<p>
							<label for="dest">Destination dir</label><br>
							<input type="text" name="dest" id="dest" value="` + settings.dest + `">
						</p>
						<p>
							<input type="submit" value="Save">
						</p>
					</form>`
	res.end(html_head + content + html_foot);
})


//	CONSOLE MENU

function menu() {
	rl.question("\n	[1] SORT [2] Settings [3] Help [4] Exit\n        : ", (answer) => {
		if ( answer == "1" ) {
			//console.log("http://localhost:" + settings.port)
			opn("http://localhost:" + settings.port)
			menu()
		} else if ( answer == "2" ) {
			opn("http://localhost:" + settings.port + "/settings")
			menu()
		} else if ( answer == "3" ) {
			//console.log("\n	Sortino")
			//console.log("	This doesn't exist yet. Please refer to:")
			//console.log("	https://github.com/Contraculto/sortino")
			opn("https://github.com/Contraculto/sortino/blob/master/README.md")
			menu()
		} else if ( answer == "4" ) {
			console.log("\n	Good bye!")
			rl.close()
			process.exit()
		} else {
			console.log("\n	Invalid option")
			menu()
		}
	})
}

//	INIT TO WIN IT

//	*	Local webserver
function handleRequest(request, response) {
    try {
        dispatcher.dispatch(request, response);
    } catch(e) {
        console.log(e)
    }
}
var server = http.createServer(handleRequest);

//	*	Console
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

//	RUN THE PROGRAM

console.log()
console.log('	  ██████  ▒█████   ██▀███  ▄▄▄█████▓ ██▓ ███▄    █  ▒█████  ')
console.log('	▒██    ▒ ▒██▒  ██▒▓██ ▒ ██▒▓  ██▒ ▓▒▓██▒ ██ ▀█   █ ▒██▒  ██▒')
console.log('	░ ▓██▄   ▒██░  ██▒▓██ ░▄█ ▒▒ ▓██░ ▒░▒██▒▓██  ▀█ ██▒▒██░  ██▒')
console.log('	  ▒   ██▒▒██   ██░▒██▀▀█▄  ░ ▓██▓ ░ ░██░▓██▒  ▐▌██▒▒██   ██░')
console.log('	▒██████▒▒░ ████▓▒░░██▓ ▒██▒  ▒██▒ ░ ░██░▒██░   ▓██░░ ████▓▒░')
console.log('	▒ ▒▓▒ ▒ ░░ ▒░▒░▒░ ░ ▒▓ ░▒▓░  ▒ ░░   ░▓  ░ ▒░   ▒ ▒ ░ ▒░▒░▒░ ')
console.log('	░ ░▒  ░ ░  ░ ▒ ▒░   ░▒ ░ ▒░    ░     ▒ ░░ ░░   ░ ▒░  ░ ▒ ▒░ ')
console.log('	░  ░  ░  ░ ░ ░ ▒    ░░   ░   ░       ▒ ░   ░   ░ ░ ░ ░ ░ ▒  ')
console.log('	      ░      ░ ░     ░               ░           ░     ░ ░  ')

/*
console.log('')
console.log('	  ██████  ▒█████   ██▀███  ▄▄▄█████▓ ▒█████  ')
console.log('	▒██    ▒ ▒██▒  ██▒▓██ ▒ ██▒▓  ██▒ ▓▒▒██▒  ██▒')
console.log('	░ ▓██▄   ▒██░  ██▒▓██ ░▄█ ▒▒ ▓██░ ▒░▒██░  ██▒')
console.log('	  ▒   ██▒▒██   ██░▒██▀▀█▄  ░ ▓██▓ ░ ▒██   ██░')
console.log('	▒██████▒▒░ ████▓▒░░██▓ ▒██▒  ▒██▒ ░ ░ ████▓▒░')
console.log('	▒ ▒▓▒ ▒ ░░ ▒░▒░▒░ ░ ▒▓ ░▒▓░  ▒ ░░   ░ ▒░▒░▒░ ')
console.log('	░ ░▒  ░ ░  ░ ▒ ▒░   ░▒ ░ ▒░    ░      ░ ▒ ▒░ ')
console.log('	░  ░  ░  ░ ░ ░ ▒    ░░   ░   ░      ░ ░ ░ ▒  ')
console.log('	      ░      ░ ░     ░                  ░ ░  ')
//	http://patorjk.com/software/taag/#p=display&f=Bloody&t=Sorto
*/

console.log()
console.log()

fs.open("settings", "r+", function(err, fd) {
	if (err) {
		console.log();
		if ( typeof err.code != 'undefined' && err.code == 'ENOENT' ) {
			console.log("	Creating default settings file...");
			settings.port = "1234"
			settings.source = osHomedir() + "/Pictures/in"
			settings.dest = osHomedir() + "/Pictures/out"
			fs.writeFile("settings", settings.port + "\n" + settings.source + "\n" + settings.source, function(err) {
				console.log("	Settings file created, opening settings page");
				server.listen(settings.port, function() {
					opn("http://localhost:" + settings.port + "/settings");
					menu()
				})
			})
		} else {
			console.log("	Unexpected error, exiting.")
			console.log("	" + err)
			rl.close()
			process.exit()
		}
	} else {
		fs.stat("settings", function(error, stats) {
			var buffer = new Buffer(stats.size);
    	    fs.read(fd, buffer, 0, buffer.length, null, function(error, bytesRead, buffer) {
    			var data = buffer.toString("utf8", 0, buffer.length).split("\n");
	
    	    	//console.log(data);
    			settings.port = data[0]
				settings.source = data[1]
				settings.dest = data[2]
    			//fs.close(fd);
    			//console.log('	Settings loaded OK')
    			//console.log(settings.port)
				server.listen(settings.port, function() {
					console.log("	Listening on http://localhost:" + settings.port);
					console.log()
					//opn("http://localhost:" + settings.port)
		    		menu()
				});
			})
		})
	}
})

