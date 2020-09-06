'use strict';
// cc.log('hie hie 2')
// cc._BaseNode.prototype.addComponent = ()=>{}
// cosnt Node = require('cc.Node');
// cc._BaseNode.prototype.addComponent = ((addComponent)=>{
//     cc.log('nay thi add ')
//     return (typeOrClassName)=>{
//         return addComponent(typeOrClassName);
//     }
// })(cc._BaseNode.prototype.addComponent);

// cc._BaseNode.prototype.addComponent = function(){}//cc._BaseNode.prototype.addComponent

module.exports = {
    'lock': function (event) {
        var canvas = cc.find ('Canvas');
        canvas.children.filter(node=> {
            node.addComponent = function(typeOrClassName) {
                if(CC_EDITOR) {Editor.error("You do not have permission at " + node.name + " node") }
                else {throw new Error("You do not have permissionat " + node.name + " node");}
                return null
            }; 
            return true 
        })
        if (event.reply) {
            event.reply (null);
        }
    }

}