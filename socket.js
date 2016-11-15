var net = require("net"),
    events = require("events"),
    util = require("util");

function Socket(e) {
    events.EventEmitter.call(this);
    this.base = e;
    this.version = 1;
    this.state = 0;
    this.timer = null;
    var c = {};
    c.buffer = new Buffer(0);
    c.callback = null;
    c._readSocketData = function(b) {
        c.callback && (this.buffer = Buffer.concat([this.buffer, b]), (function() {
            if (c.callback)
                for (; this.buffer.length > 0;) {
                    var b = this.buffer.readUInt32BE(0);
                    if (this.buffer.length < b) break;
                    if (this.buffer.length < 6) break;
                    var a = this.buffer.readUInt16BE(4);
                    if (b < a) break;
                    switch (this.buffer.readUInt32BE(8)) {
                        case 3:
                            this.callback("login", this.buffer.readUInt32BE(a));
                            break;
                        case 5:
                            a = this.buffer.slice(a, b).toString("utf8");
                            try {
                                a = JSON.parse(a);
                            } catch (d) {
                                return this.callback("error", "数据异常");
                            }
                            this.callback("comment", a);
                            break;
                        case 8:
                            this.callback("connected");
                            break;
                        case 17:
                            this.callback("error", "服务器更新");
                    }
                    this.buffer = this.buffer.slice(b);
                }
            }.bind(this))());
    };
    this.buffer = c;
    this.buffer.callback = function(b, c) { this.emit(b, c); }.bind(this);
    this.client = new net.Socket();
    this.client.setEncoding("binary");
    this.client.on("data", function(b) {
        b = new Buffer(b, "binary");
        1 <= b.length && this.buffer._readSocketData(b);
    }.bind(this));
    this.client.on("error", function(b) {
        this.state = 0;
        clearTimeout(this.timer);
        this.emit("server_error", b);
    }.bind(this));
    this.client.on("close", function() {
        this.state = 0;
        clearTimeout(this.timer);
        this.emit("close");
    }.bind(this));
    this.timerHandler = function() {
        this._sendSocketData(16, 16, 1, 2);
    }.bind(this);
}
util.inherits(Socket, events.EventEmitter);
Socket.prototype.connect = function(e, d) {
    0 == this.state && this.client.connect(this.base.port, this.base.host, function() {
        var c = {};
        c.roomid = e;
        d || (d = 1E14 + parseInt((2E14 * Math.random()).toFixed(0)));
        c.uid = d;
        c = JSON.stringify(c);
        this._sendSocketData(16 + c.length, 16, this.version, 7, 1, c);
        this.state = 1;
        this.timer = setInterval(this.timerHandler, 2E4);
    }.bind(this));
};
Socket.prototype.send = function(e) {
    return this.client.write(e) ? (this.state = 1, !0) : !1;
};
Socket.prototype.disconnect = function() {
    this.client.destroy();
};
Socket.prototype._sendSocketData = function(e, d, a, c, b, g) {
    var f = new Buffer(e);
    f.writeUInt32BE(e, 0);
    f.writeUInt16BE(d, 4);
    f.writeUInt16BE(a, 6);
    f.writeUInt32BE(c, 8);
    f.writeUInt32BE(b || 1, 12);
    g && f.write(g, d);
    this.send(f);
};
module.exports = Socket;