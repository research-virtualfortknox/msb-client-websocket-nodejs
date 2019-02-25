
/*
 * This class is a VFK MSB client library for Node.js, to connect to VFK MSB websocket interface.
 *
 * Copyright (c) 2019 Fraunhofer Institute for Manufacturing Engineering and Automation (IPA)
 * Authors: Daniel Stock, Matthias Stoehr
 *
 * Licensed under the Apache License, Version 2.0
 * See the file "LICENSE" for the full license governing this code.
 */

'use strict';

const WebSocket = require('ws');
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');
const fs = require('fs');
const Ajv = require('ajv');
const uuidv4 = require('uuid/v4');

// ajv is used to validate specified dataformats of the msb client
// array of unknown format names will be ignored
const ajv = new Ajv({unknownFormats: ['float', 'double', 'int32', 'int64']});
// explicitly add the meta-schema (json) to the validator instance
ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));

// ConnectionStateController is used to emit and listen on msb connection states
// by using the internal Node.js messaging
let ConnectionStateController = function() {
  EventEmitter.call(this);
};
util.inherits(ConnectionStateController, EventEmitter);

// main configuration for the msb connection and client identification
let config = {
  msb_url: '',
  msb_url_with_wspath: '',
  identity: {
    type: '',

    uuid: '', // https://www.uuidgenerator.net/version4
    token: '',

    name: '',
    description: '',
  },
};

/**
 * Helper function to parse main configuration param by param name from the application.properties file
 * @param {string} paramName - The name of the configuration parameter
 * @returns {*} value of the parameter
 */
const getParamFromFile = function(paramName) {
  let paramValue, configArray;
  if (fs.existsSync(__dirname + '/../application.properties')) {
    configArray = fs.readFileSync(__dirname + '/../application.properties').toString().split(/\r?\n/);
  } else if (fs.existsSync(__dirname + '/application.properties')) {
    configArray = fs.readFileSync(__dirname + '/application.properties').toString().split(/\r?\n/);
  }
  // iterate config array to find param value for param name
  for (let i in configArray) {
    if (configArray.hasOwnProperty(i)) {
      let params = configArray[i].split('=');
      if (configArray[i] !== '' && params[1] !== undefined && params[0] === paramName) {
        paramValue = params[1];
      }
    }
  }
  return paramValue;
};

// if the application.properties file is present if can be used to automatically initialize the client
if (fs.existsSync(__dirname + '/../application.properties') || fs.existsSync(__dirname + '/application.properties')) {
  config.server = {};
  config.identity = {};
  config.settings = {};

  // MSB server URL config
  config.msb_url = getParamFromFile('msb.url');
  // UUID
  config.identity.uuid = getParamFromFile('msb.uuid');
  // name
  config.identity.name = getParamFromFile('msb.name');
  // description
  config.identity.description = getParamFromFile('msb.description');
  // token
  config.identity.token = getParamFromFile('msb.token');
  // type - Change class type accordingly (Application/SmartObject)
  config.identity.type = getParamFromFile('msb.type');
}

/**
 * Contains all valid MSB message types
 * @type {string[]}
 */
const MSBMessageTypes = [
  'IO',
  'NIO',
  'IO_CONNECTED',
  'IO_REGISTERED',
  'IO_PUBLISHED',
  'NIO_ALREADY_CONNECTED',
  'NIO_REGISTRATION_ERROR',
  'NIO_UNEXPECTED_REGISTRATION_ERROR',
  'NIO_UNAUTHORIZED_CONNECTION',
  'NIO_EVENT_FORWARDING_ERROR',
  'NIO_UNEXPECTED_EVENT_FORWARDING_ERROR',
];

/**
 * The MSB client object
 * If no parameters are provided an application.properties file with the main configuration needs to be present.
 * Otherwise the config data can be provided as constructor parameters
 *
 * @param {string} _serviceType - the service type of the service ('Application' or 'SmartObject')
 * @param {string} _uuid - the uuid of the service as valid V4 UUID
 * @param {string} _name - the name of the service
 * @param {string} _description - the description of the service
 * @param {string} _token - the token of the service used to verify service via MSB GUI or Rest
 * @returns {MsbClient} a msb client object to specify the service and handle MSB connection
 * @constructor
 */
