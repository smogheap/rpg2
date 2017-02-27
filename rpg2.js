RPG = {
	canvas: null,
	ctx: null,
	gpx: null,
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
		place: false,
		placeObj: null,
		placeCB: null,
		pointer: {
			x: -1,
			y: -1
		}
	},
	p: {},
	addstamp: {},
	story: {
		title: "",
		scene: {
			seed: 1,
			color1: "#000000",
			color2: "#888888",
			characters: [],  // p, ...
			stamps: []  // { shape: idx, x: x, y: y }, ...
		},
		pages:[
			/*
			{
				characters: [],
				stamps: [],
				plot: "",
				awesome: false,
				theend: false
			}
			*/
		]
	},
	scrollBack: -1,
	sbHide: false,

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

function uniquename(str) {
	//TODO fixme
	return str;
}
function serialize(key, val) {
	if(key.indexOf("canvas") >= 0) {
		return undefined;
	}
	return val;
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
		p.shape.push(Math.floor(Math.random() * 255) + 1);
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
					pctx.fillRect(7 - i, j, 1, 1);
				}
			}
			return true;
		});
	}

	ctx.drawImage(p.canvas, 0, 0, 8, 8,
				  x, y, 8, 8);

	ctx.restore();
}

function setting(targetCtx) {
	targetCtx = targetCtx || RPG.ctx;
	var canv = document.createElement("canvas");
	var ctx = canv.getContext("2d");
//	jaggy(ctx);
	canv.width = 20;
	canv.height = 10;
	WRand.setSeed(RPG.story.scene.seed);
	ctx.fillStyle = RPG.story.scene.color1;
	ctx.fillRect(0, 0, canv.width, canv.height);
	ctx.fillStyle = RPG.story.scene.color2;
	for(var y = 0; y < canv.height; ++y) {
		for(var x = 0; x < canv.width; ++x) {
			ctx.globalAlpha = (WRand() % 100) / 100;
			ctx.fillRect(x, y, 1, 1);
		}
	}
	var scanv = document.createElement("canvas");
	var sctx = scanv.getContext("2d");
	scanv.width = targetCtx.canvas.width;
	scanv.height = targetCtx.canvas.height;
	sctx.drawImage(canv, 0, 0,
				   canv.width, canv.height,
				   0, 0,
				   sctx.canvas.width,
				   sctx.canvas.height);
	targetCtx.drawImage(scanv, 0, 0,
						scanv.width, scanv.height,
						0, 0,
						targetCtx.canvas.width,
						targetCtx.canvas.height);
}

function render(ctx, page) {
	ctx = ctx || RPG.ctx;
	page = page || RPG.story;
	setting(ctx);
	if(RPG.input.place && ctx === RPG.ctx) {
		ctx.fillStyle = "white";
		ctx.fillRect(RPG.input.pointer.x, 0, 1, ctx.canvas.height);
		ctx.fillRect(0, RPG.input.pointer.y, ctx.canvas.width, 1);
	}
	page.scene.characters.every(function(c) {
		draw(ctx, c);
		return true;
	});
	page.scene.stamps.every(function(s) {
		ctx.drawImage(RPG.gpx, s.idx * 8, 0, 8, 8,
					  s.x, s.y, 8, 8);
		return true;
	});
}

function renderpages() {
	var cont = document.querySelector("#pages");
	empty(cont);
	var span = document.createElement("span");
	var h3 = document.createElement("h3");
	h3.appendChild(document.createTextNode(RPG.story.title || "Untitled Story"));
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
		canv.width = RPG.W;
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
	tidy();
}

