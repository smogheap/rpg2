RPG = {
	canvas: null,
	ctx: null,
	gpx: null,
	sfx: null,
	player1: {
		name: "",
		id: "",
		local: false
	},
	player2: {
		name: "",
		id: "",
		local: false
	},
	input: {
		pointer: {
			x: -1,
			y: -1
		}
	},
	p: [],
	addstamp: {},
	story: {
		title: "",
		scene: {
			seed: 1,
			color1: "#000000",
			color2: "#888888",
			stamps: []  // { shape: idx, x: x, y: y }, { p } ...
		},
		pages:[
			/*
			{
				stamps: [],
				plot: "",
				awesome: false,
				theend: false
			}
			*/
		]
	},

	socket: null,
	online: false,
	partner: "local",
	wait: false,
	lobby: {}
};

// crappy, predictable, seedable RNG
// adapted from https://github.com/smogheap/solitaire-enyo1
WRand = function() {
	return WRand.LCRand();
};
WRand.LCRand = function() {
	var seed = WRand.getSeed();
	seed = seed * 214013 + 2531011;
	seed = seed & 4294967295;
	var r = ((seed >> 16) & 32767);
	WRand.seed = seed;
	return r;
};
WRand.setSeed = function(seed) {
	seed = seed % 32000;
	seed = Math.max(seed, -seed);
	WRand.seed = seed;
};
WRand.getSeed = function() {
	return (WRand.seed || (new Date()).getTime());
};

function pad(num, len, base) {
	base = base || 10;
	var str = num.toString(base);
	while(str.length < len) {
		str = "0" + str;
	}
	return str;
}

function randomcolor(intensity) {
	var r, g, b, t;
	var str;
	r = Math.random() * intensity;
	g = Math.random() * (intensity - r);
	b = intensity - r - g;
	if(Math.random() < 0.333) {
		t = g;
		g = r;
		r = t;
	}
	if(Math.random() < 0.333) {
		t = b;
		b = g;
		g = t;
	}
	if(Math.random() < 0.333) {
		t = r;
		r = b;
		b = t;
	}
	return [
		"#",
		pad(Math.floor((r * 255)).toString(16), 2, 16),
		pad(Math.floor((g * 255)).toString(16), 2, 16),
		pad(Math.floor((b * 255)).toString(16), 2, 16)
	].join("");
}

function jaggy(ctx) {
	//ctx.mozImageSmoothingEnabled = false;
	ctx.webkitImageSmoothingEnabled = false;
	ctx.msImageSmoothingEnabled = false;
	ctx.imageSmoothingEnabled = false;
}
function empty(element) {
	while(element.firstChild) {
		element.removeChild(element.firstChild);
	}
}
function serialize(key, val) {
	if(key.indexOf("canvas") >= 0) {
		return undefined;
	}
	return val;
}
function clone(obj) {
	return JSON.parse(JSON.stringify(obj, serialize));
}

function generate() {
	var p = {
		name: "",
		color: {},
		shape: [],
		x: 0,
		y: 0
	};
	p.color.r = Math.random();
	p.color.g = Math.random();
	p.color.b = Math.random();
	while(p.color.r + p.color.g + p.color.b < 1) {
		switch(Math.floor(Math.random() * 3)) {
		case 0:
			p.color.r = 1 - p.color.r;
			break;
		case 0:
			p.color.g = 1 - p.color.g;
			break;
		default:
			p.color.b = 1 - p.color.b;
			break;
		}
	}
	for(i = 0; i < 4; ++i) {
		// note 127 instead of 255 to leave a gap at the bottom
		p.shape.push(Math.floor(Math.random() * 127) + 1);
	}

	return p;
}
function draw(ctx, p, x, y) {
	var i, j;
	var pctx;
	if(typeof x === "undefined") {
		x = p.x || 0;
	}
	if(typeof y === "undefined") {
		y = p.y || 0;
	}
	ctx.save();
	if(!p.canvas) {
		p.canvas = document.createElement("canvas");
		p.canvas.width = p.canvas.height = 8;
		pctx = p.canvas.getContext("2d");
		jaggy(pctx);
		pctx.fillStyle = [
			"rgb(",
			Math.floor(p.color.r * 255), ",",
			Math.floor(p.color.g * 255), ",",
			Math.floor(p.color.b * 255),
			")"
		].join("");
		p.shape.every(function(slice, i) {
			for(j = 0; j < 8; ++j) {
				if(slice & Math.pow(2, j)) {
					pctx.fillRect(i, j, 1, 1);
					// note 6 to squish the middle 2 cols into 1
					pctx.fillRect(6 - i, j, 1, 1);
				}
			}
			return true;
		});
	}

	ctx.drawImage(p.canvas, 0, 0, 8, 8,
				  x, y, 8, 8);

	ctx.restore();
}

