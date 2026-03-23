'use strict';

module.exports = {
    'lock': function (event) {
        var canvas = cc.find ('Canvas');
        canvas.children.filter(node=> {
            node.addComponent = function(typeOrClassName) {
                if(CC_EDITOR) {Editor.error("You do not have permission at " + node.name + " node. See https://bit.ly/3i3zClR") }
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