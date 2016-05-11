"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var INVALID_FRAME_INDEX = -1;
var MessageType = {
    // Server to client
    SYNC_SIGNAL: 1,
    START_SIGNAL: 2,
    STOP_SIGNAL: 3,
    // Client to server
    REQUEST_SYNC_SIGNAL: 11,
    REQUEST_START_SIGNAL: 12,
    REQUEST_STOP_SIGNAL: 13
};
var EventEmitter = (function () {
    function EventEmitter() {
        this.eventMap = {};
    }
    EventEmitter.prototype.ensureEMExists = function (name) {
        this.eventMap[name] = this.eventMap[name] || [];
    };
    EventEmitter.prototype.on = function (name, method) {
        this.ensureEMExists(name);
        this.eventMap[name].push(method);
    };
    EventEmitter.prototype.un = function (name, method) {
        var stack = this.eventMap[name];
        if (stack) {
            this.eventMap[name] = stack.filter(function (it) { return it != method; });
        }
    };
    EventEmitter.prototype.emit = function (name, data) {
        var stack = this.eventMap[name];
        if (stack) {
            stack.forEach(function (it) { return it(data); });
        }
    };
    return EventEmitter;
}());
var FantifoNetwork = (function (_super) {
    __extends(FantifoNetwork, _super);
    function FantifoNetwork(host, params) {
        var _this = this;
        _super.call(this);
        this.latency = 0;
        this.timeOffset = 0;
        this.latencyTestInterval = 3000;
        this.proxies = {
            send: null,
            receive: null
        };
        this.on('open', function (e) { return _this.onOpen(e); });
        this.on('pre:message', function (e) { return _this.receivedMessage(e); });
    }
    FantifoNetwork.prototype.connect = function () {
        var _this = this;
        this.socket = new WebSocket(this.host);
        this.socket.onopen = function (e) { return _this.emit('open', e); };
        this.socket.onmessage = function (e) { return _this.emit('pre:message', e); };
        this.emit("connect");
    };
    FantifoNetwork.prototype.onOpen = function (event) {
        var _this = this;
        this.sendLatencyTest();
        setInterval(function () { return _this.sendLatencyTest; }, this.latencyTestInterval);
    };
    FantifoNetwork.prototype.receivedMessage = function (event) {
        var _this = this;
        var data = JSON.parse(event.data);
        // If  a receiver proxy exists on the object, use it. Otherwise fall back on the default method
        this.proxies.receive
            ? this.proxies.receive(function (data) { return _this.postReceiveMessage(data); }, data)
            : this.postReceiveMessage(data);
    };
    FantifoNetwork.prototype.postReceiveMessage = function (data) {
        // Emits three types of messages, we can choose which one to use in the future
        this.emit('message', data);
        this.emit("message:" + data.type, data);
        this.emit("" + data.type, data);
    };
    FantifoNetwork.prototype.sendMessage = function (message) {
        var _this = this;
        // If  a send proxy exists on the object, use it. Otherwise fall back on the default method
        this.proxies.send
            ? this.proxies.send(function (message) { return _this.postSendMessage(message); }, message)
            : this.postSendMessage(message);
    };
    FantifoNetwork.prototype.postSendMessage = function (message) {
        this.socket.send(message);
    };
    FantifoNetwork.prototype.sendLatencyTest = function () {
        var request = {
            type: MessageType.REQUEST_SYNC_SIGNAL,
            timeStamp: Date.now()
        };
        this.sendMessage(JSON.stringify(request));
    };
    return FantifoNetwork;
}(EventEmitter));
var FantifoClient = (function (_super) {
    __extends(FantifoClient, _super);
    function FantifoClient($target, frameList, host, params) {
        var _this = this;
        _super.call(this, host, params);
        this.currentFrameIndex = INVALID_FRAME_INDEX;
        this.absStartTime = -1;
        this.$target = $target;
        this.frameList = frameList;
        // Listen to these messages which are passed by the underlying network client
        this.on("message:" + MessageType.SYNC_SIGNAL, function (e) { return _this.onSync(e); });
        this.on("message:" + MessageType.START_SIGNAL, function (e) { return _this.onStart(e); });
        this.on("message:" + MessageType.STOP_SIGNAL, function (e) { return _this.onStop(e); });
    }
    FantifoClient.prototype.onSync = function (event) {
        var now = Date.now();
        this.latency = (now - event.timeStamp) / 2;
        this.timeOffset = now - (event.serverTimeStamp + this.latency);
        console.log("SYNC: " + this.timeOffset);
    };
    FantifoClient.prototype.onStart = function (event) {
        this.absStartTime = event.when - this.timeOffset;
        this.tick();
        console.log("START at " + event.when);
    };
    FantifoClient.prototype.onStop = function (event) {
        console.log("STOP");
    };
    FantifoClient.prototype.getCurrentFrameIndex = function (ellapsedTime) {
        var len = this.frameList.length;
        for (var i = 0; i < len; i++) {
            var nextFrame = i + 1;
            if (ellapsedTime >= this.frameList[i].time &&
                ellapsedTime < this.frameList[nextFrame].time) {
                return i;
            }
        }
        return INVALID_FRAME_INDEX;
    };
    FantifoClient.prototype.tick = function () {
        var _this = this;
        var now = Date.now() - this.timeOffset;
        var $target = this.$target;
        // Calculate animation time, then use that to calculate the current frame
        var singleLoopTime = this.frameList[this.frameList.length - 1].time;
        var animationTime = (now - this.absStartTime) % singleLoopTime;
        var currentFrameIndex = this.getCurrentFrameIndex(animationTime);
        if (currentFrameIndex != this.currentFrameIndex) {
            var frame = this.frameList[currentFrameIndex];
            var r = frame.r;
            var g = frame.g;
            var b = frame.b;
            $target.css('background', 'rgb(' + r + ',' + g + ',' + b + ')');
            this.currentFrameIndex = currentFrameIndex;
        }
        requestAnimationFrame(function () { return _this.tick; });
    };
    return FantifoClient;
}(FantifoNetwork));
exports.FantifoClient = FantifoClient;
var FantifoNetworkMocker = (function () {
    function FantifoNetworkMocker(target, proxy) {
        var _this = this;
        this.maxLatency = 1000;
        this.serverTimeOffset = -2000;
        this.target = target;
        this.proxy = proxy ? proxy : FantifoNetworkMocker.DefaultProxy;
        target.proxies.send = function (method, data) { return _this.sendProxy(method, data); };
        target.proxies.receive = function (method, data) { return _this.receiveProxy(method, data); };
    }
    FantifoNetworkMocker.prototype.sendProxy = function (_, data) {
        var event = {
            timeStamp: data.timeStamp,
            serverTimeStamp: data.timeStamp + this.serverTimeOffset
        };
        this.target.receivedMessage(JSON.stringify(event));
    };
    FantifoNetworkMocker.prototype.receiveProxy = function (resolve, data) {
        this.proxy(function () { return resolve(data); });
    };
    FantifoNetworkMocker.RandomFixedLatencyProxy = function (maxLatency) {
        var latency = Math.random() * maxLatency;
        console.log("Generated latency " + latency);
        return function (resolve) {
            setTimeout(resolve, latency);
        };
    };
    FantifoNetworkMocker.DefaultProxy = FantifoNetworkMocker.RandomFixedLatencyProxy(1000);
    return FantifoNetworkMocker;
}());
exports.FantifoNetworkMocker = FantifoNetworkMocker;
//# sourceMappingURL=fantifots.js.map