function setting(targetCtx, scene, offX, offY, w, h) {
	targetCtx = targetCtx || RPG.ctx;
	scene = scene || RPG.story.scene;
	offX = offX || 0;
	offY = offY || 0;
	w = w || targetCtx.canvas.width;
	h = h || targetCtx.canvas.height;
	var canv = document.createElement("canvas");
	var ctx = canv.getContext("2d");
	canv.width = 10;
	canv.height = 10;
	//FIXME: transmit seed per page
	WRand.setSeed(scene.seed);
	ctx.fillStyle = scene.color1;
	ctx.fillRect(0, 0, canv.width, canv.height);
	ctx.fillStyle = scene.color2;
	for(var y = 0; y < canv.height; ++y) {
		for(var x = 0; x < canv.width; ++x) {
			ctx.globalAlpha = (WRand() % 100) / 100;
			ctx.fillRect(x, y, 1, 1);
		}
	}
	var scanv = document.createElement("canvas");
	var sctx = scanv.getContext("2d");
	scanv.width = w;
	scanv.height = h;
	sctx.drawImage(canv, 0, 0,
				   canv.width, canv.height,
				   0, 0,
				   sctx.canvas.width,
				   sctx.canvas.height);
	targetCtx.drawImage(scanv, 0, 0,
						scanv.width, scanv.height,
						offX, offY, w, h);
}

function render(ctx, page) {
	ctx = ctx || RPG.ctx;
	page = page || RPG.story;
//		ctx.drawImage(RPG.gpx, x * 8, 0, 8, 8,
//					  0, 0, 8, 8);
	var offsX = 0;
	if(ctx.canvas.classList.contains("scene")) {
		offsX = 16;
		// menus
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, 16, ctx.canvas.height);
		ctx.fillRect(ctx.canvas.width - 16, 0, 16, ctx.canvas.height);
		RPG.p.every(function(c, idx) {
			draw(ctx, c, (idx * 8) % 16, Math.floor(idx / 2) * 8);
			return true;
		});
		for(var i = 0; i < RPG.gpx.width / 8; ++i) {
			// note 15 to scoot 'em over one pixel
			ctx.drawImage(RPG.gpx, i * 8, 0, 8, 8,
						  ctx.canvas.width - 15 + ((i * 8) % 16),
						  Math.floor(i / 2) * 8, 8, 8);
		}
		setting(ctx, page.scene,
				offsX, 0, ctx.canvas.width - 32, ctx.canvas.height);
	} else {
		setting(ctx, page.scene);
	}

	page.scene.stamps.every(function(s) {
		if(typeof s.idx === "number") {  // it's a stamp
			ctx.drawImage(RPG.gpx, s.idx * 8, 0, 8, 8,
						  s.x + offsX, s.y, 8, 8);
		} else if(s.shape) {  // it's a pixon character
			draw(ctx, s, s.x + offsX, s.y);
		}
		return true;
	});
}

