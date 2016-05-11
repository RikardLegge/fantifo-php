declare type $ = any;
declare type FantifoProxy = (callback:() => void) => void

const INVALID_FRAME_INDEX = -1;
const MessageType = {
    // Server to client
    SYNC_SIGNAL: 1,
    START_SIGNAL: 2,
    STOP_SIGNAL: 3,

    // Client to server
    REQUEST_SYNC_SIGNAL: 11,
    REQUEST_START_SIGNAL: 12,
    REQUEST_STOP_SIGNAL: 13,
};

interface Frame {
    r:number,
    g:number,
    b:number,
    time:number
}

class EventEmitter {
    private eventMap = {};

    private ensureEMExists(name:string) {
        this.eventMap[name] = this.eventMap[name] || [];
    }

    on(name:string, method:(event:any)=>any) {
        this.ensureEMExists(name);
        this.eventMap[name].push(method);
    }

    un(name:string, method:(event:any)=>any) {
        const stack = this.eventMap[name];
        if (stack) {
            this.eventMap[name] = stack.filter((it)=>it != method);
        }
    }

    emit(name:string, data?:any) {
        const stack = this.eventMap[name];
        if (stack) {
            stack.forEach((it)=> it(data));
        }
    }
}

interface FantifoNetworkResponse {
    type:string
}
interface FantifoNetworkParams {
    receiveProxy?:FantifoProxy,
    sendProxy?:FantifoProxy,
}
class FantifoNetwork extends EventEmitter {
    private socket:WebSocket;
    private host:string;

    protected latency = 0;
    protected timeOffset = 0;
    protected latencyTestInterval = 3000;

    public proxies = {
        send: null,
        receive: null
    };

    constructor(host:String, params?:FantifoNetworkParams) {
        super();

        this.on('open', (e)=>this.onOpen(e));
        this.on('pre:message', (e)=>this.receivedMessage(e));
    }

    connect() {
        this.socket = new WebSocket(this.host);
        this.socket.onopen = (e)=>this.emit('open', e);
        this.socket.onmessage = (e)=>this.emit('pre:message', e);

        this.emit("connect");
    }

    onOpen(event) {
        this.sendLatencyTest();

        setInterval(()=>this.sendLatencyTest, this.latencyTestInterval);
    }

    receivedMessage(event) {
        const data:FantifoNetworkResponse = JSON.parse(event.data);

        // If  a receiver proxy exists on the object, use it. Otherwise fall back on the default method
        this.proxies.receive
            ? this.proxies.receive((data)=>this.postReceiveMessage(data), data)
            : this.postReceiveMessage(data);
    }

    postReceiveMessage(data) {
        // Emits three types of messages, we can choose which one to use in the future
        this.emit('message', data);
        this.emit(`message:${data.type}`, data);
        this.emit(`${data.type}`, data);
    }

    sendMessage(message:string) {
        // If  a send proxy exists on the object, use it. Otherwise fall back on the default method
        this.proxies.send
            ? this.proxies.send((message)=>this.postSendMessage(message), message)
            : this.postSendMessage(message);
    }

    postSendMessage(message:string) {
        this.socket.send(message);
    }

    sendLatencyTest() {
        const request = {
            type: MessageType.REQUEST_SYNC_SIGNAL,
            timeStamp: Date.now()
        };

        this.sendMessage(JSON.stringify(request));
    }
}

interface FantifoClientParams extends FantifoNetworkParams {
}
export class FantifoClient extends FantifoNetwork {
    private $target:$;
    private frameList:Array<Frame>;
    private currentFrameIndex:number = INVALID_FRAME_INDEX;
    private absStartTime:number = -1;

    constructor($target:$, frameList:Array<Frame>, host:String, params?:FantifoClientParams) {
        super(host, params);

        this.$target = $target;
        this.frameList = frameList;

        // Listen to these messages which are passed by the underlying network client
        this.on(`message:${MessageType.SYNC_SIGNAL}`, (e)=>this.onSync(e));
        this.on(`message:${MessageType.START_SIGNAL}`, (e)=>this.onStart(e));
        this.on(`message:${MessageType.STOP_SIGNAL}`, (e)=>this.onStop(e));
    }

    onSync(event) {
        const now = Date.now();
        this.latency = (now - event.timeStamp) / 2;
        this.timeOffset = now - (event.serverTimeStamp + this.latency);

        console.log(`SYNC: ${this.timeOffset}`);
    }

    onStart(event) {
        this.absStartTime = event.when - this.timeOffset;
        this.tick();

        console.log(`START at ${event.when}`);
    }

    onStop(event) {
        console.log("STOP");
    }

    getCurrentFrameIndex(ellapsedTime) {
        const len = this.frameList.length;
        for (let i = 0; i < len; i++) {
            let nextFrame = i + 1;
            if (ellapsedTime >= this.frameList[i].time &&
                ellapsedTime < this.frameList[nextFrame].time) {
                return i;
            }
        }
        return INVALID_FRAME_INDEX;
    }

    tick() {
        const now = Date.now() - this.timeOffset;
        const $target = this.$target;

        // Calculate animation time, then use that to calculate the current frame
        const singleLoopTime = this.frameList[this.frameList.length - 1].time;
        const animationTime = (now - this.absStartTime) % singleLoopTime;
        const currentFrameIndex = this.getCurrentFrameIndex(animationTime);

        if (currentFrameIndex != this.currentFrameIndex) {
            const frame = this.frameList[currentFrameIndex];
            const r = frame.r;
            const g = frame.g;
            const b = frame.b;

            $target.css('background', 'rgb(' + r + ',' + g + ',' + b + ')');

            this.currentFrameIndex = currentFrameIndex;
        }

        requestAnimationFrame(()=>this.tick);
    }
}

declare type Proxy = (resolve:()=>void)=>void;
export class FantifoNetworkMocker {
    static DefaultProxy:Proxy = FantifoNetworkMocker.RandomFixedLatencyProxy(1000);

    maxLatency = 1000;
    serverTimeOffset = -2000;
    target:FantifoNetwork;
    proxy:Proxy;

    constructor(target:FantifoNetwork, proxy?:Proxy) {
        this.target = target;
        this.proxy = proxy ? proxy : FantifoNetworkMocker.DefaultProxy;

        target.proxies.send = (method, data)=>this.sendProxy(method, data);
        target.proxies.receive = (method, data)=>this.receiveProxy(method, data);
    }

    sendProxy(_, data) {
        const event = {
            timeStamp: data.timeStamp,
            serverTimeStamp: data.timeStamp + this.serverTimeOffset
        };

        this.target.receivedMessage(JSON.stringify(event));
    }

    receiveProxy(resolve, data) {
        this.proxy(()=>resolve(data));
    }

    static RandomFixedLatencyProxy(maxLatency):Proxy {
        const latency = Math.random() * maxLatency;
        console.log("Generated latency " + latency);

        return (resolve) => {
            setTimeout(resolve, latency);
        }
    }
}