const MsbClient = function(_serviceType, _uuid, _name, _description, _token) {

  // check if constructor params are presetn to set main confituration
  if (_serviceType && _uuid && _name && _description && _token) {
    config.identity.type = _serviceType;
    config.identity.uuid = _uuid;
    config.identity.name = _name;
    config.identity.description = _description;
    config.identity.token = _token;
  }

  if (!(this instanceof MsbClient)) {
    return new MsbClient();
  }

  let my = this;

  // init basic settings for the msb client
  initSettings(my);

  /**
   * Read a client config parameter from application.properties
   * @param {string} paramName - The name of the configuration parameter
   * @returns {*} value of the parameter
   */
  this.getParamFromFile = function(paramName) {
    return getParamFromFile(paramName);
  };

  /* eslint-disable max-len */
  /**
   * Get the configuration object of the client.
   * @returns {{msb_url: string, identity: {type: string, uuid: string, token: string, name: string, description: string}}}
   */
  this.getConfig = function() {
  /* eslint-enable max-len */
    return config;
  };

  /* eslint-disable max-len */
  /**
   * Generate the self description JSON object of the application or smart object.
   * @returns {{uuid: string, name: string, description: string, token: string, @class: string, events: Array, functions: Array, configuration: ({}|*)}}
   */
  this.getSelfDescription = function() {
  /* eslint-enable max-len */
    let self_description = {
      uuid: config.identity.uuid,
      name: config.identity.name,
      description: config.identity.description,
      token: config.identity.token,
      '@class': config.identity.type,
      events: [],
      functions: [],
      configuration: my.configuration,
    };
    // clone all events to self description
    _.forIn(_.cloneDeep(my.events), function(value) {
      self_description.events.push(_.omit(value, ['implementation']));
    });
    // clone all functions to self description
    _.forIn(_.cloneDeep(my.functions), function(value) {
      self_description.functions.push(_.omit(value, ['implementation']));
    });
    return self_description;
  };

  /**
   * Create a new complex data format object with empty properties.
   * Properties have to be added by using addProperty function.
   * @param {string} dataFormat - The name of the new self-defined complex data format.
   */
  this.createComplexDataFormat = function(dataFormat) {
    let cdf = {};
    cdf['type'] = 'object';
    cdf['properties'] = {};
    cdf['df_meta'] = [];
    cdf['df_meta'].push(dataFormat);
    my.dataFormats[dataFormat] = cdf;
  };

  /**
   * Add a new property to a complex data format by its name.
   * @param {string} dataFormat - The name of the self-defined complex data format
   * @param {string} property - The name of the property to add to the data format.
   * @param {string} dataType - The datatype of the property. Could also be another complex data format.
   * @param {boolean} isArray - Specifies it the property defines an array of object or just one object
   */
  this.addProperty = function(dataFormat, property, dataType, isArray) {
    // check if data type is a simple data format
    if (!my.dataFormats.hasOwnProperty(dataType)) {
      if (isArray) {
        my.dataFormats[dataFormat]['properties'][property] = {};
        my.dataFormats[dataFormat]['properties'][property]['type'] = 'array';
        my.dataFormats[dataFormat]['properties'][property]['items'] = getDataType(dataType);
      } else {
        my.dataFormats[dataFormat]['properties'][property] = getDataType(dataType);
      }
    } else {
      // otherwise data type is itself a complex data format
      // need to be added to meta of the parent data format
      my.dataFormats[dataFormat]['df_meta'].push(dataType);
      if (isArray) {
        my.dataFormats[dataFormat]['properties'][property] = {};
        my.dataFormats[dataFormat]['properties'][property]['type'] = 'array';
        my.dataFormats[dataFormat]['properties'][property]['items'] = {};
        my.dataFormats[dataFormat]['properties'][property]['items']['$ref'] = '#/definitions/' + dataType;
      } else {
        my.dataFormats[dataFormat]['properties'][property] = {};
        my.dataFormats[dataFormat]['properties'][property]['$ref'] = '#/definitions/' + dataType;
      }
    }
  };

  /**
   * Add a new function to the msb client and its self-description.
   * @param {(string|object)} functionObject - Either the function ID or an object containing all function params
   * @param {string} functionName - The name of the function
   * @param {string} functionDescription - The description of the function
   * @param {string} functionDataFormat - The dataformat handled by the function (simple of complex data format)
   * @param {function} functionPointer - The function implementation to be called for incoming events
   * @param {boolean} isArray - Specifies if the function handles an object array or ust an object of the data
   * @param {integer-array} responseEvents - The array of event IDs to be send as response events
   */
  this.addFunction = function(
    functionObject, functionName, functionDescription, functionDataFormat, functionPointer, isArray, responseEvents
  ) {
    if (functionObject.functionId) {
      addFunctionObject(my, functionObject);
    } else {
      // here functionObject is just the functionId
      var createdFunctionObject = createFunctionObject(
        my,
        functionObject,
        functionName,
        functionDescription,
        functionDataFormat,
        functionPointer,
        isArray,
        responseEvents
      );
      addFunctionObject(my, createdFunctionObject);
    }
  };

  /**
   * Add a new event to the client and its self-description.
   * @param {(string|object)} eventObject - Either the event ID or an object containing all event params
   * @param {string} eventName - The name of the event
   * @param {string} eventDescription - The description of the event
   * @param {string} eventDataType - The data type of the event (simple of complex type)
   * @param {(string|integer)} priority - The priority of the event (LOW,MEDIUM,HIGH) or (0,1,2)
   * @param {boolean} isArray - Specifies if the event handles an object array or just an object of the data
   */
  this.addEvent = function(eventObject, eventName, eventDescription, eventDataType, priority, isArray) {
    if (eventObject.eventId) {
      addEventObject(my, eventObject);
    } else {
      // here eventObject is just the eventId
      var created_event_object = createEventObject(
        my,
        eventObject,
        eventName,
        eventDescription,
        eventDataType,
        priority,
        isArray
      );
      addEventObject(my, created_event_object);
    }
  };

  /**
   * Validate the value for an event to match its data format.
   * @param {string} eventId - The event ID
   * @param {*} eventValue - The event value to be validated
   * @returns {boolean} result of validation
   */
  this.validateEventValue = function(eventId, eventValue) {
    return validateEvent(my, eventId, eventValue);
  };

  /**
   * This function sends the event of the provided event ID.
   * Optionally the value can be provided, otherwise the last set value will be used.
   * The priority can aso be set, otherwise the standard value for the event's priority will be used.
   * A postDate can be optionally provided, otherwise the current timestamp will be used.
   * @param {string} eventId - The corresponding event id
   * @param {*} value - The value to be published
   * @param {(string|integer)} priority - The priority of the event (LOW,MEDIUM,HIGH) or (0,1,2)
   * @param {boolean} cached - Specifies wether this event will be added to cache if MSB is currently not reachable
   * @param {date} postDate - the post date of the event (e.g. new Date().toISOString();)
   * @param {string} correlationId - The correlation id of the event used to idetify events in multi-step flows
   */
  this.publish = function(eventId, value, priority, cached, postDate, correlationId) {
    publish(my, eventId, value, priority, cached, postDate, correlationId);
  };

  /**
   * Add a new configuration parameter to the client.
   * Configuration parameters can be used to change client behaviour ny changing its values via MSB GUI.
   * @param {string} key - The key (name) of the configuration parameter
   * @param {*} value - The initial value of the configuration parameter
   * @param {string} format - The simple data format of the confituration parameter
   * @throws Will throw an error if the format is boolean and the value cannot be parsed as boolean.
   */
  this.addConfigParameter = function(key, value, format) {
    // create new configuration parameter
    let newConfigParam = {};
    // handle different values for boolean params (either string or boolean value)
    if (format === 'boolean') {
      try {
        if (typeof value === 'string') {
          newConfigParam['value'] = JSON.parse(value.toLowerCase());
        } else if (typeof value === 'boolean') {
          newConfigParam['value'] = value;
        }
      } catch (e) {
        var err = 'Error parsing boolean configuration parameter.';
        printDebug(my, err);
        throw err;
      }
    } else {
      // for all other formats, just assign the value
      newConfigParam['value'] = value;
    }
    // get complete data type based on single forrmat string
    let dataType = getDataType(format);
    newConfigParam['type'] = dataType.type.toUpperCase();
    if (dataType.format){
      newConfigParam['format'] = dataType.format.toUpperCase();
    }
    // add new configuration parameter for key
    my.configuration.parameters[key] = newConfigParam;
  };

  /**
   * Get the value of a configuration parameter.
   * @param {string} key - The key (name) of the configuration parameter
   * @returns {*} the value of the configuration parameter or undefined if not found
   */
  this.getConfigParameter = function(key) {
    if (my.configuration.parameters[key]) {
      return my.configuration.parameters[key]['value'];
    } else {
      return undefined;
    }
  };

  /**
   * Change the value of a configuration parameter.
   * @param {string} key - The key (name) of the configuration parameter
   * @param {*} value - The new value of the configuration parameter
   * @throws Will throw an error if the configuation parameter cannot be changed.
   */
  this.changeConfigParameter = function(key, value) {
    // only change configuration params if connected to MSB, as they are also stored there within the self-description
    if (my.connected && my.registered) {
      if (my.configuration.parameters[key]) {
        // temp save old value if it needs to be recovered
        var oldValue = my.configuration.parameters[key]['value'];
        my.configuration.parameters[key]['value'] = value;
        // update self-description on MSB
        try {
          if (my.sockJsFraming) {
            my.socket.send('["R ' + JSON.stringify(JSON.stringify(my.getSelfDescription())).slice(1, -1) + '"]',
              function(error) {
                if (error !== undefined)
                  console.error('Async error:' + error);
              });
          } else {
            my.socket.send('R ' + JSON.stringify(my.getSelfDescription()), function(error) {
              if (error !== undefined)
                console.error('Async error:' + error);
            });
          }
        } catch (e) {
          console.error('Sync error: ' + e);
          // as new config value could not be updated on msb, reset it
          my.configuration.parameters[key]['value'] = oldValue;
          my.socket.close(1, e);

          let err = new Error('Could not change congig parameter. Failed updating selfdescription via websocket');
          printDebug(my, err);
          throw err;
        }
      } else {
        let err = 'Could not change congig parameter. Key not found.';
        printDebug(my, err);
        throw err;
      }
    } else {
      let err = 'Could not change congig parameter. No active MSB connection.';
      printDebug(my, err);
      throw err;
    }
  };

  /**
   * Enables or disables the debug logging for the msb client.
   * @param {boolean} enabled - Used to either enable (true) or disable (false) debug logging.
   */
  this.enableDebug = function(enabled) {
    my.debug = enabled;
  };

  /**
   * Enables or disables data format and message format validation
   * (mainly for development, can be disabled in production to improve performance)
   * @param {boolean} enabled - Used to either enable (true) or disable (false) format validation
   */
  this.enableDataFormatValidation = function(enabled) {
    my.dataFormatValidation = enabled;
  };

  /**
   * Disables or enables auto reconnect for the client if connection to MSB gets lost.
   * @param {boolean} disabled - Used to either disable (true) or enable (false) auto reconnect
   */
  this.disableAutoReconnect = function(disabled) {
    my.autoReconnect = !disabled;
  };

  /**
   * Set the interval in ms for automatic reconnects if connection to MSB gets lost.
   * @param {integer} interval - The interval value in ms (>=3000) for automatic reconnections
   */
  this.setReconnectInterval = function(interval) {
    if (interval < my.reconnectIntervalMin) {
      my.reconnectInterval = my.reconnectIntervalMin;
      console.warn('Interval set to 3000 ms, cannot be set lower than 3000 ms.');
    } else {
      my.reconnectInterval = interval;
    }
  };

  /**
   * Sets the keepalive interval for the client-side heartbeat in ms for the WS connection.
   * This is required if their is no server-side heartbeat.
   * @param {boolean} enabled - Used to enable (true) or disable (false) the keep alive functionality
   * @param {integer} interval - Client-side heartbeat interval value in ms
   */
  this.setKeepAlive = function(enabled, interval) {
    my.keepAlive = enabled;
    my.heartbeat_interval = interval;
  };

  /**
   * Called each time the callback for client-side heartbeat was received successfully.
   */
  this.heartbeat = function() {
    my.socket.isAlive = true;
    printDebug(my, 'CLIENT-SIDE HEARTBEAT');
  };

  /**
   * Disables or enables the sockJs framing.
   * @param {boolean} disabled  - Used to either disable (true) or enable (false) sockJs framing
   */
  this.disablesockJsFraming = function(disabled) {
    my.sockJsFraming = !disabled;
  };

  /**
   * Disables or enables checking for self-signed SSL certificates (disable it e.g. for development)
   * @param {boolean} disabled - Used to either disable (true) or enable (false) ssl checks
   */
  this.disableHostnameVerification = function(disabled) {
    my.sslopts['rejectUnauthorized'] = !disabled;
  };

  /**
   * Disables or enables the event cache, which will save sent events if no active MSB connection is present.
   * @param {boolean} disabled - Used to either disable (true) or enable (false) event cache
   */
  this.disableEventCache = function(disabled) {
    my.eventCacheEnabled = !disabled;
  };

  /**
   * Sets the size (max number of events) of the event cahe.
   * If the max is reached, oldest entry gets dismissed.
   * @param {integer} size - The site of the event cache (event entries)
   */
  this.setEventCacheSize = function(size) {
    my.eventCacheSize = size;
  };

  /**
   * Connects the client to the MSB.
   * The msb_url parameter is optional. If not provided the msb_url will be read from the application.properties
   * @param {string} msb_url - The url of the MSB to connect to (http(s)://host:port or ws(s)://host:port)
   */
  this.connect = function(msb_url) {
    // check url and add complete websocket path to url
    checkUrl(my, msb_url).then(function() {
      connect(my).catch(function(err) {
        console.error(err);
        process.exit(1);
      });
    }).catch(function(err) {
      console.error(err);
    });
  };

  /**
   * Disconnects the client from an MSB.
   */
  this.disconnect = function() {
    disconnect(my);
  };

  /**
   * Check if the client has an active connection to the MSB.
   * @returns {boolean} if the client is connected to MSB
   */
  this.isConnected = function() {
    return my.connected;
  };

  /**
   * Registers the client on the MSB.
   */
  this.register = function() {
    register(my);
  };

  /**
   * Check if the client has an active and registered connection to the MSB.
   * @returns {boolean} if the client is registered on MSB
   */
  this.isRegistered = function() {
    return my.registered;
  };

  /**
   * Get a connection state listener object to listen to the internal Node.js messaging for msb clientconnection states.
   * @returns {ConnectionStateListener} the sonncetion state listener to listen on connection state changes
   */
  this.getConnectionStateListener = function() {
    return my.connectionStateController;
  };

};