function tidy() {
	RPG.p = {};
	document.querySelector("#awesome").checked = false;

	var ins = document.querySelectorAll("input");
	for(var i = ins.length - 1; i >= 0; --i) {
		if(["radio", "color"].indexOf(ins[i].type) < 0 &&
		   ["localplayer", "localplayer2"].indexOf(ins[i].id < 0)) {
			ins[i].value = "";
		}
	}
	ins = document.querySelectorAll("textarea");
	for(var i = ins.length - 1; i >= 0; --i) {
		ins[i].value = "";
	}
	document.querySelector("#chanceodds").selectedIndex = 4;
	document.querySelector("select.sceneupdate").selectedIndex = 0;
	var hide = document.querySelectorAll("div.sceneupdate");
	for(var i = 0; i < hide.length; ++i) {
		hide[i].classList.toggle("hidden",
								 !this.value ||
								 (this.value &&
								  !hide[i].classList.contains(this.value)));
	}
	document.querySelector("#firstchar").nextSibling.click();
	document.querySelector("#addchar").nextSibling.click();

	var sel = document.querySelectorAll("select.thing");
	var optgroup;
	var option;
	var buildOption = function(c) {
		option = document.createElement("option");
		option.value = c.name;
		option.appendChild(document.createTextNode(c.name));
		if(c.canvas && c.canvas.toDataURL) {
			option.style.backgroundImage = [
				"url(", c.canvas.toDataURL(), ")"
			].join("");
		} else if(c.idx && document.querySelector("#stamp" + c.idx)) {
			option.style.backgroundImage = [
				"url(",
				document.querySelector("#stamp" + c.idx).toDataURL(),
				")"
			].join("");
		}
		optgroup.appendChild(option);
		return true;
	};
	for(var i = sel.length - 1; i >= 0; --i) {
		empty(sel[i]);
		optgroup = document.createElement("optgroup");
		optgroup.label = "Characters";
		RPG.story.scene.characters.every(buildOption);
		sel[i].appendChild(optgroup);
		optgroup = document.createElement("optgroup");
		optgroup.label = "Symbols";
		RPG.story.scene.stamps.every(buildOption);
		sel[i].appendChild(optgroup);
	}

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
		document.querySelector("#init").classList.toggle("hidden", true);
		if(RPG.story.pages[RPG.story.pages.length - 1].theend) {
			document.querySelector("#scene").classList.toggle("hidden", true);
			document.querySelector("#main").classList.toggle("hidden", true);
			document.querySelector("#done").classList.toggle("hidden", false);
		} else {
			document.querySelector("#scene").classList.toggle("hidden", false);
			document.querySelector("#main").classList.toggle("hidden", RPG.wait);
			document.querySelector("#done").classList.toggle("hidden", true);
		}
	} else {
		document.querySelector("#scene").classList.toggle("hidden", false);
		document.querySelector("#init").classList.toggle("hidden", RPG.wait);
		document.querySelector("#main").classList.toggle("hidden", true);
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

function mousemove(e) {
	var x = e.clientX;
	var y = e.clientY;
	var elm = e.target
	while(elm && elm.offsetTop !== undefined) {
		x -= elm.offsetLeft;
		y -= elm.offsetTop;
		elm = elm.offsetParent;
	}
	x += document.scrollingElement.scrollLeft;
	y += document.scrollingElement.scrollTop;
	RPG.input.pointer.x = Math.floor(x / RPG.canvas.clientWidth * RPG.W);
	RPG.input.pointer.y = Math.floor(y / RPG.canvas.clientHeight * RPG.H);
	if(RPG.input.placeObj) {
		RPG.input.placeObj.x = RPG.input.pointer.x - 4;
		RPG.input.placeObj.y = RPG.input.pointer.y - 4;
	}
	render();
}
function mouseout(e) {
	RPG.scrollBack = -1;
	RPG.sbHide = false;
	mouseclick(e);
}
function mouseclick(e) {
	RPG.input.place = false;
	RPG.input.placeObj = null;
	document.querySelector("#scenehead").classList.toggle("collapse", RPG.sbHide);
	RPG.sbHide = false;
	if(RPG.scrollBack >= 0) {
		document.scrollingElement.scrollTop = RPG.scrollBack;
		RPG.scrollBack = -1;
	}
	render();
}

window.addEventListener("load", function() {
	// collapse/expand sections
	var h = document.querySelectorAll("h1, h2");
	for(var i = h.length - 1; i >= 0; --i) {
		h[i].addEventListener("click", function(e) {
			e.target.classList.toggle("collapse");
		});
	};

	// init
	RPG.canvas = document.querySelector("canvas.scene");
	RPG.ctx = RPG.canvas.getContext("2d");
	jaggy(RPG.ctx);
	RPG.W = RPG.canvas.width;
	RPG.H = RPG.canvas.height;
	RPG.gpx = document.querySelector("img");
	RPG.story.scene.seed = Math.floor(Math.random() * 32000);
	document.querySelector("#init").classList.toggle("hidden", false);
	document.querySelector("#main").classList.toggle("hidden", true);
	render();
	tidy();

	// character builders
	var p = document.querySelectorAll("canvas.char");
	var roll;
	var func = function(e) {
		if(e) {
			e.preventDefault();
		}
		this.width = this.height = 8;
		var p = generate();
		if(!RPG.p[this.id]) {
			RPG.p[this.id] = p;
		} else {
			RPG.p[this.id].color = p.color;
			RPG.p[this.id].shape = p.shape;
			RPG.p[this.id].canvas = null;
		}
		render();
		draw(this.getContext("2d"), RPG.p[this.id], 0, 0);
	};
	for(var i = 0; i < p.length; ++i) {
		p[i].width = p[i].height = 8;
		p[i].nextSibling.addEventListener("click", func.bind(p[i]));
		//func.bind(p[i])();
	}

	// scene update sections
	var sel = document.querySelector("select.sceneupdate");
	sel.value = "";
	sel.addEventListener("change", function() {
		var hide = document.querySelectorAll("div.sceneupdate");
		for(var i = 0; i < hide.length; ++i) {
			hide[i].classList.toggle("hidden",
									 !this.value ||
									 (this.value &&
									  !hide[i].classList.contains(this.value)));
		}
	});

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
		RPG.story.scene.seed = Math.floor(Math.random() * 32000);
		render();
	});
	document.querySelector("#colroll").addEventListener("click", function() {
		RPG.story.scene.color1 = randomcolor((Math.random() * 0.2) + 0.1);
		RPG.story.scene.color2 = randomcolor((Math.random() * 0.2) + 0.5);
		col1.value = RPG.story.scene.color1;
		col2.value = RPG.story.scene.color2;
		render();
	});

	// stamp selector
	var span = document.querySelector("span.stamp");
	var canv;
	var ctx;
	var inp;
	var lbl;
	var x = 0;
	for(x = 0; x < RPG.gpx.width / 8; ++x) {
		canv = document.createElement("canvas");
		canv.id = "stamp" + x;
		canv.width = canv.height = 8;
		ctx = canv.getContext("2d");
		jaggy(ctx);
		ctx.drawImage(RPG.gpx, x * 8, 0, 8, 8,
					  0, 0, 8, 8);
		inp = document.createElement("input");
		inp.type = "radio";
		inp.name = "stamp";
		inp.className = "stamp";
		if(!x) {
			inp.checked = true;
			RPG.addstamp.idx = x;
		}
		inp.value = x;
		inp.addEventListener("change", function() {
			RPG.addstamp.idx = this.value;
			render();
		});
		lbl = document.createElement("label");
		lbl.appendChild(inp);
		lbl.appendChild(canv);
		span.appendChild(lbl);
		span.appendChild(document.createTextNode(" "));
	}

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

	// "place..." links
	var a = document.querySelectorAll("a.place");
	for(var i = a.length - 1; i >= 0; --i) {
		a[i].addEventListener("click", function(e) {
			e.preventDefault();
			e.stopPropagation();
			RPG.input.place = true;
			var hash = this.href.substring(this.href.indexOf("#"));
			if(RPG.p[hash.substring(1)]) {
				// firstchar or addchar
				RPG.input.placeObj = RPG.p[hash.substring(1)];
				if(RPG.story.scene.characters.indexOf(RPG.input.placeObj) < 0) {
					RPG.story.scene.characters.push(RPG.input.placeObj);
				}
			} else if(hash === "#addstamp") {
				RPG.input.placeObj = RPG.addstamp;
				if(RPG.story.scene.stamps.indexOf(RPG.input.placeObj) < 0) {
					RPG.story.scene.stamps.push(RPG.input.placeObj);
				}
			} else if(hash === "#movething") {
				var id = document.querySelector(hash).value;
				RPG.story.scene.stamps.every(function(stamp) {
					if(stamp.name === id) {
						RPG.input.placeObj = stamp;
					}
					return true;
				});
				RPG.story.scene.characters.every(function(c) {
					if(c.name === id) {
						RPG.input.placeObj = c;
					}
					return true;
				});
			}
			var scenehead = document.querySelector("#scenehead");
			RPG.sbHide = scenehead.classList.contains("collapse");
			scenehead.classList.toggle("collapse", false);
			RPG.scrollBack = document.scrollingElement.scrollTop;
			//document.scrollingElement.scrollTop = 0;
			scenehead.scrollIntoView();
		}, {capture: true});
	}
	RPG.canvas.addEventListener("mousemove", mousemove);
	RPG.canvas.addEventListener("mouseout", mouseout);
	RPG.canvas.addEventListener("click", mouseclick);

	// remove button
	document.querySelector("#remove").addEventListener("click", function() {
		var id = document.querySelector("#removething").value;
		RPG.story.scene.stamps = RPG.story.scene.stamps.filter(function(s) {
			return (s.name !== id);
		});
		RPG.story.scene.characters = RPG.story.scene.characters.filter(function(c) {
			return (c.name !== id);
		});
		var opt = document.querySelectorAll("select.thing option");
		for(var i = opt.length - 1; i >= 0; --i) {
			if(opt[i].value === id) {
				opt[i].parentNode.removeChild(opt[i]);
			}
		}
		render();
	});

	// revert button
	document.querySelector("#revert").addEventListener("click", function() {
		if(!confirm("Revert all changes and start over on this page?")) {
			return;
		}
		var last = RPG.story.pages[RPG.story.pages.length - 1];
		RPG.story.scene.characters = JSON.parse(JSON.stringify(last.scene.characters,
															   serialize));
		RPG.story.scene.stamps = JSON.parse(JSON.stringify(last.scene.stamps,
														   serialize));
		tidy();
	});

	// initial page post
	document.querySelector("#title").addEventListener("change", function() {
		RPG.story.title = this.value;
	});
	document.querySelector("#firstcharname").addEventListener("change", function() {
		RPG.p.firstchar.name = uniquename(this.value);
	});
	document.querySelector("#placeinput").addEventListener("change", function() {
		var label = document.querySelector("#placename");
		empty(label);
		label.appendChild(document.createTextNode(this.value));
	});
	document.querySelector("#initpost").addEventListener("click", function() {
		var page = {
			title: RPG.story.title,
			scene: JSON.parse(JSON.stringify(RPG.story.scene, serialize)),
			//characters: [].concat(RPG.story.scene.characters),
			//stamps: [].concat(RPG.story.scene.stamps),
			plot: document.querySelector("#initplot").value
		};

		document.querySelector("#init").classList.toggle("hidden", true);
		document.querySelector("#main").classList.toggle("hidden", false);

		RPG.story.pages.push(page);
		if(RPG.online && RPG.socket) {
			RPG.wait = true;
			RPG.socket.emit("pages", {
				id: RPG.partner,
				pages: JSON.parse(JSON.stringify(RPG.story.pages,
												 serialize))
			});
		}
		renderpages();
	});
	// additional page post
	document.querySelector("#addcharname").addEventListener("change", function() {
		RPG.p.addchar.name = uniquename(this.value);
	});
	document.querySelector("#stampname").addEventListener("change", function() {
		RPG.addstamp.name = uniquename(this.value);
	});
	document.querySelector("#post").addEventListener("click", function() {
		if(document.querySelector("#awesome").checked) {
			RPG.story.pages[RPG.story.pages.length - 1].awesome = true;
		}
		var page = {
			scene: JSON.parse(JSON.stringify(RPG.story.scene, serialize)),
			//characters: JSON.parse(JSON.stringify(RPG.story.scene.characters, serialize)),
			//stamps: JSON.parse(JSON.stringify(RPG.story.scene.stamps, serialize)),
			plot: document.querySelector("#plot").value,
			theend: document.querySelector("#endcheck").checked
		};
		RPG.story.pages.push(page);
		if(RPG.online && RPG.socket) {
			RPG.wait = true;
			RPG.socket.emit("pages", {
				id: RPG.partner,
				pages: JSON.parse(JSON.stringify(RPG.story.pages,
												 serialize))
			});
		}
		renderpages();
	});

	// begin
	document.querySelector("#begin").addEventListener("click", function() {
		if(!RPG.socket || RPG.partner === "local") {
			document.querySelector("#room").classList.toggle("hidden", true);
			document.querySelector("#story").classList.toggle("hidden", false);
			tidy();
		} else {
			RPG.socket.emit("invite", RPG.partner);
			RPG.player1.name = document.querySelector("#localplayer").value;
			RPG.player1.id = RPG.socket.id;
			document.querySelector("#room").classList.toggle("hidden", true);
			document.querySelector("#story").classList.toggle("hidden", true);
			RPG.wait = true;
			tidy();
		}
	});
	// restart
	document.querySelector("#restart").addEventListener("click", function(e) {
		e.preventDefault();
		e.stopPropagation();
		var label = document.querySelector("#placename");
		empty(label);
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
				seed: 1,
				color1: "#000000",
				color2: "#888888",
				characters: [],
				stamps: []
			},
			pages:[]
		};
		RPG.partner = "local";
		empty(document.querySelector("#online"));
		renderpages();
		document.querySelector("#room").classList.toggle("hidden", false);
		document.querySelector("#story").classList.toggle("hidden", true);
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
			//console.log("invite from", id);
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
			} else {
				RPG.socket.emit("reject", id);
			}
		});

		// other player accepted our invitation
		RPG.socket.on("accept", function(id) {
			//console.log("accept from", id);
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
			//console.log("reject from", id);
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
			//console.log("new pages", pages);
			RPG.wait = !RPG.wait;
			RPG.story.pages = pages;
			RPG.story.scene = JSON.parse(JSON.stringify(pages[pages.length - 1].scene));
			if(pages[pages.length - 1].title) {
				RPG.story.title = pages[pages.length - 1].title;
			}
			document.querySelector("#story").classList.toggle("hidden", false);
			renderpages();
		});
	} catch(e) {
		var status = document.querySelector("#status");
		empty(status);
		status.appendChild(document.createTextNode("Online play is unavailable."));
	}
});