function renderpages(skiptidy) {
	var cont = document.querySelector("#pages");
	empty(cont);
	var span = document.createElement("span");
	var h3 = document.createElement("h3");
	var title = RPG.story.title || "Untitled Story";
	h3.appendChild(document.createTextNode(title));
	span.className = "byline";
	span.appendChild(document.createTextNode([
		"by ", (RPG.player1.name || "Anonymous"),
		" and ", (RPG.player2.name || "Anonymous")
	].join("")));
	h3.appendChild(span);
	cont.appendChild(h3);
	var div;
	var canv;
	var end = false;
	RPG.story.pages.every(function(page) {
		div = document.createElement("div");
		div.classList.add("page");
		if(page.awesome) {
			div.classList.add("awesome");
		}
		canv = document.createElement("canvas");
		canv.width = RPG.H;
		canv.height = RPG.H;
		jaggy(canv);
		render(canv.getContext("2d"), page);
		div.appendChild(canv);
		span = document.createElement("span");
		page.plot.split("\n").every(function(paragraph, idx) {
			if(idx) {
				span.appendChild(document.createElement("br"));
			}
			span.appendChild(document.createTextNode(paragraph));
			return true;
		});
		div.appendChild(span);
		div.appendChild(document.createElement("div")); //clear
		cont.appendChild(div);
		if(page.theend) {
			end = true;
			RPG.wait = false;
		}
		return true;
	});
	cont.appendChild(document.createElement("div"));
	if(end) {
		h3 = document.createElement("h3");
		h3.appendChild(document.createTextNode("THE END"));
		cont.appendChild(h3);
	}
	if(!skiptidy) {
		tidy();
	}
}

function tidy() {
	document.querySelector("#awesome").checked = false;

	var ins = document.querySelectorAll("input");
	for(var i = ins.length - 1; i >= 0; --i) {
		if(["radio", "color"].indexOf(ins[i].type) < 0 &&
		   ["localplayer", "localplayer2"].indexOf(ins[i].id < 0)) {
			ins[i].value = "";
		}
	}
	document.querySelector("#title").value = RPG.story.title;
	ins = document.querySelectorAll("textarea");
	for(var i = ins.length - 1; i >= 0; --i) {
		ins[i].value = "";
	}
	document.querySelector("#chanceodds").selectedIndex = 4;

	var chunks = ["T", "H", "E", " E", "N", "D"];
	var awe = document.querySelectorAll("#pages .page.awesome").length + 1;
	awe = Math.min(awe, chunks.length);
	awe = Math.max(awe, 1);
	var split = chunks.splice(awe);
	var theend = document.querySelector("#theend");
	empty(theend);
	var span;
	span = document.createElement("span");
	span.className = "prog";
	span.appendChild(document.createTextNode(chunks.join("")));
	theend.appendChild(span);
	span = document.createElement("span");
	span.className = "ress";
	span.appendChild(document.createTextNode(split.join("")));
	theend.appendChild(span);
	var check = document.querySelector("#endcheck");
	check.checked = false;
	document.querySelector("#endcheck").disabled = !!split.length;

	if(RPG.story.pages.length) {
		if(RPG.story.pages[RPG.story.pages.length - 1].theend) {
			document.querySelector("#tools").classList.toggle("hidden", true);
			document.querySelector("#write").classList.toggle("hidden", true);
			document.querySelector("#done").classList.toggle("hidden", false);
		} else {
			document.querySelector("#tools").classList.toggle("hidden", RPG.wait);
			document.querySelector("#write").classList.toggle("hidden", RPG.wait);
			document.querySelector("#done").classList.toggle("hidden", true);
		}
	} else {
		document.querySelector("#tools").classList.toggle("hidden", true);
		document.querySelector("#write").classList.toggle("hidden", RPG.wait);
		document.querySelector("#done").classList.toggle("hidden", true);
	}
	document.querySelector("#wait").classList.toggle("hidden", !RPG.wait);

	var dl = document.querySelector("#download");
	if(btoa) {
		var text = [];
		text.push([
			(RPG.story.title || "Untitled Story").toUpperCase(),
			"  by ", (RPG.player1.name || "Anonymous"),
			" and ", (RPG.player2.name || "Anonymous"),
		].join(""));
		var line = "-";
		while(line.length < text[0].length) {
			line = line + "-";
		}
		text.push(line);
		text.push("", "");
		RPG.story.pages.every(function(page) {
			text.push(page.plot);
			text.push("", "");
			return true;
		});
		text.push("THE END", "");
		dl.download = (RPG.story.title || "Untitled Story") + ".txt";
		dl.classList.toggle("hidden", false);
		dl.href = "data:text/plain;base64," + btoa(text.join("\n"));
	}
}