/**
 * Converts priority strings to integer
 * @param {(string|integer)} priority - The priority to be converted (LOW,MEDIUM,HIGH) or (0,1,2)
 * @returns {integer} priority as integer value (0,1,2)
 */
function convertPriority(priority) {
  if (priority === 'HIGH' || priority === 2) {
    priority = 2;
  } else if (priority === 'MEDIUM' || priority === 1) {
    priority = 1;
  } else {
    // for LOW, 0, or invalid value, set 0
    priority = 0;
  }
  return priority;
}

/**
 * Adds a new function object to the client
 * @param {MsbClient} my - The msb client instance
 * @param {*} functionObject - The function object with all required properties
 */
function addFunctionObject(my, functionObject) {
  // check if defined response events are in added events
  let eventIdArray = [];
  if (functionObject['responseEvents']) {
    functionObject['responseEvents'].forEach(function(response_event) {
      var foundEvent = false;
      for (let event in my.events) {
        if (my.events.hasOwnProperty(event) && my.events[event].eventId === response_event) {
          foundEvent = true;
          let ev = my.events[event];
          // add event to array
          eventIdArray.push(ev['@id']);
        }
      }
      // if event was defined in reponse event but not found in clients events, throw error
      if (!foundEvent){
        let err = new Error(
          'Error creating Function ' + functionObject.functionId + ': Response event ' + response_event + ' not found!'
        );
        printDebug(my, err);
        throw err;
      }
    });
    // set new array of validated response events
    functionObject.responseEvents = eventIdArray;
  }
  if (!my.functions.hasOwnProperty(functionObject.functionId)) {
    // check if function has a valid dataformat
    if (validateFunctionDataFormatSpecification(functionObject)) {
      my.functions[functionObject.functionId] = functionObject;
    } else {
      let err = new Error('Function ' + functionObject.functionId + ' has an invalid dataformat!');
      printDebug(my, err);
      throw err;
    }
  } else {
    let err = new Error('Function ' + functionObject.functionId + ' already in functions, change function id!');
    printDebug(my, err);
    throw err;
  }
}

