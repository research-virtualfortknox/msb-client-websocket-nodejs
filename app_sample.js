/*
 * This is a test client for the MSB Node.js client library.
 *
 * Copyright (c) 2019 Fraunhofer Institute for Manufacturing Engineering and Automation (IPA)
 * Authors: Daniel Stock, Matthias Stoehr
 *
 * Licensed under the Apache License, Version 2.0
 * See the file "LICENSE" for the full license governing this code.
 */

'use strict';

// Import the required modules:
const MsbClient = require('./src/msb_client');

// define service properties as constructor parameters,
// var type = 'SmartObject';
// var uuid = uuidv4();
// var name = 'SmartObject ' + uuid;
// var description = 'SmartObject Desc' + uuid;
// var token = uuid.substring(0, 7);
// var myMsbClient = new MsbClient(
//   type, uuid, name , description, token
// );
// otherwise the application.properties file will be read
var myMsbClient = new MsbClient();

// var msb_url = 'wss://localhost:8084';
// var msb_url = 'ws://localhost:8085';
var msb_url = 'ws://ws.msb.edu.virtualfortknox.de';
// var msb_url = 'ws://ws2.msb.edu.virtualfortknox.de';

// enable debug log messages (default = false).
myMsbClient.enableDebug(true);

// enable data format and message data validation (default = false)
// might impact performance
myMsbClient.enableDataFormatValidation(true);

// enable auto reconnect for the client (default = false).
myMsbClient.disableAutoReconnect(false);

// set the reconnect interval time (default = 10000 ms).
myMsbClient.setReconnectInterval(10000);

// enable event message cache which stores messages in case of a connection loss (default = true).
myMsbClient.disableEventCache(true);

// set event cache size (default = 1000 message events).
myMsbClient.setEventCacheSize(1000);

// disables hostname verification for ssl (default = false).
myMsbClient.disableHostnameVerification(true);

// add new configuration parameters
// configuration parameters are published to the MSB and can be changed from the MSB GUI in real time
// (key, value, format)
myMsbClient.addConfigParameter('testParam1', true, 'boolean');
myMsbClient.addConfigParameter('testParam2', 'StringValue', 'string');
myMsbClient.addConfigParameter('testParam3', 1000, 'int32');

// change a configuration parameter locally
// (key, value)
// myMsbClient.changeConfigParameter('testParam3', 3333);

// get a configuration parameter value
// (key)
// myMsbClient.getConfigParameter('testParam3');

// Add events to the client
// You can add events with simple data formats like this:
// addEvent('eventId', 'eventName', 'eventDescription', 'dataType', 'priority', isArray)
// dataType: string, byte, date-time, int32, int64, float, double, boolean
// priority: 'LOW', 'MEDIUM', 'HIGH' or 0, 1, 2
// isArray: true, false;
// parameter 1 (‘SIMPLE_EVENT1’): internal event name reference (inside program code)
// parameter 2 (‘Simple event 1’): MSB event name (visible in MSB GUI)
// parameter 3 ('Description simple event 1’): description which shows up in MSB GUI
// parameter 4 (string): type of event payload
// parameter 5 (1): event priority – value range: [0, 1, 2] (low, medium, high)
// parameter 6 (optional): True if payload is an array of parameter 4
myMsbClient.addEvent('SIMPLE_EVENT1', 'Simple event 1', 'Description simple event 1', 'string', 'LOW', false);
myMsbClient.addEvent('SIMPLE_EVENT2', 'Simple event 2', 'Description simple event 2', 'int64', 0, true);

// if the event doesn't have a payload, just pass null as the data type parameter
myMsbClient.addEvent('SIMPLE_EVENT3', 'Simple event 3', 'Description simple event 3', null, 0, false);

// define a data format by passing the final data format as a valid string or JSON string,
// the array function parameter will be ignored
myMsbClient.addEvent('SIMPLE_EVENT4', 'Simple event 4', 'Description simple event 4', JSON.stringify({
  type: 'array',
  items: {type: 'integer', format: 'int32'},
}), 0, true);

// you can define events also directly as objects for more complex data formats
myMsbClient.addEvent({
  eventId: 'EVENT1',
  name: 'Event 1',
  description: 'Description for Event 1',
  dataFormat: {
    dataObject: {
      type: 'string',
    },
  },
  implementation: {
    priority: 'MEDIUM',
  },
});