function calcX(e) {
	var x = e.clientX;
	var elm = e.target
	while(elm && elm.offsetTop !== undefined) {
		x -= elm.offsetLeft;
		elm = elm.offsetParent;
	}
	x += document.scrollingElement.scrollLeft;
	return Math.floor(x / RPG.canvas.clientWidth * RPG.W);
};
function calcY(e) {
	var y = e.clientY;
	var elm = e.target
	while(elm && elm.offsetTop !== undefined) {
		y -= elm.offsetTop;
		elm = elm.offsetParent;
	}
	y += document.scrollingElement.scrollTop;
	return Math.floor(y / RPG.canvas.clientHeight * RPG.H);
};
function mousemove(e) {
	if(e.preventDefault) e.preventDefault();
	if(e.stopPropagation) e.stopPropagation();
	var touches = e.changedTouches;
	if(e.changedTouches && e.changedTouches.length) {
		e = e.changedTouches[0];
	}
	RPG.input.pointer.x = calcX(e);
	RPG.input.pointer.y = calcY(e);
	if(RPG.input.placeObj) {
		RPG.input.placeObj.x = RPG.input.pointer.x - 4 - 16;
		RPG.input.placeObj.y = RPG.input.pointer.y - 4;
	}
	render();
	return false;
}
function mouseout(e) {
	var touches = e.changedTouches;
	if(e.changedTouches && e.changedTouches.length) {
		e = e.changedTouches[0];
	}
	if(RPG.input.placeObj) {
		RPG.story.scene.stamps = RPG.story.scene.stamps.filter(function(item) {
			return (item !== RPG.input.placeObj);
		});
	}
	RPG.input.placeObj = null;
	render();
}
function mousedown(e) {
	var touches = e.changedTouches;
	if(e.changedTouches && e.changedTouches.length) {
		e = e.changedTouches[0];
	}
	mousemove(e);
	var which;
	if(RPG.input.pointer.x < 16) {
		which = (Math.floor(RPG.input.pointer.y / 8) * 2) + Math.floor(RPG.input.pointer.x / 8);
		RPG.input.placeObj = clone(RPG.p[which]);
	} else if(RPG.input.pointer.x > RPG.W - 16) {
		which = (Math.floor(RPG.input.pointer.y / 8) * 2) + Math.floor((RPG.input.pointer.x - (RPG.W - 16)) / 8);
		RPG.input.placeObj = {
			idx: which,
			x: RPG.input.pointer.x,
			y: RPG.input.pointer.y
		};
	}
	if(RPG.input.placeObj) {
		RPG.story.scene.stamps.push(RPG.input.placeObj);
	} else {
		RPG.story.scene.stamps.every(function(stamp) {
			if(RPG.input.pointer.x - 16 >= stamp.x && RPG.input.pointer.x - 16 <= stamp.x + 8 &&
			   RPG.input.pointer.y >= stamp.y && RPG.input.pointer.y <= stamp.y + 8) {
				RPG.input.placeObj = stamp;
			}
			return !RPG.input.placeObj;
		});
	}
	if(RPG.input.placeObj) {
		mousemove(e);
	}
	render();
}
function mouseup(e) {
	var touches = e.changedTouches;
	if(e.changedTouches && e.changedTouches.length) {
		e = e.changedTouches[0];
	}
	if(RPG.input.placeObj && (RPG.input.pointer.x < 16 ||
							  RPG.input.pointer.x > RPG.W - 16)) {
		mouseout(e);
	}
	RPG.input.placeObj = null;
	render();
}

