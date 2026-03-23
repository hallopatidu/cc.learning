'use strict';

module.exports = {
    'lock': function (event) {        
        const frame1 = "( づ￣ ³￣ )づ";
        const frame2 = "(づ ￣ 3￣)づ";
        const ext = ".   <( 越南锦标赛 ! )";
        var canvas = cc.find ('Canvas');
        if(!this.nNode){
            this.nNode = new cc.Node(frame1);
            this.nNode._frame = frame1;            
            this.nNode.parent = canvas;
        }else{
            this.nNode._frame = this.nNode._frame == frame2 ? frame1 : frame2;
        }
        this.nNode.name = (this.nNode.name.length % 5) == 0 ?  this.nNode._frame + ext : this.nNode._frame;
        
        let id = setTimeout(()=>{
            clearTimeout(id);
            Editor.Scene.callSceneScript ('creator', 'lock', function (err) {});
        }, 250);

        if (event.reply) {
            event.reply (null);
        }
    }

}