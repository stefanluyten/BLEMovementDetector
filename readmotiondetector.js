var noble = require('noble');
var async = require('async');

// PUBNUB
var pubnub = require("pubnub")({
    ssl           : true,  // <- enable TLS Tunneling over TCP
    publish_key   : "pub-c-34f43669-27d6-4263-a29c-0d18c07ca0e2",
    subscribe_key : "sub-c-c5948442-3e27-11e6-8b3b-02ee2ddab7fe"
});

var serviceUUIDs = ["180F"]; // default: [] => all
/*var characteristicUUIDs = ["2A19"];*/


var movement = false;
var lastmovement = false;
var message = "";
var nobleState;

go(0);


function go(i){

if(i) {

	if (nobleState === 'poweredOn') {
  		console.log("start scanning ...");
    	noble.startScanning(serviceUUIDs, true);
 	} else {
    	noble.stopScanning();
 	}	
} else {

	noble.on('stateChange', function(state) {
 		if (state === 'poweredOn') {
 			nobleState = state;
  			console.log("start scanning ...");
    		noble.startScanning();
 		} else {
    		noble.stopScanning();
 		}

 		console.log(state);
 		var date = new Date().format();
		message = { "Timestamp status" : date, "Last system status" : state};
		pubnub.publish({
    		channel   : "motion",
    	message   : message,
    	callback  : function(e) { 
    	 	console.log( "SUCCESS!", e );
    	},
    	error     : function(e) { 
        	 console.log( "FAILED! RETRY PUBLISH!", e )
    	}
    	});
	});
}

noble.on('discover', function(peripheral) {
	console.log('peripheral with ID ' + peripheral.id + ' ('+peripheral.advertisement.localName +') found');
	//console.log(peripheral);
	if(peripheral.advertisement.localName === "Genuino Motion Sensor"){
		console.log("Hebbes");
    	peripheral.connect(function(error){
    		console.log("trying to connect...");
    		peripheral.once('disconnect', function() {
    			console.log("Disconnected");
    			//noble.stopScanning();
    			go(1);
  			});
    		//peripheral.discoverAllServicesAndCharacteristics(function(error, services, characteristics){
    		var serviceUUIDs = ["180d"];
        	var characteristicUUIDs = ["2a37"];
    		peripheral.discoverSomeServicesAndCharacteristics(serviceUUIDs, characteristicUUIDs, function(error, services, characteristics){
				//console.log(error);
				
				//if(services[0].uuid === "180f") {

				console.log(services[0].uuid);
				console.log(characteristics[0].uuid);

				characteristics[0].subscribe(function(error){
					characteristics[0].on('data', function(data, isNotification){		
						var date = new Date().format();
						//console.log(date+" -"+parseInt(data[0])+"-");
						if(parseInt(data[0]) == 1)
						{
							movement = true;
							if(movement != lastmovement) {
								console.log("movement");
								message = { "Timestamp" : date, "Last status" : "Movement started"};
								pubnub.publish({
            						channel   : "motion",
            						message   : message,
            						callback  : function(e) { 
        	    						console.log( "SUCCESS!", e );
            						},
            						error     : function(e) { 
              							console.log( "FAILED! RETRY PUBLISH!", e );
            						}
    							});
							}
						} else {
							movement = false;
							if(movement != lastmovement) {
								console.log("stop movement");
								message = { "Timestamp" : date, "Last status": "Movement ended"};
								pubnub.publish({
            						channel   : "motion",
            						message   : message,
            						callback  : function(e) { 
            							console.log( "SUCCESS!", e );
            						},
            						error     : function(e) { 
              							console.log( "FAILED! RETRY PUBLISH!", e );
            						}
	    						});
							}
						}
						lastmovement = movement;
					});
				});
				//} // if serviceuuid

			});
    	});
	}
});
}

Date.prototype.format = function() {
   var yyyy = this.getFullYear().toString();
   var mm = (this.getMonth()+1).toString(); 
   var dd  = this.getDate().toString();
   var hrs = this.getHours().toString();
   var mins = this.getMinutes().toString();
   return (dd[1]?dd:"0"+dd[0])+"/"+(mm[1]?mm:"0"+mm[0])+"/"+yyyy+" "+(hrs[1]?hrs:"0"+hrs[0])+":"+(mins[1]?mins:"0"+mins[0]);
  };

function explore(peripheral) {
  console.log('services and characteristics:');

  peripheral.on('disconnect', function() {
    process.exit(0);
  });

  peripheral.connect(function(error) {
    peripheral.discoverServices([], function(error, services) {
      var serviceIndex = 0;

      async.whilst(
        function () {
          return (serviceIndex < services.length);
        },
        function(callback) {
          var service = services[serviceIndex];
          var serviceInfo = service.uuid;

          if (service.name) {
            serviceInfo += ' (' + service.name + ')';
          }
          console.log(serviceInfo);

          service.discoverCharacteristics([], function(error, characteristics) {
            var characteristicIndex = 0;

            async.whilst(
              function () {
                return (characteristicIndex < characteristics.length);
              },
              function(callback) {
                var characteristic = characteristics[characteristicIndex];
                var characteristicInfo = '  ' + characteristic.uuid;

                if (characteristic.name) {
                  characteristicInfo += ' (' + characteristic.name + ')';
                }

                async.series([
                  function(callback) {
                    characteristic.discoverDescriptors(function(error, descriptors) {
                      async.detect(
                        descriptors,
                        function(descriptor, callback) {
                          return callback(descriptor.uuid === '2901');
                        },
                        function(userDescriptionDescriptor){
                          if (userDescriptionDescriptor) {
                            userDescriptionDescriptor.readValue(function(error, data) {
                              if (data) {
                                characteristicInfo += ' (' + data.toString() + ')';
                              }
                              callback();
                            });
                          } else {
                            callback();
                          }
                        }
                      );
                    });
                  },
                  function(callback) {
                        characteristicInfo += '\n    properties  ' + characteristic.properties.join(', ');

                    if (characteristic.properties.indexOf('read') !== -1) {
                      characteristic.read(function(error, data) {
                        if (data) {
                          var string = data.toString('ascii');

                          characteristicInfo += '\n    value       ' + data.toString('hex') + ' | \'' + string + '\'';
                        }
                        callback();
                      });
                    } else {
                      callback();
                    }
                  },
                  function() {
                    console.log(characteristicInfo);
                    characteristicIndex++;
                    callback();
                  }
                ]);
              },
              function(error) {
                serviceIndex++;
                callback();
              }
            );
          });
        },
        function (err) {
          peripheral.disconnect();
        }
      );
    });
  });
}