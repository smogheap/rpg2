const {app, BrowserWindow} = require('electron');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
	  backgroundColor: "#000",
	  title: "RPG2"
  });

  mainWindow.loadURL('file://' + __dirname + '/index.html');
});
