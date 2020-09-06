'use strict';

module.exports = {
  load () {
    // execute when package 
    
  },

  unload () {
    // execute when package unloaded
  },

  // register your ipc messages here
  messages: {    
    'scene:saved' (){
      Editor.Scene.callSceneScript ('creator', 'lock', function (err) {});
    }
  },
};