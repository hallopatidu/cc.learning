
// Giả định định dạng của Editor dựa trên code gốc
declare const global: any;
let Editor = global.Editor || require("editor");

interface MessageData {
    name: string;
    message?: string;
    args?: any[];
    id?: number | string;
}

interface RequestItem {
    id: number | string;
    timestamp: number;
}

const requestQueue: RequestItem[] = [];
let idCounter = 1;

const methods = {
    request(e: MessageData) {
        if (e.name !== "messages") {
            const stack = new Error("message").stack?.match(/\(.*\)/g);
            const data = {
                process: "renderer",
                type: "request",
                name: e.name,
                message: e.message,
                source: stack ? stack[4] : "unknown",
                timestamp: Date.now(),
                time: 0,
                args: e.args,
                id: idCounter++,
            };
            e.id = data.id;
            requestQueue.push(data);
            Editor.Message.send("messages", "request", data);
        }
    },

    reply(r: MessageData) {
        if (r.name !== "messages") {
            const stack = new Error("message").stack?.match(/\(.*\)/g);
            const foundIndex = requestQueue.findIndex((item) => item.id === r.id);
            let originalRequest: RequestItem | undefined;

            if (foundIndex !== -1) {
                originalRequest = requestQueue.splice(foundIndex, 1)[0];
            }

            const data = {
                process: "renderer",
                type: "reply",
                name: r.name,
                message: r.message,
                source: stack ? stack[3] : "unknown",
                timestamp: Date.now(),
                time: originalRequest ? Date.now() - originalRequest.timestamp : -1,
                args: r.args,
                id: originalRequest ? originalRequest.id : "",
            };
            Editor.Message.send("messages", "reply", data);
        }
    },

    send(e: MessageData) {
        if (e.name !== "messages") {
            const stack = new Error("message").stack?.match(/\(.*\)/g);
            const data = {
                process: "renderer",
                type: "send",
                name: e.name,
                message: e.message,
                source: stack ? stack[4] : "unknown",
                timestamp: Date.now(),
                time: 0,
                args: e.args,
                id: 0,
            };
            Editor.Message.send("messages", "send", data);
        }
    },

    broadcast(e: MessageData) {
        if (e.name !== "messages") {
            const stack = new Error("message").stack?.match(/\(.*\)/g);
            const data = {
                process: "renderer",
                type: "broadcast",
                name: e.name,
                message: e.message,
                source: stack ? stack[4] : "unknown",
                timestamp: Date.now(),
                time: 0,
                args: e.args,
                id: 0,
            };
            Editor.Message.send("messages", "broadcast", data);
        }
    },

    addListener() {
        const remoteEditor = require("@electron/remote").getGlobal("Editor");
        const eb = remoteEditor.remote.Message.__eb__;
        eb.on("request", methods.request);
        eb.on("reply", methods.reply);
        eb.on("send", methods.send);
        eb.on("broadcast", methods.broadcast);
    },

    removeListener() {
        const remoteEditor = require("@electron/remote").getGlobal("Editor");
        const eb = remoteEditor.remote.Message.__eb__;
        eb.removeListener("request", methods.request);
        eb.removeListener("reply", methods.reply);
        eb.removeListener("send", methods.send);
        eb.removeListener("broadcast", methods.broadcast);
    }
};

export function load() {
    Editor.Message.addBroadcastListener("messages:start", methods.addListener);
    Editor.Message.addBroadcastListener("messages:stop", methods.removeListener);
}

export function unload() {
    Editor.Message.removeBroadcastListener("messages:start", methods.addListener);
    Editor.Message.removeBroadcastListener("messages:stop", methods.removeListener);
}