myMsbClient.addEvent({
  eventId: 'EVENT2',
  name: 'Event 2',
  description: 'Description for Event 2',
  dataFormat: {
    dataObject: {
      type: 'number', format: 'float',
    },
  },
  implementation: {
    priority: 1,
  },
});

// you can also add self-defined complex data formats (see Device)
myMsbClient.addEvent({
  eventId: 'EVENT3',
  name: 'Event 3',
  description: 'Description for Event 3',
  dataFormat: {
    dataObject: {
      type: 'object', $ref: '#/definitions/Device',
    },
    Device: {
      type: 'object',
      properties: {
        value1: {
          type: 'number', format: 'float',
        },
        value2: {
          type: 'number', format: 'float',
        },
        value3: {
          type: 'number', format: 'float',
        },
      },
    },
  },
  implementation: {
    priority: 1,
  },
});

myMsbClient.addEvent({
  eventId: 'EVENT4',
  name: 'Event 4',
  description: 'Description for Event 4',
  dataFormat: {
    dataObject: {
      type: 'array',
      items: {
        type: 'integer',
        format: 'int32',
      },
    },
  },
  implementation: {
    priority: 'MEDIUM',
  },
});

myMsbClient.addEvent({
  eventId: 'EVENT5',
  name: 'Event 5',
  description: 'Description for Event 5',
  dataFormat: {
    dataObject: {
      type: 'array',
      items: {
        $ref: '#/definitions/Device',
      },
    },
    Device: {
      type: 'object',
      properties: {
        value1: {
          type: 'number', format: 'float',
        },
        value2: {
          type: 'number', format: 'double',
        },
        value3: {
          type: 'integer', format: 'int32',
        },
        submodules: {
          type: 'array',
          items: {
            $ref: '#/definitions/Module',
          },
        },
      },
    },
    Module: {
      type: 'object',
      properties: {
        modname: {
          type: 'string',
        },
      },
    },
  },
  implementation: {
    priority: 1,
  },
});

// self-define complex data formats and events programatically:
myMsbClient.createComplexDataFormat('ComplexObject1');
myMsbClient.createComplexDataFormat('ComplexObject2');
myMsbClient.addProperty('ComplexObject2', 'superprop', 'int32', true);
myMsbClient.addProperty('ComplexObject1', 'megaprop', 'ComplexObject2', false);
myMsbClient.addEvent('COMPLEX_EVENT', 'Complex event', 'Description complex event', 'ComplexObject1', 'LOW', false);

// Add functions to the client
// You can add functions with simple data formats like this:
// addFunction('function1', 'Function 1', 'Description for Function 1', 'string', printMsg, false);
// dataType: string, byte, date-time, int32, int64, float, double, boolean
// isArray: true, false;
// parameter 1 (‘function1’): internal functiont name reference (inside program code)
// parameter 2 (‘Function 1’): MSB function name (visible in MSB GUI)
// parameter 3 ('Description for Function 1’): description which shows up in MSB GUI
// parameter 4 (string): type of function payload
// parameter 5 (printMsg): function pointer to the function to be executed with the payload
// parameter 6 (optional): True if payload is an array of parameter 4
// add simple functions to the client that can be triggered from msb
myMsbClient.addFunction('function1', 'Function 1', 'Description for Function 1', 'string', printMsg, false);

// this is equal to this:
// add functions directly as objects to the client
// msbClient.addFunction({
//     functionId: 'function1',
//     name: 'Function 1',
//     description: 'Description for Function 1',
//     dataFormat: {
//        dataObject: {
//          type: 'string'
//        }
//      },
//     implementation: function(msg) {
//         console.info('function1 has been called, message: ' + msg.dataObject);
//     }
// });

// Optionally, you can add responseEvents by their eventId (define and add the respective events first)
// this example has no response events.
myMsbClient.addFunction({
  functionId: 'function2',
  name: 'Function 2',
  description: 'Description for Function 2',
  dataFormat: {
    dataObject: {
      type: 'number', format: 'float',
    },
  },
  responseEvents: [],
  implementation: function(msg) {
    console.info('function1 has been called, message:' + msg.dataObject);
  },
});

