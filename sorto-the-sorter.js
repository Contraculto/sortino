//	SORTO THE SORTER
//	Sort images in directories
//	Rodrigo Lanas
//	rodrigo@contraculto.com

//	CONFIGURACION

//	Settings Mac
var source_dir = '/Users/rod/Dropbox/Fotos/i2/';
var target_dir = '/Users/rod/Dropbox/Fotos/Sorto/';
var destinations = {};
destinations.memes = {name: 'Meme', dir: 'Memes'};
destinations.tumblr = {name: 'Tumblr', dir: 'Tumblr'};
destinations.twitter = {name: 'Twitter', dir: 'Twitter'};
destinations.facebook = {name: 'Facebook', dir: 'Facebook'};
destinations.forchan = {name: '4chan', dir: '4chan'};
destinations.porno = {name: 'Porno', dir: 'Porno'};
destinations.gifs = {name: 'GIF', dir: 'GIFs'};
destinations.fondos = {name: 'Fondos', dir: 'Fondos'};
destinations.otros = {name: 'Otros', dir: 'General'};
destinations.basura = {name: 'Basura', dir: 'Basura'}
destinations.personal = {name: 'Personal', dir: 'Personal'};

//	Setting Linux
//var source_dir = '/home/rod/Dropbox/Fotos/Internet/';
/*var source_dir = '/home/rod/Dropbox/Fotos/Sorto/Memes_o/';
var target_dir = '/home/rod/Dropbox/Fotos/Sorto/';

destinations.memes = {name: 'Meme', dir: 'Memes'};
destinations.tumblr = {name: 'Tumblr', dir: 'Tumblr'};
destinations.twitter = {name: 'Twitter', dir: 'Twitter'};
destinations.facebook = {name: 'Facebook', dir: 'Facebook'};
destinations.forchan = {name: '4chan', dir: '4chan'};
destinations.porno = {name: 'Porno', dir: 'Porno'};
destinations.gifs = {name: 'GIF', dir: 'GIFs'};
destinations.fondos = {name: 'Fondos', dir: 'Fondos'};
destinations.otros = {name: 'Otros', dir: 'General'};
destinations.basura = {name: 'Basura', dir: 'Basura'};
destinations.personal = {name: 'Personal', dir: 'Personal'};
*/

//	NECESIDADES BASICAS

var fs = require('fs');
var _ = require('underscore');
var http = require('http');
var dispatcher = require('httpdispatcher');

//	MOVER ARCHIVO

function moveFile(img, dir) {
	fs.renameSync(source_dir+img, target_dir+dir+'/'+img, function(e) {
		if ( e ) {
			return false;
		} else {
			console.log('OK');
			return true;
		}
	});
}

// Armar la página base y mostrar foto + menú

dispatcher.onGet("/", function(req, res) {
	res.writeHead(200, {'Content-Type': 'text/html'});
	var files = fs.readdirSync(source_dir);
	fs.readFile(source_dir+files[0], (e, data) => {

		if (e) throw e;

		var html_head = `
		<html>
			<head>
				<title>Sorto</title>
			</head>
			<body>`;
		var html_foot= `
				<style>
					#command{position:fixed;left:10px;top:10px;padding:10px;background:rgba(0, 0, 0, 0.5)}
					#command a{margin:10px;color:#fff;font-weight:bold;text-decoration:none}
					img{margin:50px 0 0 10px}
				</style>
				<script src="https://code.jquery.com/jquery-3.0.0.min.js" integrity="sha256-JmvOoLtYsmqlsWxa7mDSLMwa6dZ9rrIdtrrVYRnDRH0=" crossorigin="anonymous"></script>
				<script>
					$("a").on("click", function() {
						console.log("click");
						var data = {img: $('#img').data('img'), dir: $(this).data("dir")}
						$.post("/move", data, function(res) {
							console.log(res);
							$("#img").replaceWith(res);
						});
					});
				</script>
			</body>
		</html>`;

	var html_control = '<div id="command">';
	console.log(destinations);
	_.each(destinations, function(dest) {html_control += '<a href="javascript:void(0);" data-dir="'+dest.dir+'">'+dest.name+'</a>';})
		html_control += '</div>';

		var content = '<img id="img" data-img="'+files[0]+'" src="data:img/jpg;base64,'+data.toString('base64')+'" alt="Sorto" />';

		res.end(html_head+content+html_control+html_foot);
	});
});    

//	Recibe el post, mueve la foto y envía como respuesta otra. (Base 64)

dispatcher.onPost("/move", function(req, res) {
	if ( req.params ) {
		console.log('Moviendo '+req.params.img+' a '+req.params.dir+'...');
		
		fs.access(target_dir+req.params.dir, fs.F_OK, function(err) {
		if (!err) {
			moveFile(req.params.img, req.params.dir);
		
				var files = fs.readdirSync(source_dir);
				fs.readFile(source_dir+files[0], (e, data) => {
					console.log('> '+files[0])
					res.end('<img id="img" data-img="'+files[0]+'" src="data:img/jpg;base64,'+data.toString('base64')+'" alt="Sorto" />');
				});
		} else {
			fs.mkdir(target_dir+req.params.dir, function(e) {
				if ( e ) {
				console.log('no se puede crear el dir');
				console.log(e);
				} else {
					if ( moveFile(req.params.img, req.params.dir) ) {
		
				var files = fs.readdirSync(source_dir);
				fs.readFile(source_dir+files[0], (e, data) => {
					console.log('> '+files[0])
					res.end('<img id="img" data-img="'+files[0]+'" src="data:img/jpg;base64,'+data.toString('base64')+'" alt="Sorto" />');
				});
			} else {
				console.log('no se mueve');
			}
				}
			});
		}
});

	} else {
		console.log('Move: No hay datos');
	}
});


//	CREAR UN SERVIDOR LOCAL

//	Dispatcher
function handleRequest(request, response) {
    try {
        dispatcher.dispatch(request, response);
    } catch(e) {
        console.log(e);
    }
}

//	Server
var server = http.createServer(handleRequest);
server.listen(8080, function() {
    console.log("Sorto the sorter reporting for duty!");
});
