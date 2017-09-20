'use strict';

const {app, BrowserWindow, ipcMain} = require('electron')
const url = require('url')
const path = require('path')
const { execFile } = require('child_process');
const monitor = require('./monitor.js');

let win

function createWindow() {
  win = new BrowserWindow({
    name: "anMonitor_main",
    width: 1000,
    height: 600,
    //frame: false
    skiptaskbar: true,
    toolbar: false
  })
  win.setMenu(null);
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))
  win.webContents.openDevTools()
  win.on('closed', () => {
    win = null
  })
  win.once('ready-to-show', () => {
    monitor.initMonitor();
  })
}

app.on('ready', createWindow)
app.on('window-all-closed', () =>{
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
app.on('active', () => {
  if (win === null) {
    createWindow()
  }
})

//ipcMain.on('connect', function(event, data) {
  //const child = execFile('adb', ['devices'], (error, stdout, stderr) => {
    //if (error) {
      //console.error(`exec error: ${error}`);
      //return;
    //}
    //console.log(`stdout: ${stdout}`);
    //event.sender.send('connectResult', `${stdout}`);
  //})
//})
