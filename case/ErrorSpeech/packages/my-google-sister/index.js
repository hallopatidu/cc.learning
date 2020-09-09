'use strict';
const errorSpeech = require('./error-speech');

module.exports = {
    'init': function(event){
        cc.error = errorSpeech.edit(cc.error);
        // Editor.error = errorSpeech.edit(Editor.error);
        if (event.reply) {
            event.reply (null);
        }
    }
}