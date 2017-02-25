var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);

var RPG = {
	users: {}
};

app.get("*", function(req, res) {
	if(req.url.indexOf("/.") >= 0) {
		res.send("nope.");
	} else {
		res.sendFile(__dirname + req.url);
	}
});

io.on("connection", function(socket) {
	//console.log("someone's here");
	io.emit("users", RPG.users);

	//socket.broadcast.emit("to everyone else");
	//io.emit("to everyone");

	socket.on("signin", function(name) {
		console.log(name, socket);
		RPG.users[socket.id] = {
			name: name || "Anonymous",
			ip: "0.0.0.0"
		};
		io.emit("users", RPG.users);
	});
	socket.on("request", function(data) {
		console.log(data);
	});
	socket.on("addpage", function(data) {
	});

	socket.on("disconnect", function() {
		//console.log("someone left");
		if(RPG.users[socket.id]) {
			delete RPG.users[socket.id];
		}
		io.emit("users", RPG.users);
	});
});

http.listen(1139, function() {
	console.log("listening on *:1139");
});