function init() {
	RPG.canvas = document.querySelector("canvas.scene");
	RPG.ctx = RPG.canvas.getContext("2d");
	jaggy(RPG.ctx);
	RPG.W = RPG.canvas.width;
	RPG.H = RPG.canvas.height;
	RPG.gpx = document.querySelector("img");
	RPG.sfx = document.querySelector("audio");
	RPG.story.scene.seed = Math.floor(Math.random() * 32000);
	document.querySelector("#tools").classList.toggle("hidden", true);
	document.querySelector("#write").classList.toggle("hidden", false);
	RPG.p = [];
	while(RPG.p.length < 16) {
		RPG.p.push(generate());
	}

	RPG.online = false;
	RPG.wait = false;
	RPG.player1 = {
		name: "",
		id: "",
		local: false
	};
	RPG.player2 = {
		name: "",
		id: "",
		local: false
	};
	RPG.story = {
		title: "",
		scene: {
			seed: Math.floor(Math.random() * 32000) + 1,
			color1: "#000000",
			color2: "#888888",
			stamps: []
		},
		pages:[]
	};
	RPG.partner = "local";
	empty(document.querySelector("#online"));
	render();
	renderpages();
	document.querySelector("#room").classList.toggle("hidden", false);
	document.querySelector("#story").classList.toggle("hidden", true);
}