/**
 * Cretes a function object by single params
 * @param {MsbClient} my - The msb client instance
 * @param {string} _functionId - Either the function ID or an object containing all function params
 * @param {string} functionName - The name of the function
 * @param {string} functionDescription - The description of the function
 * @param {string} functionDataFormat - The dataformat handled by the function (simple of complex data format)
 * @param {function} functionPointer - The function implementation to be called for incoming events
 * @param {boolean} isArray - Specifies if the function handles an object array or ust an object of the data
 * @param {integer-array} _responseEvents - The array of event IDs to be send as response events
 * @returns {object} the function object
 */
function createFunctionObject(
  my, _functionId, functionName, functionDescription, functionDataFormat, functionPointer, isArray, _responseEvents
) {
  // init function object
  let newFunctionObject = {
    functionId: _functionId,
    name: functionName,
    description: functionDescription,
    dataFormat: {},
    responseEvents: _responseEvents,
    implementation: functionPointer,
  };

  // add the dataformat specification for the new function object
  if (functionDataFormat !== null) {
    newFunctionObject['dataFormat'] = createDataFormatObject(my, functionDataFormat, isArray);
  } else {
    delete newFunctionObject['dataFormat'];
  }

  return newFunctionObject;
}

/**
 * Validates the specified dataformat of a function by using a json schema
 * @param {*} functionObject - The function object to be validated
 * @returns {boolean} if the data format is valid or not
 */
function validateFunctionDataFormatSpecification(functionObject) {
  if (functionObject.dataFormat === undefined) {
    return true;
  }
  let schema = JSON.parse(fs.readFileSync(__dirname + '/function_schema.json', 'utf8'));
  let validate = ajv.compile(schema);
  let valid = validate({definitions: functionObject.dataFormat});
  if (!valid) {
    console.warn('Function schema validation error for: ' + functionObject.functionId);
    console.warn(validate.errors);
    return false;
  } else {
    return true;
  }
}

/**
 * Adds a new event object to the client
 * @param {MsbClient} my - The msb client instance
 * @param {*} eventObject - The event object with all required properties
 */
function addEventObject(my, eventObject) {
  eventObject.implementation.priority = convertPriority(eventObject.implementation.priority);

  // generate id by counting up
  eventObject['@id'] = Object.keys(my.events).length + 1;
  // prepare event implementation
  eventObject.implementation.uuid = config.identity.uuid;
  eventObject.implementation.eventId = eventObject.eventId;
  // check if event is not already set
  if (!my.events.hasOwnProperty(eventObject.eventId)) {
    // check if event has a valid dataformat
    if (validateEventDataFormatSpecification(eventObject)) {
      my.events[eventObject.eventId] = eventObject;
    } else {
      let err = new Error('Event ' + eventObject.eventId + ' has an invalid dataformat!');
      printDebug(my, err);
      throw err;
    }
  } else {
    let err = new Error('Event ' + eventObject.eventId + ' already in events, change event id!');
    printDebug(my, err);
    throw err;
  }
}

/**
 * Cretes an event object by single params
 * @param {MsbClient} my - The msb client instance
 * @param {string} _eventId - The ID of the event
 * @param {string} eventName - The name of the event
 * @param {string} eventDescription - The description of the event
 * @param {string} eventDataType - The data type of the event (simple of complex type)
 * @param {(string|integer)} priority - The priority of the event (LOW,MEDIUM,HIGH) or (0,1,2)
 * @param {boolean} isArray - Specifies if the event handles an object array or just an object of the data
 * @returns {object} the event object
 */
function createEventObject(my, _eventId, eventName, eventDescription, eventDataType, priority, isArray) {
  priority = convertPriority(priority);

  // init event object
  let newEventObject = {
    eventId: _eventId,
    name: eventName,
    description: eventDescription,
    dataFormat: {},
    implementation: {
      uuid: config.identity.uuid,
      eventId: _eventId,
      priority: priority,
      dataObject: null,
    },
  };

  // add the dataformat specification for the new event object
  if (eventDataType !== null) {
    newEventObject['dataFormat'] = createDataFormatObject(my, eventDataType, isArray);
  } else {
    delete newEventObject['dataFormat'];
  }

  return newEventObject;
}

/**
 * Validates the specified dataformat of an event by using a json schema
 * @param {*} eventObject - The event object to be validated
 * @returns {boolean}  if the data format is valid or not
 */
function validateEventDataFormatSpecification(eventObject) {
  if (eventObject.dataFormat === undefined) {
    return true;
  }
  // load json schema
  let schema = JSON.parse(fs.readFileSync(__dirname + '/event_schema.json', 'utf8'));
  // use ajv to compile schema and validate dataformat
  let validate = ajv.compile(schema);
  let valid = validate({definitions: eventObject.dataFormat});
  if (!valid) {
    console.warn('Event schema validation error for: ' + eventObject.eventId);
    console.warn(validate.errors);
    return false;
  } else {
    return true;
  }
}

