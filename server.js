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

	//io.emit("to everyone");
	//socket.broadcast.emit("to everyone else");
	//io.sockets.connected[id].emit("to one client", socket.id);

	socket.on("signin", function(name) {
		//console.log("sign in", socket.id);
		//console.log(name, socket);
		RPG.users[socket.id] = {
			name: name || "Anonymous"
		};
		io.emit("users", RPG.users);
	});
	socket.on("invite", function(id) {
		//console.log("invite", id);
		if(io.sockets.connected[id]) {
			io.sockets.connected[id].emit("invite", socket.id);
		}
	});
	socket.on("accept", function(id) {
		//console.log("accept", id);
		if(RPG.users[id]) {
			delete RPG.users[id];
		}
		if(RPG.users[socket.id]) {
			delete RPG.users[socket.id];
		}
		if(io.sockets.connected[id]) {
			io.sockets.connected[id].emit("accept", socket.id);
		}
		io.emit("users", RPG.users);
	});
	socket.on("reject", function(id) {
		//console.log("reject", id);
		if(io.sockets.connected[id]) {
			io.sockets.connected[id].emit("reject", socket.id);
		}
	});

	socket.on("pages", function(data) {
		data = data || {};
		//console.log("pages from", data.id);
		if(data.id && io.sockets.connected[data.id]) {
			io.sockets.connected[data.id].emit("pages", data.pages);
		}
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
