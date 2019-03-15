#!/usr/bin/env node

var colors = require('colors');
var cp = require('child_process');
var notifier = require('node-notifier');
var path = require('path');

var Socket = require('./socket');

const HOST = "broadcastlv.chat.bilibili.com";
const PORT = 2245;

const CID = parseInt(process.argv[2]);

if (!CID) process.exit(1);

var socket = new Socket({
    host: HOST,
    port: PORT
});

socket.on('connected', function() {
    console.log("[系统] 与服务器连接已建立。".bold.green);
});

socket.on('login', function(num) {
    console.log(("[系统] 在线人数 " + num.toString()).bold.blue);
});

socket.on('close', function() {
    console.log("[系统] 连接中断，正在重新连接...".bold.green);
    socket.connect(CID);
});

socket.on('server_error', function(error) {
    console.log("[异常] " + error);
});

socket.on('error', function(error) {
    console.log("[错误] " + error);
});

socket.on('comment', function(data) {
    var date, msg, username = '',
        text = '',
        info;

    switch (data.cmd) {
        case 'DANMU_MSG':
            info = data.info;

            date = info[0][4];
            msg = html_decode(info[1]);
            date = DateFormat(date, 'hh:mm:ss');

            if (info.length >= 3) {
                username = info[2][1];
            }

            text += "[弹幕] ".bold.green;
            text += ('[' + date + '] ').yellow;
            text += username.cyan.bold + ": ";

            text += msg.bold;

            console.log(text);

            // notify(username, msg);

            // say(msg);

            break;
        case 'SEND_GIFT':
            info = data.data;

            text += "[礼物] ".bold.magenta;
            text += info.uname.bold.cyan + info.action + info.giftName.bold.red + ('x' + info.num).bold;

            console.log(text);

            // notify('礼物', info.uname + info.action + info.giftName + 'x' + info.num);
            
            if (info.giftName == '辣条' && parseInt(info.num) < 10) { break; }
            if (info.uname == '人工智障') { break; }
            if (info.giftName == '烤红薯' && parseInt(info.num) < 10) { break; }
            
            // say('感谢' + info.uname + info.action + '的' + info.num + '个' + info.giftName);

            break;
        case 'WELCOME':
            info = data.data;
            text += "[欢迎] ".bold.red;
            if (info.svip) {
                text += (info.uname + " 年费老爷").yellow.bold;
            } else if (info.vip) {
                text += (info.uname + " 老爷").red.bold;
            }
            text += "进入直播间".bold;

            console.log(text);

            // say('欢迎' + info.uname + '老爷' + '进入直播间');

            break;
        case 'SYS_GIFT':
            // text += data.msg.bold.green;

            // console.log(text);

            break;
        default:
            // console.log(data);
    }
});

socket.connect(CID);

function html_decode(s) {
    if (s.length == 0) return "";
    s = s.replace(/&gt;/g, "&");
    s = s.replace(/&lt;/g, "<");
    s = s.replace(/&gt;/g, ">");
    s = s.replace(/&nbsp;/g, " ");
    s = s.replace(/&#39;/g, "\'");
    s = s.replace(/&quot;/g, "\"");
    s = s.replace(/<br>/g, "\n");
    return s;
}

function DateFormat(time, fmt) {
    time = new Date(time * 1000);
    var o = {
        "M+": time.getMonth() + 1,
        "d+": time.getDate(),
        "h+": time.getHours(),
        "m+": time.getMinutes(),
        "s+": time.getSeconds(),
        "q+": Math.floor((time.getMonth() + 3) / 3),
        "S": time.getMilliseconds()
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (time.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

function say(msg) {
    if (process.platform == 'darwin')
        cp.spawn('say', [msg]);
}

function notify(title, msg) {
    notifier.notify({
      title: title,
      message: msg,
      // icon: path.join(__dirname, 'icon.png'),
      // sound: 'Glass',
      wait: false
    }, function(err, response) {
      // console.log(response);
    });
}

notifier.on('click', function(notifierObject, options) {
  cp.exec('open -a Terminal');
});

// notifier.on('timeout', function(notifierObject, options) {
//   console.log(notifierObject, options);
// });

process.on('SIGINT', function() {
    console.log();
    console.log("[系统] 正在断开与服务器的连接...".bold.green);
    socket.disconnect();
    console.log("[系统] 服务器连接已断开。".bold.green);
    console.log("[系统] 正在结束进程...".bold.green);
    process.exit(0);
});
