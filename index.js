var net = require("net");

const LOCAL_SERVER_PORT = process.argv[2] || process.env.PORT;
if (!LOCAL_SERVER_PORT) {
  console.log("Please specify the local port number.");
  process.exit();
}
const REMOTE_SERVER_HOST = process.argv[3] || "urhs.online";
const REMOTE_SERVER_PORT = process.argv[4] || 1995;

var lastSubdomain;
var shouldReconnectRemote = true;
var lastRemoteConnection;

const activeStreams = {};

/**
 * This function removes an additional header from the received data.
 */
function removeMultistreamHeader(data) {
  return [data.slice(0, 2).readUInt16BE(0), data.slice(2, data.length)];
}

/**
 * This function adds an additional header to the connection to handle multiple streams
 */
function addMultistreamHeader(data, streamNumber) {
  //create header
  const multistreamHeader = Buffer.alloc(2);
  multistreamHeader.writeUInt16BE(streamNumber, 0);
  const len = Buffer.alloc(2);
  len.writeUInt16BE(data.length);
  return Buffer.concat([multistreamHeader, len, data]);
}

/**
 * This function handles the connection to the local server, sets up connection listeners
 * and forward the data from the local socket to the remote server.
 */
function connectToTarget(remote, streamNumber) {
  const target = net.createConnection(LOCAL_SERVER_PORT, "localhost");

  function killStream() {
    remote.write(addMultistreamHeader(Buffer.from("dataend"), streamNumber));
    target.end();
    delete activeStreams[streamNumber];
  }

  target.on("data", function(data) {
    const buf = addMultistreamHeader(
      data.slice(0, Math.floor(data.length / 2)),
      streamNumber
    );
    remote.write(buf);
    const buf2 = addMultistreamHeader(
      data.slice(Math.floor(data.length / 2), data.length),
      streamNumber
    );
    remote.write(buf2);
  });

  target.on("end", function() {
    killStream();
  });

  target.on("error", function() {
    killStream();
  });

  return target;
}

/**
 * This function handles the connection to the remote server sets up listeners on the connection
 * and forwards the data from the remote connection to the local one.
 */
function connectToRemote() {
  if (!shouldReconnectRemote) {
    return;
  }
  var subdomain;
  var secret;
  const remote = net.createConnection(REMOTE_SERVER_PORT, REMOTE_SERVER_HOST);
  remote.setNoDelay();
  lastRemoteConnection = remote;

  remote.on("data", function(data) {
    if (!subdomain) {
      dataChunks = data.toString().split(":");
      subdomain = dataChunks[0];
      if (dataChunks[1]) secret = dataChunks[1];
      if (subdomain !== lastSubdomain) {
        console.log("Your domain:", "http://" + subdomain + ".urhs.online");
        //console.log("Secret: ", secret);
      }
      lastSubdomain = subdomain;
    } else {
      var [streamNumber, _data] = removeMultistreamHeader(data);
      var socket = activeStreams[streamNumber];
      if (!socket) socket = connectToTarget(remote, streamNumber);
      socket.write(_data);
    }
  });

  remote.on("end", function() {
    remote.end();
    connectToRemote();
  });

  remote.on("error", function(err) {
    remote.end();
    connectToRemote();
  });
}

connectToRemote();

/**
 * To kill the process with STR-C
 */
process.on("SIGINT", function() {
  console.log("Caught interrupt signal");
  shouldReconnectRemote = false;
  if (lastRemoteConnection) {
    lastRemoteConnection.write(addMultistreamHeader(Buffer.from("end"), 0));
    lastRemoteConnection.end();
    process.exit();
  }
});