/**
 * Creates a new data format object to be used in event object or function object
 * @param {MsbClient} my - The msb client instance
 * @param {(string)} _dataType - The simple data type to be used to create the data fortmat object
 * @param {boolean} isArray - Specifies if the data format is an array or not
 * @returns {object} the data format object
 */
function createDataFormatObject(my, _dataType, isArray) {
  // init dataformat object
  var newDataFormatObject = {};
  // check if (root) datatype is a self-defined dataformat (see createComplexDataFormat)
  if (my.dataFormats.hasOwnProperty(_dataType)) {
    // adds all self-defined dataformats to the new dataformat object (all needed to handle this root datatype)
    addNextDataTypeLevelToDataFormatObject(my, _dataType, newDataFormatObject);
    if (isArray) {
      newDataFormatObject['dataObject'] = {type: 'array', items: {$ref: '#/definitions/' + _dataType}};
    } else {
      newDataFormatObject['dataObject'] = {type: 'object', $ref: '#/definitions/' + _dataType};
    }
  } else {
    // if (root) datatype is nNOT a self-defined dataformat, set as a predefined datatype
    // check if datatype is a json string, that need to be parsed as javascript object
    if (isJsonString(_dataType)){
      newDataFormatObject['dataObject'] = JSON.parse(_dataType);
    } else {
      if (isArray) {
        newDataFormatObject['dataObject'] = {type: 'array', items: getDataType(_dataType)};
      } else {
        newDataFormatObject['dataObject'] = getDataType(_dataType);
      }
    }
  }
  return newDataFormatObject;
}

/**
 * Adds all data self-defined data formats of a specified complex datatype to a new data format object.
 * Checks if there are other self-defined data formats listed in meta.
 * Recursively adds all data foramts of meta.
 * @param {MsbClient} my - The msb client instance
 * @param {(string)} _dataType - The simple data type to be used to create the data fortmat object
 * @param {object} newDataFormatObject - The new data format object that is currently under creation
 */
function addNextDataTypeLevelToDataFormatObject(my, _dataType, newDataFormatObject) {
  my.dataFormats[_dataType].df_meta.forEach(function(dt_name) {
    // if there are sub-datatypes referenced in meta, also check their metas recursively
    if (dt_name !== _dataType && !newDataFormatObject[dt_name]) {
      addNextDataTypeLevelToDataFormatObject(my, dt_name, newDataFormatObject);
    }
    // then add all datatypes that are not alreay added (on this level)
    if (!newDataFormatObject[dt_name]) {
      newDataFormatObject[dt_name] = {};
      newDataFormatObject[dt_name] = JSON.parse(JSON.stringify(my.dataFormats[dt_name]));
      delete newDataFormatObject[dt_name]['df_meta'];
    }
  });
}

/**
 *  Validate the event value to match the specified data format
 * @param {MsbClient} my - The msb client instance
 * @param {string} eventId - The ID of the event
 * @param {*} value - The value of the event to be validated
 * @returns {boolean} if the event value is valid or not
 */
