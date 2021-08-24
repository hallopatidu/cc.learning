// Learn TypeScript:
// Hallo

const {ccclass, property} = cc._decorator;

@ccclass
class ActionGroup {

    static IDLE:number = 0;
    static RUNNING:number = 1;

    public _actions: Array<Array<cc.Action> | cc.Action> = null;

    private _id:number = 0;

    private _status:number = 0;

    private _length:number = 0;

    private _manager:cc.ActionManager = null;
    
    constructor(){
        this._status = ActionGroup.IDLE;
        this._actions = [];
    }

    /**
     * Tham chiếu tới NagaActionManager đang sử dụng.
     */
    set manager(actionManager: cc.ActionManager){
        this._manager = actionManager;
    }

    /**
     * id của group. theo thứ tự trùng trong _schemas của NagaActionManager.
     */
    set id(value:number){
        this._id = value;
    }
    get id():number{
        return this._id;
    }

    /**
     * Trạng thái chuyển động của group
     * ActionGroup.IDLE hoặc ActionGroup.RUNNING
     */
    get status():number{
        return this._status;
    }

    /**
     * Đưa action vào vị trí theo thứ tự chuyển động.
     * @param index 
     * @param action 
     * @param target 
     * @returns 
     */
    public put(index:number, action:cc.Action, target: cc.Node):boolean{
        if(this._status == ActionGroup.RUNNING){
            // Đã có action hoặc đang chạy thì khoogn cho add vào.
            return false
        } 
        //
        action.setTarget(target);
        //
        let spawActions = this._actions[index];
        if(spawActions){
            spawActions = (spawActions instanceof cc.Action) ? [spawActions] : spawActions;
            spawActions.push(action);            
        }else{
            spawActions = action;
        }
        this._actions[index] = spawActions;
        this._length = this._actions.reduce((accumulator:number, value:cc.Action, index:number) =>{
            if(value){
                accumulator += 1;
            }
            return accumulator;
        },0);
        // 
        return true
    }

    public get length(){        
        return this._length;
    }

    /**
     * Setup lại khởi tạo ban đầu.
     * Sử dụng sau khi xóa action group hoặc sau khi chuyển động xong.
     */
    public reset():void{
        if(this._actions){
            this._actions.length = 0;
            this._length = 0;
        }
        this._status = ActionGroup.IDLE;
    }

    /**
     * Dùng cho chạy với từng target của Action.
     * Đệ quy mỗi khi chạy xong action.
     * @returns 
     */
    public start():boolean{       
        if(this._actions.length){
            this._status = ActionGroup.RUNNING;
            let spawnActions = this._actions.shift();
            this._length--;
            // 
            if(spawnActions instanceof Array){
                spawnActions = spawnActions.reduce((maxDurationAction: cc.Action, action:cc.Action, index:number)=>{
                    let _target:cc.Node = maxDurationAction.getTarget() || action.getTarget();
                    let _maxDuration:number = maxDurationAction && (maxDurationAction instanceof cc.FiniteTimeAction) ? maxDurationAction.getDuration() : 0;
                    let _targetDuration:number = action && (action instanceof cc.FiniteTimeAction) ? action.getDuration() : 0;
                    if(_maxDuration < _targetDuration){                        
                        this._manager.addAction(maxDurationAction, _target, false);
                        return action;                    
                    }
                    this._manager.addAction(action, action.getTarget(), false);
                    return maxDurationAction;
                })
            }
            
            // Tạo sequence callback và packed action.
            let target:cc.Node = (spawnActions as cc.Action).getTarget();
            let packedAction = cc.sequence.apply(this, [spawnActions, cc.callFunc(()=>{
                this.start();
            })]);
            // Chạy packedAction
            this._manager.addAction(packedAction, target, false);            
            return true;
        }else{
            this.reset();
        }
        return false;
    }

}


/**
 *  Cách dùng:
 *  Khai báo trong onLoad của Scene Component. Càng khai báo sớm thì càng sử dụng sớm.
 * 
 *  let nagaActionManager = new NagaActionManager();
 *  nagaActionManager.sequenceSchema([1001,1002]);  // thứ tự các tag
 *  cc.director.setActionManager(nekoActionManager);
 * 
 */
@ccclass('NagaActionManager')
export default class HalloActionManager extends cc.ActionManager {

    private _schemas:Array<Array<number>> = [];         // Bảng biểu mẫu chạy theo thứ tự.

    private _preActions:Array<ActionGroup> = [];      

    /**
     * Tạo schemas. Sử dụng để link các target có action trong schemas chạy tuần tự
     * @param id 
     * @param tags 
     */
    sequenceSchema(tags:Array<number>):void{
        if(!this._schemas){
            this._schemas = [];
        }
        this._schemas.push(tags);
    }

    /**
     * 
     */
    resetSchema(){
        this._schemas.length = 0;
    }

    /**
     * Override addAction default của ActionManager.
     * Nhặt các action được đánh tag dựa vào shema khai báo trong sequenceSchema(...).
     * Cho ác action này vào các ActionGroup có id tương ứng.
     * Lưu ý: 
     * - Với Tween Action. Các action không start sẽ không gọi vào addAction.
     * - Một schemas phải có đủ số action tương ứng mới có thể chạy.
     * @param action 
     * @param target 
     * @param paused 
     */
    addAction(action: cc.Action, target: cc.Node, paused: boolean): void {        
        let actionTag = action.getTag();
        // 
        let packedAddress: Array<number> = this._schemas.reduce((accumulator, tags, index) =>{
            let pacId: number = index;            
            let tagId: number = tags.findIndex( tag => tag == actionTag );
            if(tagId != -1){
                return [pacId, tagId];
            }
            return accumulator
        }, []);
        //
        if(packedAddress.length > 1){
            let pacId: number = packedAddress[0];
            let tagId: number = packedAddress[1];
            let actionPackage = this._preActions[pacId];
            if(!actionPackage){
                actionPackage = new ActionGroup();
                actionPackage.manager = this;
                actionPackage.id = pacId;
                this._preActions[pacId] = actionPackage;
            }

            if(actionPackage.put(tagId, action, target) == false){
                // tag da ton tai trong pack => cho chạy luôn.
                super.addAction(action, target, paused);
                return;
            };

        }else{
            // tag ko co trong schemas => cho chạy luôn.
            super.addAction(action, target, paused);
            return;
        }

        // Check run action
        this.applyPreActions(target);
    }

    /**
     * Run các action đầy đủ.
     * @param target 
     */
    applyPreActions(target: cc.Node){
        this._preActions.forEach((actionPackage: ActionGroup, index: number)=>{
            let pacId: number = actionPackage.id;
            let schema:Array<number> = this._schemas[pacId]
            if(!schema){
                actionPackage.reset();
            }else{
                if(actionPackage.length == schema.length && actionPackage.status == ActionGroup.IDLE){    
                    // this._preActions[pacId] = null;              
                    actionPackage.start();
                    // cc.log("start actions:: " + actionPackage.id + " -name: " + (target ? target.name : "unknow") )
                }
            }
        })
    }
    
}
