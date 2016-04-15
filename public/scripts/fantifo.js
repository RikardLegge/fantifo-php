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

// var ImageStruct = {
//     r: 0,
//     g: 0,
//     b: 0,
//     time: 0
// }

function FantifoClient($target, frameList, host) {
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
}

FantifoClient.prototype.connect = function (userOpenCallback) {
    this.socket = new WebSocket(this.host);
    this.socket.onopen = this.onOpenFunc;
    this.socket.onmessage = this.onMessageFunc;
    if(typeof userOpenCallback !== 'undefined')
        this.userOpenCallback = userOpenCallback;
};

FantifoClient.prototype.onOpen = function () {
    this.testLatency();

    setInterval(this.testLatencyFunc, 3000);
    if(this.userOpenCallback !== null)
        this.userOpenCallback(this);
};

FantifoClient.prototype.getCurrentFrameIndex = function (animTime) {
    var len = this.frameList.length;
    for(var i = 0; i < len; i++) {
        var nextFrame = i + 1;
        if(animTime >= this.frameList[i].time &&
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

    if(currentFrameIndex != this.currentFrameIndex) {
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
    var data = JSON.parse(event.data);

    switch (data.type) {
        case MessageType.SYNC_SIGNAL:
            this.latency = (Date.now() - data.timeStamp) / 2;
            this.timeOffset = Date.now() - data.serverTimeStamp + this.latency;
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

FantifoClient.prototype.testLatency = function () {
    var request = {
        type: MessageType.REQUEST_SYNC_SIGNAL,
        timeStamp: Date.now()
    };

    this.socket.send(JSON.stringify(request));
};

FantifoClient.prototype.requestStart = function(when) {
    var request = {
        type: MessageType.REQUEST_START_SIGNAL,
        adminToken: 'IAMADMIN',
        when: when
    };
    this.socket.send(JSON.stringify(request));
}