function validateEvent(my, eventId, value) {
  if (my.events[eventId].dataFormat.dataObject.type === 'array') {
    // my.events[eventId].implementation.dataObject
    if (my.events[eventId].dataFormat.dataObject.items.$ref && !validateComplexDataFormat(my, eventId, value, true)) {
      return false;
    } else {
      if (!validateSimpleDataFormat(my, eventId, my.events[eventId].dataFormat.dataObject.items.type, value, true)) {
        return false;
      }
    }
  } else {
    if (my.events[eventId].dataFormat.dataObject.$ref && !validateComplexDataFormat(my, eventId, value, false)) {
      return false;
    } else {
      if (!validateSimpleDataFormat(my, eventId, my.events[eventId].dataFormat.dataObject.type, value, false)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Validate simple event value (forwards to array or not array validation)
 * @param {MsbClient} my - The msb client instance
 * @param {string} eventId - The ID of the event
 * @param {string} dataFormat - The data format of the event
 * @param {*} value - The value of the event to be validated
 * @param {boolean} isArray - Specifies if the event data format is an array or not
 * @returns {boolean} if the event value is valid or not
 */
function validateSimpleDataFormat(my, eventId, dataFormat, value, isArray) {
  if (dataFormat === undefined) {
    return true;
  }
  if (isArray) {
    return validateSimpleDataFormatArray(my, eventId, dataFormat, value);
  } else {
    return validateSimpleDataFormatNotArray(my, eventId, dataFormat, value);
  }
}

/**
 * Validate simple event value not as array
 * @param {MsbClient} my - The msb client instance
 * @param {string} eventId - The ID of the event
 * @param {string} dataFormat - The data format of the event
 * @param {*} value - The value of the event to be validated
 * @returns {boolean} if the event value is valid or not
 */
function validateSimpleDataFormatNotArray(my, eventId, dataFormat, value) {
  // check for dataformats
  if ((dataFormat === 'integer' && isInt(value))
  || (dataFormat === 'number' && isFloat(value))
  || (dataFormat === typeof (value))) {
    return true;
  } else {
    console.error('Error validating event ' + eventId + ': '
    + 'Value doesn\'t fit the required data format: '
    + value + ' = ' + typeof (value) + ', expected: ' + dataFormat);
    return false;
  }
}

/**
 * Validate simple event value as array
 * @param {MsbClient} my - The msb client instance
 * @param {string} eventId - The ID of the event
 * @param {string} dataFormat - The data format of the event
 * @param {*} value - The value of the event to be validated
 * @returns {boolean} if the event value is valid or not
 */
function validateSimpleDataFormatArray(my, eventId, dataFormat, value) {
  if (Array.isArray(value)) {
    for (let i in value) {
      // use simple validation per value in array
      if (!validateSimpleDataFormatNotArray(my, eventId, dataFormat, value[i])){
        return false;
      }
    }
    return true;
  } else {
    console.error('Value is not an array as expected by data format definition: ' + value);
    return false;
  }
}

/**
 * Validate complex object as event value
 * @param {MsbClient} my - The msb client instance
 * @param {string} eventId - The ID of the event
 * @param {*} value - The value of the event to be validated
 * @param {boolean} isArray - Specifies if the event data format is an array or not
 * @returns {boolean} if the event value is valid or not
 */
function validateComplexDataFormat(my, eventId, value, isArray) {
  let schema = {};
  if (isArray) {
    schema['items'] = {};
    schema['items']['$ref'] = my.events[eventId].dataFormat.dataObject.items.$ref;
    schema['type'] = 'array';
  } else {
    schema['$ref'] = {};
    schema['$ref'] = my.events[eventId].dataFormat.dataObject.$ref;
    schema['type'] = 'object';
  }
  schema['definitions'] = JSON.parse(JSON.stringify(my.events[eventId].dataFormat));
  delete schema['definitions'].dataObject;

  // validate value using ajv schema validation
  let valid = ajv.validate(schema, value);
  if (!valid) {
    console.warn(ajv.errors);
  }

  return valid;
}

/**
 * Get simple data type object based on specified single format vlaue
 * @param {string} format - The format string to be converted into a data type object
 * @returns {object} the created data type object
 */
function getDataType(format) {
  let dataObject = {};
  if (format === 'string') {
    dataObject['type'] = 'string';
  } else if (format === 'int32') {
    dataObject['type'] = 'integer';
    dataObject['format'] = 'int32';
  } else if (format === 'int64') {
    dataObject['type'] = 'integer';
    dataObject['format'] = 'int64';
  } else if (format === 'integer' || format === 'int') {
    console.warn('Set DataType to int64');
    dataObject['type'] = 'integer';
    dataObject['format'] = 'int64';
  } else if (format === 'double') {
    dataObject['type'] = 'number';
    dataObject['format'] = 'double';
  } else if (format === 'float') {
    dataObject['type'] = 'number';
    dataObject['format'] = 'float';
  } else if (format === 'number') {
    console.warn('Set DataType to double');
    dataObject['type'] = 'number';
    dataObject['format'] = 'double';
  } else if (format === 'date-time') {
    dataObject['type'] = 'string';
    dataObject['format'] = 'date-time';
  } else if (format === 'boolean') {
    dataObject['type'] = 'boolean';
    dataObject['default'] = 'false';
  } else if (format === 'byte') {
    dataObject['type'] = 'string';
    dataObject['format'] = 'byte';
  } else if (format !== null && format !== undefined){
    // so if no valid format and also not null for no payload
    // keep unsupported format, as event validation will throw an error for that
    dataObject['type'] = format;
  }
  return dataObject;
}

/**
 * This function sends the event of the provided event ID.
 * Optionally the value can be provided, otherwise the last set value will be used.
 * The priority can aso be set, otherwise the standard value for the event's priority will be used.
 * A postDate can be optionally provided, otherwise the current timestamp will be used.
 * @see {@link MsbClient#publish}
 * @param {MsbClient} my - The msb client instance
 * @param {string} eventId - The corresponding event id
 * @param {*} value - The value to be published
 * @param {(string|integer)} priority - The priority of the event (LOW,MEDIUM,HIGH) or (0,1,2)
 * @param {boolean} cached - Specifies wether this event will be added to cache if MSB is currently not reachable
 * @param {date} postDate - the post date of the event (e.g. new Date().toISOString();)
 * @param {string} correlationId - The correlation id of the event used to idetify events in multi-step flows
 */
function publish(my, eventId, value, priority, cached, postDate, correlationId) {
  let _eventId;
  let _value;
  let _priority;
  let _cached;
  let _postDate;
  let _correlationId;
  // check if event is defined as event object
  if (eventId.eventId) {
    _eventId = eventId.eventId;
    _value = eventId.value;
    _priority = eventId.priority;
    _cached = eventId.cached;
    _postDate = eventId.postDate;
    _correlationId = eventId.correlationId;
  } else {
    // if not an event object, use single params
    _eventId = eventId;
    _value = value;
    _priority = priority;
    _cached = cached;
    _postDate = postDate;
    _correlationId = correlationId;
  }
  let isCached = false;
  // check if the event should be cached in case of connection problems
  if (typeof _cached !== 'undefined' && (_cached === true || _cached === false)) {
    isCached = _cached;
  }
  // check if value was set in publish method
  if (_value !== undefined && _value !== null) {
    // if set, reuse the set event value method
    my.events[_eventId].implementation.dataObject = _value;
  }
  if (typeof (_priority) !== 'undefined') {
    // to be downward compatible, priority param could also be used to define caching
    if (typeof (_priority) === 'boolean') {
      isCached = _priority;
    } else {
      _priority = convertPriority(_priority);
      my.events[_eventId].implementation.priority = _priority;
    }
  }

  // check if correlation id is used
  if (typeof _correlationId !== 'undefined') {
    my.events[_eventId].implementation.correlationId = _correlationId;
  } else {
    if (my.events[_eventId].implementation.correlationId) {
      delete my.events[_eventId].implementation.correlationId;
    }
  }

  // check if post date was defined
  if (typeof _postDate !== 'undefined') {
    my.events[_eventId].implementation.postDate = _postDate;
  }

  // validate event value (will just log problems, but still publishes the event value)
  if (my.dataFormatValidation && _value !== undefined) {
    validateEvent(my, _eventId, _value);
  }

  // publish event if an active connection exists
  if (my.connected && my.registered) {
    if (my.events[_eventId]) {
      // only publish event implementation
      let _eventImpl = my.events[_eventId].implementation;
      if (_value === undefined || _value === null) {
        delete _eventImpl['dataObject'];
      }
      _eventImpl.postDate = new Date().toISOString();
      publishEventImpl(my, _eventImpl);
    }
  } else {
    // no active connection, so check if event will go to event cache
    if (isCached && my.eventCacheEnabled) {
      printDebug(my, 'Not connected and/or registered, putting event in cache.');
      if (my.events[_eventId]) {
        // only cache event implementation
        let eventImpl = my.events[_eventId].implementation;
        if (_value === undefined || _value === null) {
          delete eventImpl['dataObject'];
        }
        eventImpl.postDate = new Date().toISOString();
        if (my.eventCache.length < my.eventCacheSize) {
          my.eventCache.push(eventImpl);
        } else {
          my.eventCache.shift();
          my.eventCache.push(eventImpl);
        }
      }
    } else {
      if (isCached && !my.eventCacheEnabled) {
        printDebug(my, 'Global cache disabled, message cache flag overridden and discarded.');
      } else {
        printDebug(my, 'Caching disabled, message discarded.');
      }
    }
  }
}

/**
 * Sends a created event implementation (with value) to MSB via websocket
 * @param {MsbClient} my - The msb client instance
 * @param {object} _eventImpl - The event implementation to be sent
 */
function publishEventImpl(my, _eventImpl){
  try {
    if (my.sockJsFraming) {
      my.socket.send('["E ' + JSON.stringify(JSON.stringify(_eventImpl)).slice(1, -1) + '"]', function(error) {
        if (error === undefined)
          printDebug(my, 'Sent >> ' + _eventImpl.eventId + ' >> ' + JSON.stringify(_eventImpl));
        else
          console.error('Async error:' + error);
      });
    } else {
      my.socket.send('E ' + JSON.stringify(_eventImpl), function(error) {
        if (error === undefined)
          printDebug(my, 'Sent >> ' + _eventImpl.eventId + ' >> ' + JSON.stringify(_eventImpl));
        else
          console.error('Async error:' + error);
      });
    }
  } catch (e) {
    console.error('Sync error: ' + e);
    my.socket.close(1, e);
  }
}

/**
 * Check the client's event cache and send its content if a connection is available
 * @param {MsbClient} my - The msb client instance
 */
function checkEventCache(my) {
  if ((my.connected && my.registered) && my.eventCache.length > 0) {
    printDebug(my, 'Event cache size: ' + my.eventCache.length);
    for (let i in my.eventCache) {
      if (my.eventCache.hasOwnProperty(i)) {
        let bufEv = my.eventCache[i];
        printDebug(my, 'Try to resent from cache >> ' + bufEv.eventId);
        publishEventImpl(my, bufEv);
        my.eventCache.splice(i, 1);
      }
    }
  }
}

/**
 * Checks and transforms the msb url into a valid websocket format
 * @param {MsbClient} my - The msb client instance
 * @param {string} msb_url - The url of the MSB (http(s)://host:port or ws(s)://host:port)
 * @returns {Promise} a promise to wait for the url transformation to valid websocket url
 */
function checkUrl(my, msb_url) {
  return new Promise(function(resolve, reject) {
    if (msb_url) {
      config.msb_url = msb_url;
    }
    if (config.msb_url.indexOf('http://') > -1) {
      config.msb_url = config.msb_url.replace('http://', 'ws://');
    } else if (config.msb_url.indexOf('https://') > -1) {
      config.msb_url = config.msb_url.replace('https://', 'wss://');
    }
    if (!(config.msb_url.indexOf('ws://') === 0 | config.msb_url.indexOf('wss://') === 0)) {
      reject('WRONG MSB URL FORMAT: ' + config.msb_url);
    }
    if (my.sockJsFraming) {
      let server_id = Math.floor(Math.random() * 900) + 100; ;
      let session_id = uuidv4().replace(/-/g, '');
      config.msb_url_with_wspath = config.msb_url + '/websocket/data/' + server_id + '/' + session_id + '/websocket';
    } else {
      config.msb_url_with_wspath = config.msb_url + '/websocket/data/websocket';
    }
    // printDebug(my, 'config.msb_url: ' + config.msb_url);
    // printDebug(my, 'config._msb_url: ' + config.msb_url_with_wspath);
    resolve();

  });
}

/**
 * Connects the client to the MSB WebSocket interface.
 * @see {@link MsbClient#connect}
 * @param {MsbClient} my - The msb client instance
 * @returns {Promis} a promise to wait for the connection process result (incl. adding socket listeners)
 */
function connect(my) {
  return new Promise(function(resolve, reject) {
    my.userDisconnect = false;

    printDebug(my, 'Connecting to MSB @ ' + config.msb_url);
    my.socket = new WebSocket(config.msb_url_with_wspath, my.sslopts);

    // config msb connection when socket is open
    my.socket.on('open', function() {
      my.connected = true;
      printDebug(my, 'Socket open');
      // check if keepalive (client-side heartbeat) is enabled
      // if enabled, start heartbeat for ping-pong
      if (my.keepAlive) {
        my.socket.isAlive = true;
        my.heartbeatIntervallId = setInterval(function ping() {
          // if ping-pong need to much time, longer than heartbeat, terminate socket connection
          if (my.socket.isAlive === false){
            console.error('TERMINATE SOCKET: Ping Pong does not transfer heartbeat within heartbeat intervall');
            return my.socket.terminate();
          }
          // if ping-pong ok, prepare next one
          my.socket.isAlive = false;
          my.socket.ping('', true, true);
        }, my.heartbeat_interval);
      }
    });

    // wait for ping-pong with server
    my.socket.on('pong', function() {
      my.heartbeat();
    });

    // on receiving messages from MSB
    my.socket.on('message', function(data) {
      if (my.sockJsFraming) {
        // print out server-side heartbeat
        if (my.debug && data.startsWith('h')) {
          printDebug(my, '♥');
        }
        data = data.slice(3, -2);
      }
      // handle incoming MSB message types (see MSBMessageTypes)
      if (_.includes(MSBMessageTypes, data)) {
        // emit MSB message type to connection state controller
        my.connectionStateController.emit('connectionState', data);
        // check if connection has to be closed (try reconnect)
        if (data === 'NIO_ALREADY_CONNECTED' || data === 'NIO_UNAUTHORIZED_CONNECTION') {
          my.connected = true;
          my.registered = false;
          my.socket.close();
          my.connectionStateController.emit('connectionState', 'CLOSED_AND_RECONNECT');
        } else if (data === 'IO_CONNECTED') {
          // if a reconnect is performed, register with self-description
          if (my.reconnecting) {
            my.reconnecting = false;
            try {
              if (my.sockJsFraming) {
                my.socket.send('["R ' + JSON.stringify(JSON.stringify(my.getSelfDescription())).slice(1, -1) + '"]',
                  function(error) {
                    if (error !== undefined)
                      console.error('Async error:' + error);
                  });
              } else {
                my.socket.send('R ' + JSON.stringify(my.getSelfDescription()), function(error) {
                  if (error !== undefined)
                    console.error('Async error:' + error);
                });
              }
            } catch (e) {
              console.error('Sync error: ' + e);
              my.socket.close(1, e);
            }
            // printDebug(my, JSON.stringify(my.getSelfDescription(), null, 4));
          }
        } else if (data === 'IO_REGISTERED') {
          // if reregistered successfully
          my.registered = true;
          checkEventCache(my);
        }
      } else if (data.startsWith('C')) {
        // if data is not a MSB Message Type and starts with C
        // this is a message to be handled by a function
        let msg;
        try {
          msg = JSON.parse(data.slice(2).replace(/\\"/g, '"'));
          msg['functionParameters'].correlationId = msg.correlationId;
        } catch (err) {
          console.info('Double-stringified JSON string detected... Removing quote escapes. '
          + 'Make sure not to map complex objects to strings.');
          msg = data.slice(2).replace(/\\\\\\"/g, '"');
          msg = msg.replace(/\\"/g, '"');
          msg = msg.replace(/\":\"{\"/g, '\":{\"');
          msg = JSON.parse(msg.replace(/}\"}}/g, '}}}'));
          msg['functionParameters'].correlationId = msg.correlationId;
        }
        printDebug(my, 'received message from MSB: ' + msg);
        // forward function parameters of message to dedicated function implementation
        if (my.functions[msg.functionId]) {
          my.functions[msg.functionId].implementation(msg.functionParameters);
        }
      } else if (data.startsWith('K')) {
        // if start with K, a clients configuration parameter value was changed on MSB
        handleIncomingConfigurationParameters(my, data, reReg);
      }
    });

    // a configuration parameter value was changed on MSB
    // the change need to be handled in client (update value)
    function handleIncomingConfigurationParameters(my, data, reReg) {
      let incoming_config = JSON.parse(data.slice(2).replace(/\\"/g, '"'));
      if (incoming_config['uuid'] === config.identity.uuid) {
        for (let key in incoming_config['params']) {
          if (my.configuration.parameters[key]) {
            my.configuration.parameters[key]['value'] = incoming_config['params'][key];
          }
        }
      }
      reReg(my);
    };

    // resend registration to MSB (self desctiption)
    function reReg() {
      try {
        if (my.sockJsFraming) {
          my.socket.send('["R ' + JSON.stringify(JSON.stringify(my.getSelfDescription())).slice(1, -1) + '"]',
            function(error) {
              if (error === undefined)
                return;
              else
                console.error('Async error:' + error);
            });
        } else {
          my.socket.send('R ' + JSON.stringify(my.getSelfDescription()), function(error) {
            if (error === undefined)
              return;
            else
              console.error('Async error:' + error);
          });
        }
      } catch (e) {
        console.error('Sync error: ' + e);
        my.socket.close(1, e);
      }
      my.connectionStateController.emit('connectionState', 'NEW_PARAMETERS');
    };

    // handle closed MSB connection errors
    my.socket.on('close', function(err) {
      my.connected = false;
      my.registered = false;
      console.warn('CLOSE', err);
      // perorm reconnection (if not canceled by user)
      if (my.autoReconnect & !my.userDisconnect) {
        my.reconnecting = true;
        my.connectionStateController.emit('connectionState', 'CLOSED_AND_RECONNECT');
        printDebug(my, 'Reconnecting in ' + my.reconnectInterval / 1000 + ' seconds...');
        setTimeout(my.connect, my.reconnectInterval);
      }
    });

    // on socket errors
    my.socket.on('error', function(err) {
      console.warn('ERROR', err);
    });

    resolve();
  });
}

/**
 *
 * Disconnects the client
 * @see {@link MsbClient#disconnect}
 * @param {MsbClient} my - The msb client instance
 */
function disconnect(my) {
  console.info('Disconnecting.');
  my.userDisconnect = true;
  // if client-side heartbeat is active, cancel the heartbeat intervall
  if (my.keepAlive && my.heartbeatIntervallId !== undefined){
    clearInterval(my.heartbeatIntervallId);
  }
  my.socket.close();
}

/**
 * Sends registration message to the MSB
 * @see {@link MsbClient#register}
 * @param {MsbClient} my - The msb client instance
 */
function register(my) {
  // set intervall to continuosly try to register if connected
  let regCheck = setInterval(function() {
    if (my.connected & !my.registered) {
      clearInterval(regCheck);
      try {
        if (my.sockJsFraming) {
          my.socket.send('["R ' + JSON.stringify(JSON.stringify(my.getSelfDescription())).slice(1, -1) + '"]',
            function(error) {
              if (error === undefined)
                return;
              else
                console.error('Async error:' + error);
            });
        } else {
          my.socket.send('R ' + JSON.stringify(my.getSelfDescription()), function(error) {
            if (error === undefined)
              return;
            else
              console.error('Async error:' + error);
          });
        }
      } catch (e) {
        console.error('Sync error: ' + e);
        my.socket.close(1, e);
      }
      // printDebug(my, JSON.stringify(my.getSelfDescription(), null, 4));
    }
  }, 100);
}

/**
 * Check if number is an integer
 * @param {number} n - The number to check
 * @returns {boolean} true if the number is an integer
 */
function isInt(n) {
  return Number(n) === n && n % 1 === 0;
}

/**
 * Check if number is an float
 * @param {number} n - The number to check
 * @returns {boolean} true if the number is a float
 */
function isFloat(n) {
  return Number(n) === n && n % 1 !== 0;
}

/**
 * Check if a string is a json string (parseable)
 * @param {string} str
 */
function isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

/**
 * If debugging is activated for the client, it prints the message.
 * @param {MsbClient} my - The msb client instance
 * @param {string} msg - The message to be printed
 */
function printDebug(my, msg) {
  if (my.debug) {
    let date = '[' + new Date().toISOString() + ']';
    console.info(date, msg);
  }
}

/**
 * Will initialize all default msb client parameters
 * @param {MsbClient} my - The msb client instance
 */
function initSettings(my) {

  // debugging
  my.debug = false;
  my.dataFormatValidation = true;

  // connection params
  my.connected = false;
  my.registered = false;
  my.autoReconnect = true;
  my.reconnecting = false;
  my.userDisconnect = false;
  my.reconnectInterval = 10000;
  my.reconnectIntervalMin = 3000;

  // client-side heartbeats
  my.keepAlive = false;
  my.heartbeat_interval = 8000;
  my.heartbeatIntervallId = undefined;

  // sockJs framing
  my.sockJsFraming = true;

  // event caching
  my.eventCache = [];
  my.eventCacheEnabled = true;
  my.eventCacheSize = 1000;
  my.maxMessageSize = 1000000;

  // smart object definition
  my.functions = {};
  my.events = {};
  my.dataFormats = {};
  my.parameters = {};
  my.configuration = {};
  my.configuration['parameters'] = my.parameters;

  // socket
  my.sslopts = {rejectUnauthorized: true};
  my.socket = null;

  // the emitter-based object listens for incoming connection state messages from the MSB
  my.connectionStateController = new ConnectionStateController();
  my.connectionStateController.on('connectionState', function(msg) {
    console.info('[' + new Date().toISOString() + ']', msg);
  });
}

module.exports = MsbClient;
