import HalloActionManager from "./manager/HalloActionManager";
const {ccclass, property} = cc._decorator;

@ccclass
export default class Helloworld extends cc.Component {

    @property
    text: string = 'hello';

    @property(cc.Node)
    cocos01: cc.Node = null;
    
    @property(cc.Node)
    cocos02: cc.Node = null;
    
    @property(cc.Node)
    cocos03: cc.Node = null;



    onLoad(){
        let actionManager:HalloActionManager = new HalloActionManager();
            actionManager.sequenceSchema([1,2,3]);
            
        cc.director.setActionManager(actionManager);
    }

    start () {
        // init logic
        
    }

    clickRun(evt:any){
        cc.tween(this.cocos01).tag(1)
        .by(1.5, {x: 700})
        .start();
        
        cc.tween(this.cocos02).tag(1)
        .by(1.5, {x: 700})
        .start();
        
        cc.tween(this.cocos03).tag(2)
        .by(1.5, {x: 700})
        .start();
    }

}



/**
 * 
 * 
 */