// you can also add self-defined complex data formats (see Device)
myMsbClient.addFunction({
  functionId: 'function3',
  name: 'Function 3',
  description: 'Description for Function 3',
  dataFormat: {
    dataObject: {
      type: 'object', $ref: '#/definitions/Device',
    },
    Device: {
      type: 'object',
      properties: {
        value1: {
          type: 'number', format: 'float',
        },
        value2: {
          type: 'number', format: 'float',
        },
        value3: {
          type: 'number', format: 'float',
        },
      },
    },
  },
  responseEvents: [],
  implementation: function(msg) {
    console.info('function1 has been called, message:' + msg.dataObject);
  },
});

// function is used to demonstrate function pointer
function printMsg(msg) {
  console.info('PrintMsg: ' + JSON.stringify(msg));
}

// function is used to demonstrate function pointer
function printParameter() {
  console.info('PrintParameter:', myMsbClient.getConfigParameter('testParam3'));
}

// function is used to demonstrate function pointer sending a response event
function sendResponseEventExample(msg) {
  console.info('PrintMsg: ' + JSON.stringify(msg));
  // You can also pass a JSON to the publish function with only specific fields:
  //   eventId: 'eventId'
  //   value: 'value'
  //   priority = 1
  //   cached: true
  //   postDate: new Date().toISOString()
  //   correlationId: correlationId
  //
  // eventId and value are required fields
  myMsbClient.publish({
    eventId: 'EVENT1',
    value: msg.dataObject,
    correlationId: msg.correlationId,
  });
}

// define a function in line and pass a complex data format,
// the last parameter is an array of event ids of arrays which act as response events (optional)
myMsbClient.addFunction('function4', 'Function 4', 'Description for Function 4',
  'ComplexObject1', printMsg, true, ['EVENT1', 'EVENT2']);

// fefine a function in line and pass a dimplr data format,
// the last parameter is an array of event ids of arrays which act as response events (optional)
// This example has one response event, multiple can be added.
myMsbClient.addFunction('functionWithResponse', 'Function with Response', 'Description for Function with Response',
  'string', sendResponseEventExample, false, ['EVENT1']);

// if the function is not requiring any parameters null can be passed for the data format,
// the isArray parameter can be omitted
myMsbClient.addFunction('function5', 'Function 5', 'Description for Function 5', null, printParameter);

// get the self desctiption to see all added configs, events and functions so far
console.info(JSON.stringify(myMsbClient.getSelfDescription(), null, 4));

// connect to the MSB websocket interface, if you call the .connect function without any parameters,
// the standard values from the application.properties file will be used.
myMsbClient.connect(msb_url);
// myMsbClient.connect();

// register client on MSB
myMsbClient.register();

// send an event with a short delay, check the connection state before you send events.
// You can also send events directly, but they will be put into event buffer if no connection has been established yet.
setTimeout(function() {
  setInterval(sendData, 5000);
}, 3000);

function sendData() {
  if (myMsbClient.isRegistered()) {

    // uncomment the events you want to publish iteratively
    myMsbClient.publish('SIMPLE_EVENT1', 'Hello World!');
    // myMsbClient.publish('SIMPLE_EVENT3');
    // myMsbClient.publish('SIMPLE_EVENT4', [1, 2, 3, 4, 5, 6]);
    myMsbClient.publish('EVENT1', randomInt(50, 100).toString(), true);
    // myMsbClient.publish('EVENT2', randomInt(50, 100));
    // When setting an event value the provided dataObject has to have
    // the exact format as the dataObject in the event description.
    // myMsbClient.publish('EVENT3', {value1: 3.3, value2: 4.4, value3: 5.5});

    // myMsbClient.publish('COMPLEX_EVENT', {
    //   megaprop:
    //     {
    //       superprop: [17, 17]
    //     }
    // });

    // myMsbClient.publish('EVENT5', [
    //   { value1: 1.0, value2: 1.2, value3: 1, submodules: [{modename: 'Module 1'}, {modname: 'Module 2'}]},
    //   { value1: 1.1, value2: 4.5, value3: 6, submodules: [{modename: 'Module 1'}, {modname: 'Module 2'}]},
    // ]);

    // use can disconnect by calling
    // myMsbClient.disconnect();

  } else {
    console.info('Client not registered on MSB!');
  }
}

function randomInt(low, high) {
  return Math.floor(Math.random() * (high - low) + low);
}
