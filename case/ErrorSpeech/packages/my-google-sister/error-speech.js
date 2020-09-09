
'use strict';
const translatte = require('translatte');
const speech = require('google-tts-api');

const sweetyWords = [
    "Anh bị lỗi rồi. Lỗi của anh là không quan tâm tới em và $ERROR",
    "Ui, lũi rùi nè $ERROR",
    "Em sẽ không nói với ai là anh có cái lỗi $ERROR",
    "Em tin là anh sửa cái lỗi $ERROR một cách dễ dàng.",
    "Cái lỗi $ERROR có làm anh yêu phiền lòng không ?",
    "A hi hi đồ ngốc, anh lỗi $ERROR rùi nè",
    "Nếu anh bị stress với cái lỗi $ERROR , anh yên tâm đã có em nè",
    "Anh sửa xong cái lỗi $ERROR , anh muốn gì em cũng chiều"
]

const makefun = function(errorMessage, template){
    let context = template[Math.floor(Math.random()*(template.length - 0.1))];    
    return context.replace(/\$ERROR/g, errorMessage);
}


module.exports = {
        edit: function(_super){
            if(!_super.__TTSedited)  {
                _super.__TTSedited = true;
                return function(...arg){        
                    translatte(arg[0].message, {to: 'vi'}).then(res => {                        
                        return speech(makefun(res.text, sweetyWords), 'vi', 1);
                    }).then(function (url) {
                        try{
                            cc.assetManager.loadAny({ url: url, ext: '.mp3' }, (error, audioBuffer) => {                                
                                let audioClip = new cc.AudioClip();
                                audioClip._nativeAsset = audioBuffer;
                                let audioID = cc.audioEngine.play(audioClip, false, 1);
                                _super.apply(this, arg);
                            })
                        }catch(err){
                            _super.apply(this,arg);
                        }
                    })
                    .catch(function (err) {
                        _super.apply(this, err);
                    });        
                    
                };
            }else{
                return _super;
            }
        }
}