window.addEventListener("load", function() {
	// collapse/expand sections
	var h = document.querySelectorAll("h1, h2");
	for(var i = h.length - 1; i >= 0; --i) {
		h[i].addEventListener("click", function(e) {
			e.target.classList.toggle("collapse");
		});
	};

	init();

	// color pickers
	var col1 = document.querySelector("#bgcolor1");
	var col2 = document.querySelector("#bgcolor2")
	col1.value = RPG.story.scene.color1;
	col2.value = RPG.story.scene.color2;
	col1.addEventListener("change", function() {
		RPG.story.scene.color1 = this.value;
		render();
	});
	col2.addEventListener("change", function() {
		RPG.story.scene.color2 = this.value;
		render();
	});

	// bg roll buttons
	document.querySelector("#bgroll").addEventListener("click", function() {
		RPG.story.scene.seed = Math.floor(Math.random() * 32000) + 1;
		render();
	});
	document.querySelector("#colroll").addEventListener("click", function() {
		RPG.story.scene.color1 = randomcolor((Math.random() * 0.2) + 0.1);
		RPG.story.scene.color2 = randomcolor((Math.random() * 0.2) + 0.5);
		col1.value = RPG.story.scene.color1;
		col2.value = RPG.story.scene.color2;
		render();
	});

	// chance roller
	var chance = document.querySelector("#chanceroll");
	var result = document.querySelector("#chanceresult");
	var odds = document.querySelector("#chanceodds");
	odds.addEventListener("change", function() {
		empty(result);
	});
	chance.addEventListener("click", function() {
		empty(result);
		var str = ""
		//chance.disabled = true;
		if(Math.random() * 10 <= parseInt(odds.value, null)) {
			str = "-> Success";
		} else {
			str = "-> Failure";
		}
		result.appendChild(document.createTextNode(str));
	});

	RPG.canvas.addEventListener("selectstart", function(e) {
		e.preventDefault();
		e.stopPropagation();
		return false;
	});
	RPG.canvas.addEventListener("mousemove", mousemove);
	RPG.canvas.addEventListener("mouseout", mouseout);
	RPG.canvas.addEventListener("mousedown", mousedown);
	RPG.canvas.addEventListener("mouseup", mouseup);

	RPG.canvas.addEventListener("touchstart", mousedown);
	RPG.canvas.addEventListener("touchmove", mousemove);
	RPG.canvas.addEventListener("touchend", mouseup);
	RPG.canvas.addEventListener("touchcancel", mouseout);
	RPG.canvas.addEventListener("touchleave", mouseout);

	// alarm test
	document.querySelector("#chime").addEventListener("click", function() {
		RPG.sfx.play();
	});

	// revert button
	document.querySelector("#revert").addEventListener("click", function() {
		if(!confirm("Revert all changes and start over on this page?")) {
			return;
		}
		if(RPG.story.pages.length) {
			RPG.story.scene = clone(RPG.story.pages[RPG.story.pages.length - 1].scene);
			RPG.story.title = RPG.story.pages[RPG.story.pages.length - 1].title || "";
			document.querySelector("#bgcolor1").value = RPG.story.scene.color1;
			document.querySelector("#bgcolor2").value = RPG.story.scene.color2;
			document.querySelector("#story").classList.toggle("hidden", false);
		}
		render();
		renderpages();
	});

	// page post
	document.querySelector("#title").addEventListener("change", function() {
		RPG.story.title = this.value;
		renderpages(true);
	});
	document.querySelector("#post").addEventListener("click", function() {
		if(document.querySelector("#awesome").checked) {
			RPG.story.pages[RPG.story.pages.length - 1].awesome = true;
		}
		var page = {
			title: RPG.story.title,
			scene: clone(RPG.story.scene),
			plot: document.querySelector("#plot").value,
			theend: document.querySelector("#endcheck").checked
		};
		RPG.story.pages.push(page);
		if(RPG.online && RPG.socket) {
			RPG.wait = true;
			RPG.socket.emit("pages", {
				id: RPG.partner,
				pages: clone(RPG.story.pages)
			});
		}
		renderpages();
	});

	// begin
	document.querySelector("#begin").addEventListener("click", function() {
		if(!RPG.socket || RPG.partner === "local") {
			document.querySelector("#room").classList.toggle("hidden", true);
			document.querySelector("#story").classList.toggle("hidden", false);
			renderpages();
			tidy();
		} else {
			RPG.socket.emit("invite", RPG.partner);
			RPG.player1.name = document.querySelector("#localplayer").value;
			RPG.player1.id = RPG.socket.id;
			document.querySelector("#room").classList.toggle("hidden", true);
			document.querySelector("#story").classList.toggle("hidden", true);
			empty(partner);
			var user = RPG.lobby[RPG.partner] || {name: "Anonymous"};
			partner.appendChild(document.createTextNode(user.name));
			RPG.wait = true;
			tidy();
		}
	});
	// restart
	document.querySelector("#restart").addEventListener("click", function(e) {
		e.preventDefault();
		e.stopPropagation();
		init();
		//window.location = window.location;
	});

	document.querySelector("#localradio").addEventListener("change", function() {
		RPG.partner = this.value;
	});
	document.querySelector("#localplayer").addEventListener("change", function() {
		RPG.player1.name = this.value;
		RPG.player1.local = true;
	});
	document.querySelector("#localplayer").addEventListener("keydown", function() {
		document.querySelector("#signin").disabled = false;
	});
	document.querySelector("#signin").addEventListener("click", function() {
		if(!RPG.socket) {
			return;
		}
		RPG.socket.emit("signin", document.querySelector("#localplayer").value);
		var text = document.createTextNode([
			"Signed in as: ",
			document.querySelector("#localplayer").value
		].join(""));
		empty(document.querySelector("#online"));
		document.querySelector("#online").appendChild(text);
	});
	document.querySelector("#localplayer2").addEventListener("change", function() {
		RPG.player2.name = this.value;
		RPG.player2.local = true;
	});

	/* networking */
	try {
		RPG.socket = io();
		document.querySelector("#signin").disabled = false;

		// list of users in the lobby updated
		RPG.socket.on("users", function(users) {
			RPG.lobby = users;
			var list = document.querySelector("#remoteusers");
			empty(list);
			var label;
			var radio;
			Object.keys(RPG.lobby).every(function(id) {
				if(id === RPG.socket.id) {
					// this is us, so we're signed in and don't need to list it
					document.querySelector("#signin").disabled = true;
					return true;
				}
				label = document.createElement("label");
				radio = document.createElement("input");
				radio.type = "radio";
				radio.name = "partner";
				radio.value = id || "error";
				radio.addEventListener("change", function() {
					RPG.partner = this.value;
				});
				label.appendChild(radio);
				label.appendChild(document.createTextNode(" "));
				label.appendChild(document.createTextNode(RPG.lobby[id].name ||
														  "Anonymous"));
				list.appendChild(label);
				return true;
			});
		});

		// other player asked us to join
		RPG.socket.on("invite", function(id) {
			var user = RPG.lobby[id] || {name: "Anonymous"};
			if(confirm("Would you like to join a game with '" + user.name + "'?")) {
				RPG.socket.emit("accept", id);
				RPG.partner = id;
				var partner = document.querySelector("#partner");
				empty(partner);
				partner.appendChild(document.createTextNode(user.name));
				RPG.player1.name = user.name;
				RPG.player1.id = id;
				RPG.player2.name = document.querySelector("#localplayer").value;
				RPG.player2.id = RPG.socket.id;
				RPG.online = true;
				RPG.wait = true;
				document.querySelector("#room").classList.toggle("hidden", true);
				document.querySelector("#story").classList.toggle("hidden", true);
				document.querySelector("#wait").classList.toggle("hidden", false);
				renderpages();
			} else {
				RPG.socket.emit("reject", id);
			}
		});

		// other player accepted our invitation
		RPG.socket.on("accept", function(id) {
			RPG.online = true;
			RPG.wait = false;
			var partner = document.querySelector("#partner");
			empty(partner);
			partner.appendChild(document.createTextNode(RPG.lobby[id].name));
			RPG.player2.name = RPG.lobby[id].name;
			RPG.player2.id = id;
			document.querySelector("#room").classList.toggle("hidden", true);
			document.querySelector("#story").classList.toggle("hidden", false);
			tidy();
		});

		// other player rejected our invitation
		RPG.socket.on("reject", function(id) {
			RPG.online = false;
			RPG.wait = false;
			if(id !== RPG.partner) {
				// someone's being naughty
				return;
			}
			document.querySelector("#room").classList.toggle("hidden", false);
			document.querySelector("#story").classList.toggle("hidden", true);
			var user = RPG.lobby[id] || {name: ""};
			alert("User " + user.name + " has declined your invitation.");
		});

		// update pages
		RPG.socket.on("pages", function(pages) {
			RPG.wait = !RPG.wait;
			RPG.story.pages = pages;
			if(pages.length) {
				RPG.story.scene = clone(pages[pages.length - 1].scene);
				document.querySelector("#bgcolor1").value = RPG.story.scene.color1;
				document.querySelector("#bgcolor2").value = RPG.story.scene.color2;
				document.querySelector("#title").value = RPG.story.title;
				document.querySelector("#story").classList.toggle("hidden", false);
			}
			render();
			renderpages();
			RPG.story.title = pages[pages.length - 1].title;
			document.querySelector("#title").value = RPG.story.title;
			if(document.querySelector("#alarm").checked) {
				RPG.sfx.play();
			}
		});
	} catch(e) {
		var status = document.querySelector("#status");
		empty(status);
		status.appendChild(document.createTextNode("Online play is unavailable."));
	}
});
