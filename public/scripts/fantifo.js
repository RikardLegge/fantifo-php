var MessageType = {
    SYNC_SIGNAL: 1,
    START_SIGNAL: 2,
    STOP_SIGNAL: 3
};

// var ImageStruct = {
//     r: 0,
//     g: 0,
//     b: 0,
//     time: 0
// }

function FantifoClient($target, frameList, host) {
    this.socket = null;

    this.host = host;
    this.$target = $target;
    this.latency = 0;
    this.timeOffset = 0;

    this.frameList = frameList;
    this.absStartTime = -1;
    this.numAnimationLoops = 0;
    this.nextFrameIndex = 0;

    this.onMessageFunc = this.onMessage.bind(this);
    this.onOpenFunc = this.onOpen.bind(this);
    this.testLatencyFunc = this.testLatency.bind(this);
    this.tickFunc = this.tick.bind(this);
}

FantifoClient.prototype.connect = function () {
    this.socket = new WebSocket(this.host);
    this.socket.onopen = this.onOpenFunc;
    this.socket.onmessage = this.onMessageFunc;
};

FantifoClient.prototype.onOpen = function () {
    this.testLatency();

    setInterval(this.testLatencyFunc, 3000);
};

FantifoClient.prototype.tick = function () {
    var now = Date.now() - this.timeOffset;
    var $target = this.$target;
    var nextFrame = this.frameList[this.nextFrameIndex];

    // Allow loops through the array by compensating for completed loops
    var singleLoopTime = this.frameList[this.frameList.length - 1].time;
    var fullLoopTime = this.numAnimationLoops * singleLoopTime;

    var time = nextFrame.time + this.absStartTime + fullLoopTime;

    if (now > time) {
        var r = nextFrame.r;
        var g = nextFrame.g;
        var b = nextFrame.b;

        $target.css('background', 'rgb(' + r + ',' + g + ',' + b + ')');

        this.nextFrameIndex++;
        if (this.nextFrameIndex >= this.frameList.length - 1) {
            this.nextFrameIndex = 0;
            this.numAnimationLoops++;
        }
    }

    requestAnimationFrame(this.tickFunc);
};

FantifoClient.prototype.onMessage = function (event) {
    var data = JSON.parse(event.data);

    switch (data.type) {
        case MessageType.SYNC_SIGNAL:
            console.log("SYNC");
            this.latency = (Date.now() - data.timeStamp) / 2;
            this.timeOffset = Date.now() - data.serverTimeStamp + this.latency;

            break;
        case MessageType.START_SIGNAL:
            console.log("START");
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
        type: MessageType.SYNC_SIGNAL,
        timeStamp: Date.now()
    };

    this.socket.send(JSON.stringify(request));
};
