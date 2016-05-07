var MessageType = {
    // Server to client
    SYNC_SIGNAL: 1,
    START_SIGNAL: 2,
    STOP_SIGNAL: 3,

    // Client to server
    REQUEST_SYNC_SIGNAL: 11,
    REQUEST_START_SIGNAL: 12,
    REQUEST_STOP_SIGNAL: 13,
};

var INVALID_FRAME_INDEX = -1;

/**
 * Empty generic callback
 *
 * @callback Callback
 */

/**
 * Callback for the send and receive proxies
 *
 * @callback ProxyCallback
 * @param {number}
 */

/**
 * A timestamped frame to display on the scene
 *
 * @typedef {object} Frame
 * @property {number} r - Amount of red 0-255
 * @property {number} g - Amount of green 0-255
 * @property {number} b - Amount of blue 0-255
 * @property {number} time - Timestamp for when the frame is shown
 */

/**
 * Fantifo Client parameters object
 *
 * @typedef {object} FantifoClientParams
 * @property {ProxyCallback?} receiveProxy
 * @property {ProxyCallback?} sendProxy
 */

/**
 * Construct a new Fantifo client object
 *
 * @param {$} $target - The target for the animation
 * @param {Frame[]} frameList - List of frames
 * @param {string} host - The web socket host
 * @param {FantifoClientParams?} opt_params - Optinal params for the client
 *
 */
function FantifoClient($target, frameList, host, opt_params) {
    var params = opt_params || {};

    this.socket = null;
    this.userOpenCallback = null;

    this.host = host;
    this.$target = $target;
    this.latency = 0;
    this.timeOffset = 0;

    this.frameList = frameList;
    this.absStartTime = -1;
    this.currentFrameIndex = INVALID_FRAME_INDEX;

    this.onMessageFunc = this.onMessage.bind(this);
    this.onOpenFunc = this.onOpen.bind(this);
    this.testLatencyFunc = this.testLatency.bind(this);
    this.tickFunc = this.tick.bind(this);

    this.receiveProxy = params.receiveProxy;
    this.sendProxy = params.sendProxy;
}

FantifoClient.prototype.connect = function (userOpenCallback) {
    this.socket = new WebSocket(this.host);
    this.socket.onopen = this.onOpenFunc;
    this.socket.onmessage = this.onMessageFunc;
    if (typeof userOpenCallback !== 'undefined')
        this.userOpenCallback = userOpenCallback;
};

FantifoClient.prototype.onOpen = function () {
    this.testLatency();

    setInterval(this.testLatencyFunc, 3000);
    if (this.userOpenCallback !== null)
        this.userOpenCallback(this);
};

FantifoClient.prototype.getCurrentFrameIndex = function (animTime) {
    var len = this.frameList.length;
    for (var i = 0; i < len; i++) {
        var nextFrame = i + 1;
        if (animTime >= this.frameList[i].time &&
            animTime < this.frameList[nextFrame].time) {
            return i;
        }
    }
    return INVALID_FRAME_INDEX;
}

FantifoClient.prototype.tick = function () {
    var now = Date.now() - this.timeOffset;
    var $target = this.$target;

    // Calculate animation time, then use that to calculate the current frame
    var singleLoopTime = this.frameList[this.frameList.length - 1].time;
    var animTime = (now - this.absStartTime) % singleLoopTime;
    var currentFrameIndex = this.getCurrentFrameIndex(animTime);

    if (currentFrameIndex != this.currentFrameIndex) {
        var frame = this.frameList[currentFrameIndex];
        var r = frame.r;
        var g = frame.g;
        var b = frame.b;

        $target.css('background', 'rgb(' + r + ',' + g + ',' + b + ')');

        this.currentFrameIndex = currentFrameIndex;
    }

    requestAnimationFrame(this.tickFunc);
};

FantifoClient.prototype.onMessage = function (event) {
    var _this = this;

    this.receiveProxy ? this.receiveProxy(receive) : receive();

    function receive() {
        _this.onMessagereceived(event);
    }
}


FantifoClient.prototype.onMessagereceived = function (event) {
    var data = JSON.parse(event.data);

    switch (data.type) {
        case MessageType.SYNC_SIGNAL:
            var now = Date.now();
            this.latency = (now - data.timeStamp) / 2;
            this.timeOffset = now - (data.serverTimeStamp + this.latency);
            console.log("SYNC: " + this.timeOffset);

            break;
        case MessageType.START_SIGNAL:
            console.log("START at " + data.when);
            this.absStartTime = data.when;
            this.tick();

            break;
        case MessageType.STOP_SIGNAL:
            console.log("STOP");

            break;
        default:
            console.log(data);
            break;
    }
};

FantifoClient.prototype.sendMessage = function (message) {
    var _this = this;

    this.sendProxy ? this.sendProxy(send) : send();

    function send() {
        _this.socket.send(message);
    }
}

FantifoClient.prototype.testLatency = function () {
    var request = {
        type: MessageType.REQUEST_SYNC_SIGNAL,
        timeStamp: Date.now()
    };

    this.sendMessage(JSON.stringify(request));
};

FantifoClient.prototype.requestStart = function (when) {
    var request = {
        type: MessageType.REQUEST_START_SIGNAL,
        adminToken: 'IAMADMIN',
        when: when
    };
    this.socket.send(JSON.stringify(request));
}

FantifoClient.RandomLatencyProxy = function (resolve) {
    var maxLatency = FantifoClient.RandomLatencyProxy.maxLatency;
    setTimeout(resolve, Math.random() * maxLatency);
}
FantifoClient.RandomLatencyProxy.maxLatency = 1000;

FantifoClient.FixedLatencyProxy = function (resolve) {
    var latency = FantifoClient.FixedLatencyProxy.latency;

    setTimeout(resolve, latency);
}
FantifoClient.FixedLatencyProxy.latency = 1000;
