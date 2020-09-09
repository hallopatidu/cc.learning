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
    'scene:ready' (){
        Editor.Scene.callSceneScript ('error-speech', 'init', function (err) {});
    }
  },
};