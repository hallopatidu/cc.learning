cc.Class({
    extends: cc.Component,

    properties: {
        label: {
            default: null,
            type: cc.Label
        },
        
        // defaults, set visually when attaching this script to the Canvas
        text: 'Hello, World!'
    },

    ctor(){
        try{
            throw new Error("Cảm ơn đã theo dõi")
            // this.labelss.string = "hello"
        }catch(err){
            cc.error(err)
        }
    },

    showError(evt, msg){
        cc.error(msg);
    },

    // use this for initialization
    onLoad: function () {
        this.label.string = this.text + "--OO--";
        // cc.error('test error');
    },

    
});
