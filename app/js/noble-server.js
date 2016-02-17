//@author richardsmartinjr@gmail.com 
var webSocketServer = require('websocket').server;
var http = require('http');
var noble = require('noble');
var connection;

var webSocketsServerPort = 1337;
var server = http.createServer(function(request, response) {
});
server.listen(webSocketsServerPort, function() {
    console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});

var wsServer = new webSocketServer({
    httpServer: server
});

wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');

    //accept request and start connection
    connection = request.accept(null, request.origin); 

    console.log((new Date()) + ' Connection accepted.');

    // user disconnected
    connection.on('close', function(connection) {
        console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
    });

});

//Scan for available IMUDuinos
noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    console.log('Starting to Scan...');
    noble.startScanning(serviceUUIDs, allowDuplicates);
  }
});

var serviceUUIDs = ["6e400001b5a3f393e0a9e50e24dcca9e"]; // default: [] => all
var allowDuplicates = false; // default: false

//Discover IMUduinos
noble.on('discover', function(peripheral) {
    console.log('Found device with local name: ' + peripheral.advertisement.localName);
    console.log('peripheral uuid: ' + peripheral.uuid);
    console.log('advertising the following service uuid\'s: ' + peripheral.advertisement.serviceUuids);
    //timeout required to discover all devices
    setTimeout(function() {
        noble.stopScanning();
        console.log('Scanning stopped');
        console.log("Attempting to connect to :"+peripheral.uuid);
        //Connect to IMUduinos
        peripheral.connect(function(error) {
            console.log('connected to peripheral: ' + peripheral.uuid);
            //limit to only advertised service
            peripheral.discoverServices(null, function(error, services) {
                var advertisedService = services[0];
                console.log(services[0]);
                console.log('discovered service: '+advertisedService.uuid);
                //Discover Charateristcs 
                advertisedService.discoverCharacteristics(null,
                function(error, characteristics) {
                    var readBufferCharacteristic = characteristics[1];
                    console.log('discovered characteristic: '+readBufferCharacteristic.uuid);
		    console.log(readBufferCharacteristic);
		    //Read buffer data - This can be 'data' or 'read'
                    readBufferCharacteristic.on('data', function(state){
			var data = String.fromCharCode(state[0])+String.fromCharCode(state[1])+String.fromCharCode(state[2])+String.fromCharCode(state[3])+String.fromCharCode(state[4])+'|'+String.fromCharCode(state[5])+String.fromCharCode(state[6])+String.fromCharCode(state[7])+String.fromCharCode(state[8])+String.fromCharCode(state[9])+'|'+String.fromCharCode(state[10])+String.fromCharCode(state[11])+String.fromCharCode(state[12])+String.fromCharCode(state[13])+String.fromCharCode(state[14])+'|'+String.fromCharCode(state[15])+String.fromCharCode(state[16])+String.fromCharCode(state[17])+String.fromCharCode(state[18])+String.fromCharCode(state[19])+String.fromCharCode(state[20]);
                        console.log(new Date().getTime()+" : "+peripheral.uuid+" : "+data);
			//console.log(JSON.stringify( { time: new Date().getTime(), id: peripheral.uuid, data: data} ));
			if (connection){
				//connection.sendUTF(JSON.stringify( { time: new Date().getTime(), id: peripheral.uuid, data: data} ));
//				connection.sendUTF(new Date().getTime()+" : "+peripheral.uuid+" : "+String.fromCharCode(state[0])+String.fromCharCode(state[1])+String.fromCharCode(state[2])+String.fromCharCode(state[3])+String.fromCharCode(state[4])+'|'+String.fromCharCode(state[5])+String.fromCharCode(state[6])+String.fromCharCode(state[7])+String.fromCharCode(state[8])+String.fromCharCode(state[9])+'|'+String.fromCharCode(state[10])+String.fromCharCode(state[11])+String.fromCharCode(state[12])+String.fromCharCode(state[13])+String.fromCharCode(state[14]));
                connection.sendUTF(JSON.stringify( { time: new Date().getTime(), id: peripheral.uuid, w: String.fromCharCode(state[0])+String.fromCharCode(state[1])+String.fromCharCode(state[2])+String.fromCharCode(state[3])+String.fromCharCode(state[4]), x: String.fromCharCode(state[5])+String.fromCharCode(state[6])+String.fromCharCode(state[7])+String.fromCharCode(state[8])+String.fromCharCode(state[9]), y: String.fromCharCode(state[10])+String.fromCharCode(state[11])+String.fromCharCode(state[12])+String.fromCharCode(state[13])+String.fromCharCode(state[14]), z: String.fromCharCode(state[15])+String.fromCharCode(state[16])+String.fromCharCode(state[17])+String.fromCharCode(state[18])+String.fromCharCode(state[19])+String.fromCharCode(state[20])}));
			}
                    });
                    readBufferCharacteristic.notify(true);
                });
            });
//            peripheral.disconnect(function(error) {
//                console.log('disconnected from peripheral: ' + peripheral.uuid);
//            });
        });
        //console.log("Done discovering: "+peripheral.uuid);
        //console.log();
    }, 999);
});
