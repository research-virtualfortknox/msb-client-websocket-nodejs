/* eslint-env mocha */
'use strict';

var expect = require('chai').expect;
const MsbClient = require('../src/msb_client');
const uuidGenerator = require('uuid');

/**
 * Test basic client initializazion and client settings functions
 */
describe('Basic Client Initialization', function() {

  it('should get client parameter values from application.properties file', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var expectedParams = [
      'msb.uuid',
      'msb.name',
      'msb.description',
      'msb.token',
      'msb.type',
      'msb.url',
    ];

    var arrayLength = expectedParams.length;
    for (var i = 0; i < arrayLength; i++) {

      // 2. ACT
      var value = myMsbClient.getParamFromFile(expectedParams[i]);

      // 3. ASSERT
      expect(value, 'No value found for param ' + expectedParams[i]).not.to.be.empty;
    }

  });

  it('should get client parameter values if set via MsbClient constructor', function() {

    // 1. ARRANGE
    var type = 'SmartObject';
    var uuid = uuidGenerator.v4();
    var name = 'SO ' + uuid;
    var description = 'SO Desc' + uuid;
    var token = uuid.substring(0, 7);
    var myMsbClient = new MsbClient(
      type,
      uuid,
      name,
      description,
      token
    );

    // 2. ACT
    var config = myMsbClient.getConfig();

    // 3. ASSERT
    expect(config.identity.type).to.be.equal(type);
    expect(config.identity.uuid).to.be.equal(uuid);
    expect(config.identity.name).to.be.equal(name);
    expect(config.identity.description).to.be.equal(description);
    expect(config.identity.token).to.be.equal(token);

  });

  it('should get client status (not connected, not registered)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var expected_isConnected = false;
    var expected_isRegistered = false;

    // 2. ACT

    // 3. ASSERT
    expect(myMsbClient.isConnected()).to.be.equal(expected_isConnected);
    expect(myMsbClient.isRegistered()).to.be.equal(expected_isRegistered);

  });

  it('should update initial client settings if using settings functions', function() {

    // 1. ARRANGE
    // choose settings that change the default values, to check if they get updated as expected
    var debug = true;
    var dataFormatValidation = false;
    var disableEventCache = true;
    var eventCacheSize = 500;
    var disableAutoReconnect = true;
    // min value is 3000
    var reconnectIntervalMinimum = 3000;
    var reconnectInterval = 2000;
    var disableHostNameVerification = true;
    var disableSockJsFraming = true;
    var keepAlive = false;
    var heartbeatInterval = 5000;

    var myMsbClient = new MsbClient();

    // 2. ACT
    myMsbClient.enableDebug(debug);
    myMsbClient.enableDataFormatValidation(dataFormatValidation);
    myMsbClient.disableEventCache(disableEventCache);
    myMsbClient.setEventCacheSize(eventCacheSize);
    myMsbClient.disableAutoReconnect(disableAutoReconnect);
    myMsbClient.setReconnectInterval(reconnectInterval);
    myMsbClient.disableHostnameVerification(disableHostNameVerification);
    myMsbClient.disablesockJsFraming(disableSockJsFraming);
    myMsbClient.setKeepAlive(keepAlive, heartbeatInterval);

    // 3. ASSERT
    expect(myMsbClient.debug).to.be.equal(debug);
    expect(myMsbClient.dataFormatValidation).to.be.equal(dataFormatValidation);
    expect(myMsbClient.eventCacheEnabled).to.be.equal(!disableEventCache);
    expect(myMsbClient.eventCacheSize).to.be.equal(eventCacheSize);
    expect(myMsbClient.autoReconnect).to.be.equal(!disableAutoReconnect);
    expect(myMsbClient.reconnectInterval).to.be.equal(reconnectIntervalMinimum);
    expect(myMsbClient.sslopts['rejectUnauthorized']).to.be.equal(!disableHostNameVerification);
    expect(myMsbClient.sockJsFraming).to.be.equal(!disableSockJsFraming);
    expect(myMsbClient.keepAlive).to.be.equal(keepAlive);
    expect(myMsbClient.heartbeat_interval).to.be.equal(heartbeatInterval);

  });

});


/**
 * Test management of configutation parameters for the client
 */
describe('MSB Client Specification - Configuration Patameter', function() {

  it('should add client configuration params', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var param_name_1 = 'testParam1';
    var param_value_1 = true;
    var param_datatype_1 = 'boolean';

    var param_name_2 = 'testParam2';
    var param_value_2 = 'StringValue';
    var param_datatype_2 = 'string';

    var param_name_3 = 'testParam3';
    var param_value_3 = 1000;
    var param_datatype_3 = 'int32';

    // test parse string to boolean
    var param_name_4 = 'testParam4';
    var param_value_4 = 'TRUE';
    var param_datatype_4 = 'boolean';

    // test parse string to boolean
    var param_name_5 = 'testParam5';
    var param_value_5 = 'TRUE_bug';
    var param_datatype_5 = 'boolean';

    // 2. ACT
    myMsbClient.addConfigParameter(param_name_1, param_value_1, param_datatype_1);
    myMsbClient.addConfigParameter(param_name_2, param_value_2, param_datatype_2);
    myMsbClient.addConfigParameter(param_name_3, param_value_3, param_datatype_3);
    myMsbClient.addConfigParameter(param_name_4, param_value_4, param_datatype_4);
    // add invalid boolean config param
    try {
      myMsbClient.addConfigParameter(param_name_5, param_value_5, param_datatype_5);
    } catch (err) {
      console.error(err);
    }

    // 3. ASSERT
    // get via json object
    var parameters = myMsbClient.configuration.parameters;
    // console.log(parameters);
    var parameterFound_1 = parameters[param_name_1];
    expect(parameterFound_1.value).to.be.equal(param_value_1);
    expect(parameterFound_1.type).to.be.equal(param_datatype_1.toUpperCase());
    var parameterFound_2 = parameters[param_name_2];
    expect(parameterFound_2.value).to.be.equal(param_value_2);
    expect(parameterFound_2.type).to.be.equal(param_datatype_2.toUpperCase());
    var parameterFound_3 = parameters[param_name_3];
    expect(parameterFound_3.value).to.be.equal(param_value_3);
    expect(parameterFound_3.format).to.be.equal(param_datatype_3.toUpperCase());
    var parameterFound_4 = parameters[param_name_4];
    expect(parameterFound_4.value).to.be.equal(JSON.parse(param_value_4.toLowerCase()));
    expect(parameterFound_4.type).to.be.equal(param_datatype_4.toUpperCase());
    // should not find invalid config param
    var parameterFound_5 = parameters[param_name_5];
    expect(parameterFound_5).to.be.a('undefined');

  });

  it('should get value of added client configuration params', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var param_name_1 = 'testParam1';
    var param_value_1 = true;
    var param_datatype_1 = 'boolean';

    var param_name_2 = 'testParam2';
    var param_value_2 = 'StringValue';
    var param_datatype_2 = 'string';

    var param_name_3 = 'testParam3';
    var param_value_3 = 1000;
    var param_datatype_3 = 'int32';

    // 2. ACT
    myMsbClient.addConfigParameter(param_name_1, param_value_1, param_datatype_1);
    myMsbClient.addConfigParameter(param_name_2, param_value_2, param_datatype_2);
    myMsbClient.addConfigParameter(param_name_3, param_value_3, param_datatype_3);
    // get by getConfigParameter using name as key
    var parameterValueFound_1 = myMsbClient.getConfigParameter(param_name_1);
    var parameterValueFound_2 = myMsbClient.getConfigParameter(param_name_2);
    var parameterValueFound_3 = myMsbClient.getConfigParameter(param_name_3);
    // try to get config parameter value that is not available
    var parameterValueFound_Missing = myMsbClient.getConfigParameter('FooBarNotThere');

    // 3. ASSERT
    expect(parameterValueFound_1).to.be.equal(param_value_1);
    expect(parameterValueFound_2).to.be.equal(param_value_2);
    expect(parameterValueFound_3).to.be.equal(param_value_3);
    expect(parameterValueFound_Missing).to.be.a('undefined');

  });

  it('should NOT change value of client configuration params (if not connected)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var param_name_1 = 'testParam1';
    var param_value_1 = true;
    var param_value_new_1 = false;
    var param_datatype_1 = 'boolean';

    var param_name_2 = 'testParam2';
    var param_value_2 = 'StringValue';
    var param_value_new_2 = 'StringValue_new';
    var param_datatype_2 = 'string';

    var param_name_3 = 'testParam3';
    var param_value_3 = 1000;
    var param_value_new_3 = 9999;
    var param_datatype_3 = 'int32';

    // 2. ACT
    myMsbClient.addConfigParameter(param_name_1, param_value_1, param_datatype_1);
    myMsbClient.addConfigParameter(param_name_2, param_value_2, param_datatype_2);
    myMsbClient.addConfigParameter(param_name_3, param_value_3, param_datatype_3);

    // cannot change config parameter if not currently connected to an MSB
    var changed = false;
    try {
      myMsbClient.changeConfigParameter(param_name_1, param_value_new_1);
      myMsbClient.changeConfigParameter(param_name_2, param_value_new_2);
      myMsbClient.changeConfigParameter(param_name_3, param_value_new_3);
      changed = true;
    } catch (err) {
      console.error(err);
    }

    // 3. ASSERT
    // get via json object
    var parameters = myMsbClient.configuration.parameters;
    // console.log(parameters);
    expect(changed).to.be.equal(false);
    var parameterFound_1 = parameters[param_name_1];
    expect(parameterFound_1.value).to.be.equal(param_value_1);
    expect(parameterFound_1.type).to.be.equal(param_datatype_1.toUpperCase());
    var parameterFound_2 = parameters[param_name_2];
    expect(parameterFound_2.value).to.be.equal(param_value_2);
    expect(parameterFound_2.type).to.be.equal(param_datatype_2.toUpperCase());
    var parameterFound_3 = parameters[param_name_3];
    expect(parameterFound_3.value).to.be.equal(param_value_3);
    expect(parameterFound_3.format).to.be.equal(param_datatype_3.toUpperCase());

  });
});


/**
 * Test the creation of client functions
 */
describe('MSB Client Specification - Functions', function() {

  it('should add client function per single params', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var function_id = uuid.substring(0, 7);

    var function_name = 'FUNC ' + function_id;
    var function_description = 'FUNC Description ' + function_id;
    var function_dataformat = 'string';
    var isArray = false;
    var responseEvents = [];

    // 2. ACT
    myMsbClient.addFunction(
      function_id,
      function_name,
      function_description,
      function_dataformat,
      printMsg,
      isArray,
      responseEvents
    );

    // 3. ASSERT
    var functions = myMsbClient.functions;
    // find the matching function by function id
    var functionFound = functions[function_id];
    // console.log(JSON.stringify(functionFound, null, 4));
    // check JSON object for the function for all properties set
    expect(functionFound.functionId).to.be.equal(function_id);
    expect(functionFound.name).to.be.equal(function_name);
    expect(functionFound.description).to.be.equal(function_description);
    expect(functionFound.dataFormat.dataObject.type).to.be.equal(function_dataformat);
    expect(functionFound.implementation).to.be.equal(printMsg);
    expect(functionFound.responseEvents.length).to.be.equal(responseEvents.length);

  });

  it('should add client function per function object', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var function_id = uuid.substring(0, 7);

    var function_name = 'FUNC ' + function_id;
    var function_description = 'FUNC Description ' + function_id;
    var function_dataformat = 'string';
    var responseEvents = [];

    // 2. ACT
    myMsbClient.addFunction({
      functionId: function_id,
      name: function_name,
      description: function_description,
      dataFormat: {dataObject: {type: function_dataformat}},
      responseEvents: responseEvents,
      implementation: printMsg,
    });

    // 3. ASSERT
    var functions = myMsbClient.functions;
    // find the matching function by function id
    var functionFound = functions[function_id];
    // check JSON object for the function for all properties set
    // console.log(JSON.stringify(functionFound, null, 4));
    expect(functionFound.functionId).to.be.equal(function_id);
    expect(functionFound.name).to.be.equal(function_name);
    expect(functionFound.description).to.be.equal(function_description);
    expect(functionFound.dataFormat.dataObject.type).to.be.equal(function_dataformat);
    expect(functionFound.implementation).to.be.equal(printMsg);
    expect(functionFound.responseEvents.length).to.be.equal(responseEvents.length);

  });

  it('should add client function with array', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var function_id = uuid.substring(0, 7);

    var function_name = 'FUNC ' + function_id;
    var function_description = 'FUNC Description ' + function_id;
    var function_dataformat = 'string';
    var isArray = true;
    var responseEvents = [];

    // 2. ACT
    myMsbClient.addFunction(
      function_id,
      function_name,
      function_description,
      function_dataformat,
      printMsg,
      isArray,
      responseEvents
    );

    // 3. ASSERT
    var functions = myMsbClient.functions;
    // find the matching function by function id
    var functionFound = functions[function_id];
    // console.log(JSON.stringify(functionFound, null, 4));
    // check JSON object for the function for all properties set
    expect(functionFound.functionId).to.be.equal(function_id);
    expect(functionFound.name).to.be.equal(function_name);
    expect(functionFound.description).to.be.equal(function_description);
    expect(functionFound.dataFormat.dataObject.type).to.be.equal('array');
    expect(functionFound.dataFormat.dataObject.items.type).to.be.equal(function_dataformat);
    expect(functionFound.implementation).to.be.equal(printMsg);
    expect(functionFound.responseEvents.length).to.be.equal(responseEvents.length);

  });

  it('should add client function with no payload', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var function_id = uuid.substring(0, 7);

    var function_name = 'FUNC ' + function_id;
    var function_description = 'FUNC Description ' + function_id;
    var function_dataformat = null;
    var isArray = false;
    var responseEvents = [];

    // 2. ACT
    myMsbClient.addFunction(
      function_id,
      function_name,
      function_description,
      function_dataformat,
      printMsg,
      isArray,
      responseEvents
    );

    // 3. ASSERT
    var functions = myMsbClient.functions;
    // find the matching function by function id
    var functionFound = functions[function_id];
    // console.log(JSON.stringify(functionFound, null, 4));
    // check JSON object for the function for all properties set
    expect(functionFound.functionId).to.be.equal(function_id);
    expect(functionFound.name).to.be.equal(function_name);
    expect(functionFound.description).to.be.equal(function_description);
    expect(functionFound.dataFormat).to.be.a('undefined');
    expect(functionFound.implementation).to.be.equal(printMsg);
    expect(functionFound.responseEvents.length).to.be.equal(responseEvents.length);

  });

  it('should add client function with respoonse events', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    // create two events to be used as response events
    var uuid = uuidGenerator.v4();
    var event1_id = uuid.substring(0, 7);

    var event1_name = 'EVENT ' + event1_id;
    var event1_description = 'EVENT Description ' + event1_id;
    var event1_datatype = 'string';
    var event1_priority = 1;
    var event1_isArray = false;

    myMsbClient.addEvent(
      event1_id,
      event1_name,
      event1_description,
      event1_datatype,
      event1_priority,
      event1_isArray
    );

    var event1_in_events_id = myMsbClient.events[event1_id]['@id'];

    uuid = uuidGenerator.v4();
    var event2_id = uuid.substring(0, 7);

    var event2_name = 'EVENT ' + event2_id;
    var event2_description = 'EVENT Description ' + event2_id;
    var event2_datatype = 'string';
    var event2_priority = 1;
    var event2_isArray = false;

    myMsbClient.addEvent(
      event2_id,
      event2_name,
      event2_description,
      event2_datatype,
      event2_priority,
      event2_isArray
    );

    var event2_in_events_id = myMsbClient.events[event2_id]['@id'];

    // create function
    uuid = uuidGenerator.v4();
    var function_id = uuid.substring(0, 7);

    var function_name = 'FUNC ' + function_id;
    var function_description = 'FUNC Description ' + function_id;
    var function_dataformat = 'string';
    var isArray = false;
    var responseEvents = [event1_id, event2_id];

    // 2. ACT
    myMsbClient.addFunction(
      function_id,
      function_name,
      function_description,
      function_dataformat,
      printMsg,
      isArray,
      responseEvents
    );

    // 3. ASSERT
    var functions = myMsbClient.functions;
    // find the matching function by function id
    var functionFound = functions[function_id];
    // console.log(JSON.stringify(functionFound, null, 4));
    // check JSON object for the function for all properties set
    expect(functionFound.functionId).to.be.equal(function_id);
    expect(functionFound.name).to.be.equal(function_name);
    expect(functionFound.description).to.be.equal(function_description);
    expect(functionFound.dataFormat.dataObject.type).to.be.equal(function_dataformat);
    expect(functionFound.implementation).to.be.equal(printMsg);
    expect(functionFound.responseEvents.length).to.be.equal(responseEvents.length);
    expect(functionFound.responseEvents[0]).to.be.equal(event1_in_events_id);
    expect(functionFound.responseEvents[1]).to.be.equal(event2_in_events_id);

  });

  it('should NOT add client function with invalid respoonse events', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    // create two events to be used as response events
    var uuid = uuidGenerator.v4();
    var event1_id = uuid.substring(0, 7);

    var event1_name = 'EVENT ' + event1_id;
    var event1_description = 'EVENT Description ' + event1_id;
    var event1_datatype = 'string';
    var event1_priority = 1;
    var event1_isArray = false;

    myMsbClient.addEvent(
      event1_id,
      event1_name,
      event1_description,
      event1_datatype,
      event1_priority,
      event1_isArray
    );

    uuid = uuidGenerator.v4();
    var event2_id = uuid.substring(0, 7);

    var event2_name = 'EVENT ' + event2_id;
    var event2_description = 'EVENT Description ' + event2_id;
    var event2_datatype = 'string';
    var event2_priority = 1;
    var event2_isArray = false;

    myMsbClient.addEvent(
      event2_id,
      event2_name,
      event2_description,
      event2_datatype,
      event2_priority,
      event2_isArray
    );

    // create function
    uuid = uuidGenerator.v4();
    var function_id = uuid.substring(0, 7);

    var function_name = 'FUNC ' + function_id;
    var function_description = 'FUNC Description ' + function_id;
    var function_dataformat = 'string';
    var isArray = false;
    var responseEvents = [event1_id, '123InvalidEventId'];

    // 2. ACT
    var added = false;
    try {
      myMsbClient.addFunction(
        function_id,
        function_name,
        function_description,
        function_dataformat,
        printMsg,
        isArray,
        responseEvents
      );
      added = true;
    } catch (err){
      console.debug(err);
    }
    // console should warn that function is not valid

    // 3. ASSERT
    expect(added).to.be.equal(false);

  });

  it('should NOT add duplicated client functino', function() {


    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var function_id = uuid.substring(0, 7);

    var function_name = 'FUNC ' + function_id;
    var function_description = 'FUNC Description ' + function_id;
    var function_dataformat = 'string';
    var isArray = false;
    var responseEvents = [];

    // 2. ACT
    myMsbClient.addFunction(
      function_id,
      function_name,
      function_description,
      function_dataformat,
      printMsg,
      isArray,
      responseEvents
    );
    var functionIdAlreadyUsed = function_id;
    var added = false;
    try {
      myMsbClient.addFunction(
        functionIdAlreadyUsed,
        function_name,
        function_description,
        function_dataformat,
        printMsg,
        isArray,
        responseEvents
      );
      added = true;
    } catch (err){
      console.debug(err);
    }
    // console should warn that function is alreay present

    // 3. ASSERT
    expect(added).to.be.equal(false);

  });

  it('should NOT add client function with invalid datatype', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var function_id = uuid.substring(0, 7);

    var function_name = 'FUNC ' + function_id;
    var function_description = 'FUNC Description ' + function_id;
    var function_dataformat = 'int65';
    var isArray = false;
    var responseEvents = [];

    // 2. ACT

    // 2. ACT
    var added = false;
    try {
      myMsbClient.addFunction(
        function_id,
        function_name,
        function_description,
        function_dataformat,
        printMsg,
        isArray,
        responseEvents
      );
      added = true;
    } catch (err){
      console.debug(err);
    }
    // console should warn that datatype is invalid

    // 3. ASSERT
    expect(added).to.be.equal(false);

  });

  it('should add client function using self-defind complex object', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var function_id = uuid.substring(0, 7);

    var function_name = 'FUNC ' + function_id;
    var function_description = 'FUNC Description ' + function_id;
    var isArray = false;
    var responseEvents = [];

    // 2. ACT
    var complexObject_name_1 = 'ComplexObject1';
    var complexObject_property_name_1 = 'megaprop';
    var complexObject_isArray_1 = false;
    var complexObject_name_2 = 'ComplexObject2';
    var complexObject_property_name_2 = 'superprop';
    var complexObject_datatype_2 = 'int32';
    var complexObject_isArray_2 = true;
    var complexObject_datatype_1 = complexObject_name_2;
    myMsbClient.createComplexDataFormat(complexObject_name_1);
    myMsbClient.createComplexDataFormat(complexObject_name_2);
    myMsbClient.addProperty(
      complexObject_name_2,
      complexObject_property_name_2,
      complexObject_datatype_2,
      complexObject_isArray_2
    );
    myMsbClient.addProperty(
      complexObject_name_1,
      complexObject_property_name_1,
      complexObject_datatype_1,
      complexObject_isArray_1
    );
    myMsbClient.addFunction(
      function_id,
      function_name,
      function_description,
      complexObject_name_1,
      printMsg,
      isArray,
      responseEvents
    );

    // 3. ASSERT
    var functions = myMsbClient.functions;
    // find the matching event by event id
    var functionFound = functions[function_id];
    // console.log(JSON.stringify(functionFound, null, 4));
    // check JSON object for the function for all properties set
    expect(functionFound.functionId).to.be.equal(function_id);
    expect(functionFound.name).to.be.equal(function_name);
    expect(functionFound.description).to.be.equal(function_description);
    expect(functionFound.dataFormat.ComplexObject1.type).to.be.equal('object');
    expect(functionFound.dataFormat.ComplexObject1.properties.megaprop.$ref)
      .to.be.equal('#/definitions/' + complexObject_name_2);
    expect(functionFound.dataFormat.ComplexObject2.type).to.be.equal('object');
    expect(functionFound.dataFormat.ComplexObject2.properties.superprop.type).to.be.equal('array');
    expect(functionFound.dataFormat.ComplexObject2.properties.superprop.items.type).to.be.equal('integer');
    expect(functionFound.dataFormat.ComplexObject2.properties.superprop.items.format)
      .to.be.equal(complexObject_datatype_2);
    expect(functionFound.dataFormat.dataObject.type).to.be.equal('object');
    expect(functionFound.dataFormat.dataObject.$ref).to.be.equal('#/definitions/' + complexObject_name_1);

  });

  it('should add client function using self-defind complex object (as array)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var function_id = uuid.substring(0, 7);

    var function_name = 'FUNC ' + function_id;
    var function_description = 'FUNC Description ' + function_id;
    var isArray = true;
    var responseEvents = [];

    // 2. ACT
    var complexObject_name_1 = 'ComplexObject1';
    var complexObject_property_name_1 = 'megaprop';
    var complexObject_isArray_1 = true;
    var complexObject_name_2 = 'ComplexObject2';
    var complexObject_property_name_2 = 'superprop';
    var complexObject_datatype_2 = 'int32';
    var complexObject_isArray_2 = false;
    var complexObject_datatype_1 = complexObject_name_2;
    myMsbClient.createComplexDataFormat(complexObject_name_1);
    myMsbClient.createComplexDataFormat(complexObject_name_2);
    myMsbClient.addProperty(
      complexObject_name_2,
      complexObject_property_name_2,
      complexObject_datatype_2,
      complexObject_isArray_2
    );
    myMsbClient.addProperty(
      complexObject_name_1,
      complexObject_property_name_1,
      complexObject_datatype_1,
      complexObject_isArray_1
    );
    myMsbClient.addFunction(
      function_id,
      function_name,
      function_description,
      complexObject_name_1,
      printMsg,
      isArray,
      responseEvents
    );

    // 3. ASSERT
    var functions = myMsbClient.functions;
    // find the matching event by event id
    var functionFound = functions[function_id];
    // console.log(JSON.stringify(functionFound, null, 4));
    // check JSON object for the function for all properties set
    expect(functionFound.functionId).to.be.equal(function_id);
    expect(functionFound.name).to.be.equal(function_name);
    expect(functionFound.description).to.be.equal(function_description);
    expect(functionFound.dataFormat.ComplexObject1.type).to.be.equal('object');
    expect(functionFound.dataFormat.ComplexObject1.properties.megaprop.type).to.be.equal('array');
    expect(functionFound.dataFormat.ComplexObject1.properties.megaprop.items.$ref)
      .to.be.equal('#/definitions/' + complexObject_name_2);
    expect(functionFound.dataFormat.ComplexObject2.type).to.be.equal('object');
    expect(functionFound.dataFormat.ComplexObject2.properties.superprop.type).to.be.equal('integer');
    expect(functionFound.dataFormat.ComplexObject2.properties.superprop.format)
      .to.be.equal(complexObject_datatype_2);
    expect(functionFound.dataFormat.dataObject.type).to.be.equal('array');
    expect(functionFound.dataFormat.dataObject.items.$ref).to.be.equal('#/definitions/' + complexObject_name_1);

  });

});


/**
 * Test the creation of client events
 */
describe('MSB Client Specification - Events', function() {

  it('should add client event per single params', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var event_id = uuid.substring(0, 7);

    var event_name = 'EVENT ' + event_id;
    var event_description = 'EVENT Description ' + event_id;
    var event_datatype = 'string';
    var event_priority = 1;
    var isArray = false;

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var events = myMsbClient.events;
    // find the matching event by event id
    var eventFound = events[event_id];
    // console.log(JSON.stringify(eventFound, null, 4));
    // check JSON object for the event for all properties set
    expect(eventFound.eventId).to.be.equal(event_id);
    expect(eventFound.name).to.be.equal(event_name);
    expect(eventFound.description).to.be.equal(event_description);
    expect(eventFound.dataFormat.dataObject.type).to.be.equal(event_datatype);
    expect(eventFound.implementation.priority).to.be.equal(event_priority);

  });

  it('should add client event per event object', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var event_id = uuid.substring(0, 7);

    var event_name = 'EVENT ' + event_id;
    var event_description = 'EVENT Description ' + event_id;
    var event_datatype = 'string';
    var event_priority = 'MEDIUM';
    var event_priorityAsValue = 1;

    // 2. ACT
    myMsbClient.addEvent({
      eventId: event_id,
      name: event_name,
      description: event_description,
      dataFormat: {dataObject: {type: event_datatype}},
      implementation: {
        priority: event_priority,
      },
    });

    // 3. ASSERT
    var events = myMsbClient.events;
    // find the matching event by event id
    var eventFound = events[event_id];
    // console.log(JSON.stringify(eventFound, null, 4));
    // check JSON object for the event for all properties set
    expect(eventFound.eventId).to.be.equal(event_id);
    expect(eventFound.name).to.be.equal(event_name);
    expect(eventFound.description).to.be.equal(event_description);
    expect(eventFound.dataFormat.dataObject.type).to.be.equal(event_datatype);
    expect(eventFound.implementation.priority).to.be.equal(event_priorityAsValue);

  });

  it('should add client event with JSON stringified datatype', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var event_id = uuid.substring(0, 7);

    var event_name = 'EVENT ' + event_id;
    var event_description = 'EVENT Description ' + event_id;
    var event_datatype = JSON.stringify({
      type: 'array',
      items: {type: 'integer', format: 'int32'},
    });
    var event_priority = 1;
    var isArray = true;

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var events = myMsbClient.events;
    // find the matching event by event id
    var eventFound = events[event_id];
    // console.log(JSON.stringify(eventFound, null, 4));
    // check JSON object for the event for all properties set
    expect(eventFound.eventId).to.be.equal(event_id);
    expect(eventFound.name).to.be.equal(event_name);
    expect(eventFound.description).to.be.equal(event_description);
    expect(eventFound.dataFormat.dataObject.type).to.be.equal('array');
    expect(eventFound.dataFormat.dataObject.items.type).to.be.equal('integer');
    expect(eventFound.dataFormat.dataObject.items.format).to.be.equal('int32');
    expect(eventFound.implementation.priority).to.be.equal(event_priority);

  });

  it('should add client event as array', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var event_id = uuid.substring(0, 7);

    var event_name = 'EVENT ' + event_id;
    var event_description = 'EVENT Description ' + event_id;
    var event_datatype = 'string';
    var event_priority = 1;
    var isArray = true;

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var events = myMsbClient.events;
    // find the matching event by event id
    var eventFound = events[event_id];
    // console.log(JSON.stringify(eventFound, null, 4));
    // check JSON object for the event for all properties set
    expect(eventFound.eventId).to.be.equal(event_id);
    expect(eventFound.name).to.be.equal(event_name);
    expect(eventFound.description).to.be.equal(event_description);
    expect(eventFound.dataFormat.dataObject.type).to.be.equal('array');
    expect(eventFound.dataFormat.dataObject.items.type).to.be.equal(event_datatype);
    expect(eventFound.implementation.priority).to.be.equal(event_priority);

  });

  it('should add client event with no payload', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var event_id = uuid.substring(0, 7);

    var event_name = 'EVENT ' + event_id;
    var event_description = 'EVENT Description ' + event_id;
    var event_datatype = null;
    var event_priority = 1;
    var isArray = true;

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var events = myMsbClient.events;
    // find the matching event by event id
    var eventFound = events[event_id];
    // console.log(JSON.stringify(eventFound, null, 4));
    // check JSON object for the event for all properties set
    expect(eventFound.eventId).to.be.equal(event_id);
    expect(eventFound.name).to.be.equal(event_name);
    expect(eventFound.description).to.be.equal(event_description);
    expect(eventFound.dataFormat).to.be.a('undefined');
    expect(eventFound.implementation.priority).to.be.equal(event_priority);

  });

  it('should NOT add duplicated client event', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var event_id = uuid.substring(0, 7);

    var event_name = 'EVENT ' + event_id;
    var event_description = 'EVENT Description ' + event_id;
    var event_datatype = 'string';
    var event_priority = 1;
    var isArray = false;

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );
    var eventIdAlreadyUsed = event_id;
    var added = false;
    try {
      myMsbClient.addEvent(
        eventIdAlreadyUsed,
        event_name,
        event_description,
        event_datatype,
        event_priority,
        isArray
      );
      added = true;
    } catch (err){
      console.debug(err);
    }
    // console should warn that event is alreay present

    // 3. ASSERT
    expect(added).to.be.equal(false);

  });

  it('should NOT add client event with invalid datatype', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var event_id = uuid.substring(0, 7);

    var event_name = 'EVENT ' + event_id;
    var event_description = 'EVENT Description ' + event_id;
    var event_datatype = 'int65';
    var event_priority = 1;
    var isArray = false;

    // 2. ACT
    var added = false;
    try {
      myMsbClient.addEvent(
        event_id,
        event_name,
        event_description,
        event_datatype,
        event_priority,
        isArray
      );
      added = true;
    } catch (err){
      console.debug(err);
    }
    // console should warn that datatype is invalid

    // 3. ASSERT
    expect(added).to.be.equal(false);

  });

  it('should add client event using self-defind complex object', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var event_id = uuid.substring(0, 7);

    var event_name = 'EVENT ' + event_id;
    var event_description = 'EVENT Description ' + event_id;
    var event_priority = 1;
    var isArray = false;

    // 2. ACT
    var complexObject_name_1 = 'ComplexObject1';
    var complexObject_property_name_1 = 'megaprop';
    var complexObject_isArray_1 = false;
    var complexObject_name_2 = 'ComplexObject2';
    var complexObject_property_name_2 = 'superprop';
    var complexObject_datatype_2 = 'int32';
    var complexObject_isArray_2 = true;
    var complexObject_datatype_1 = complexObject_name_2;
    myMsbClient.createComplexDataFormat(complexObject_name_1);
    myMsbClient.createComplexDataFormat(complexObject_name_2);
    myMsbClient.addProperty(
      complexObject_name_2,
      complexObject_property_name_2,
      complexObject_datatype_2,
      complexObject_isArray_2
    );
    myMsbClient.addProperty(
      complexObject_name_1,
      complexObject_property_name_1,
      complexObject_datatype_1,
      complexObject_isArray_1
    );
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      complexObject_name_1,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var events = myMsbClient.events;
    // find the matching event by event id
    var eventFound = events[event_id];
    // console.log(JSON.stringify(eventFound, null, 4));
    // check JSON object for the event for all properties set
    expect(eventFound.eventId).to.be.equal(event_id);
    expect(eventFound.name).to.be.equal(event_name);
    expect(eventFound.description).to.be.equal(event_description);
    expect(eventFound.implementation.priority).to.be.equal(event_priority);
    expect(eventFound.dataFormat.ComplexObject1.type).to.be.equal('object');
    expect(eventFound.dataFormat.ComplexObject1.properties.megaprop.$ref)
      .to.be.equal('#/definitions/' + complexObject_name_2);
    expect(eventFound.dataFormat.ComplexObject2.type).to.be.equal('object');
    expect(eventFound.dataFormat.ComplexObject2.properties.superprop.type).to.be.equal('array');
    expect(eventFound.dataFormat.ComplexObject2.properties.superprop.items.type).to.be.equal('integer');
    expect(eventFound.dataFormat.ComplexObject2.properties.superprop.items.format)
      .to.be.equal(complexObject_datatype_2);
    expect(eventFound.dataFormat.dataObject.type).to.be.equal('object');
    expect(eventFound.dataFormat.dataObject.$ref).to.be.equal('#/definitions/' + complexObject_name_1);

  });

  it('should add client event using self-defind complex object (inside event object)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var event_id = uuid.substring(0, 7);

    var event_name = 'EVENT ' + event_id;
    var event_description = 'EVENT Description ' + event_id;
    var event_priority = 1;

    // 2. ACT
    myMsbClient.addEvent({
      eventId: event_id,
      name: event_name,
      description: event_description,
      dataFormat: {
        dataObject: {type: 'object', $ref: '#/definitions/ComplexObject1'},
        ComplexObject1: {
          type: 'object',
          properties: {
            value1: {
              type: 'string',
            },
            value2: {
              type: 'number', format: 'float',
            },
          },
        },
      },
      implementation: {
        priority: event_priority,
      },
    });

    // 3. ASSERT
    var events = myMsbClient.events;
    // find the matching event by event id
    var eventFound = events[event_id];
    // console.log(JSON.stringify(eventFound, null, 4));
    // check JSON object for the event for all properties set
    expect(eventFound.eventId).to.be.equal(event_id);
    expect(eventFound.name).to.be.equal(event_name);
    expect(eventFound.description).to.be.equal(event_description);
    expect(eventFound.implementation.priority).to.be.equal(event_priority);
    expect(eventFound.dataFormat.ComplexObject1.type).to.be.equal('object');
    expect(eventFound.dataFormat.ComplexObject1.properties.value1.type).to.be.equal('string');
    expect(eventFound.dataFormat.ComplexObject1.properties.value2.type).to.be.equal('number');
    expect(eventFound.dataFormat.ComplexObject1.properties.value2.format).to.be.equal('float');
    expect(eventFound.dataFormat.dataObject.type).to.be.equal('object');
    expect(eventFound.dataFormat.dataObject.$ref).to.be.equal('#/definitions/ComplexObject1');

  });

  it('should add client event using self-defind complex object (as array)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var event_id = uuid.substring(0, 7);

    var event_name = 'EVENT ' + event_id;
    var event_description = 'EVENT Description ' + event_id;
    var event_priority = 1;
    var isArray = true;

    // 2. ACT
    var complexObject_name_1 = 'ComplexObject1';
    var complexObject_property_name_1 = 'megaprop';
    var complexObject_isArray_1 = false;
    var complexObject_name_2 = 'ComplexObject2';
    var complexObject_property_name_2 = 'superprop';
    var complexObject_datatype_2 = 'int32';
    var complexObject_isArray_2 = true;
    var complexObject_datatype_1 = complexObject_name_2;
    myMsbClient.createComplexDataFormat(complexObject_name_1);
    myMsbClient.createComplexDataFormat(complexObject_name_2);
    myMsbClient.addProperty(
      complexObject_name_2,
      complexObject_property_name_2,
      complexObject_datatype_2,
      complexObject_isArray_2
    );
    myMsbClient.addProperty(
      complexObject_name_1,
      complexObject_property_name_1,
      complexObject_datatype_1,
      complexObject_isArray_1
    );
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      complexObject_name_1,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var events = myMsbClient.events;
    // find the matching event by event id
    var eventFound = events[event_id];
    // console.log(JSON.stringify(eventFound, null, 4));
    // check JSON object for the event for all properties set
    expect(eventFound.eventId).to.be.equal(event_id);
    expect(eventFound.name).to.be.equal(event_name);
    expect(eventFound.description).to.be.equal(event_description);
    expect(eventFound.implementation.priority).to.be.equal(event_priority);
    expect(eventFound.dataFormat.ComplexObject1.type).to.be.equal('object');
    expect(eventFound.dataFormat.ComplexObject1.properties.megaprop.$ref)
      .to.be.equal('#/definitions/' + complexObject_name_2);
    expect(eventFound.dataFormat.ComplexObject2.type).to.be.equal('object');
    expect(eventFound.dataFormat.ComplexObject2.properties.superprop.type).to.be.equal('array');
    expect(eventFound.dataFormat.ComplexObject2.properties.superprop.items.type).to.be.equal('integer');
    expect(eventFound.dataFormat.ComplexObject2.properties.superprop.items.format)
      .to.be.equal(complexObject_datatype_2);
    expect(eventFound.dataFormat.dataObject.type).to.be.equal('array');
    expect(eventFound.dataFormat.dataObject.items.$ref).to.be.equal('#/definitions/' + complexObject_name_1);

  });

  it('should add client event using 4-layer self-defind complex object', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var event_id = uuid.substring(0, 7);

    var event_name = 'EVENT ' + event_id;
    var event_description = 'EVENT Description ' + event_id;
    var event_priority = 1;
    var isArray = false;

    // 2. ACT
    var complexObject_name_1 = 'ComplexObject1';
    var complexObject_property_name_1 = 'megaprop';
    var complexObject_isArray_1 = false;
    var complexObject_name_2 = 'ComplexObject2';
    var complexObject_property_name_2 = 'superprop';
    var complexObject_isArray_2 = true;
    var complexObject_datatype_1 = complexObject_name_2;
    var complexObject_name_3 = 'ComplexObject3';
    var complexObject_property_name_3 = 'mediumprop';
    var complexObject_isArray_3 = true;
    var complexObject_datatype_2 = complexObject_name_3;
    var complexObject_name_4 = 'ComplexObject4';
    var complexObject_property_name_4 = 'prop';
    var complexObject_datatype_4 = 'int32';
    var complexObject_isArray_4 = true;
    var complexObject_datatype_3 = complexObject_name_4;
    myMsbClient.createComplexDataFormat(complexObject_name_1);
    myMsbClient.createComplexDataFormat(complexObject_name_2);
    myMsbClient.createComplexDataFormat(complexObject_name_3);
    myMsbClient.createComplexDataFormat(complexObject_name_4);
    myMsbClient.addProperty(
      complexObject_name_4,
      complexObject_property_name_4,
      complexObject_datatype_4,
      complexObject_isArray_4
    );
    myMsbClient.addProperty(
      complexObject_name_3,
      complexObject_property_name_3,
      complexObject_datatype_3,
      complexObject_isArray_3
    );
    myMsbClient.addProperty(
      complexObject_name_2,
      complexObject_property_name_2,
      complexObject_datatype_2,
      complexObject_isArray_2
    );
    myMsbClient.addProperty(
      complexObject_name_1,
      complexObject_property_name_1,
      complexObject_datatype_1,
      complexObject_isArray_1
    );
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      complexObject_name_1,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var events = myMsbClient.events;
    // find the matching event by event id
    var eventFound = events[event_id];
    // console.log(JSON.stringify(eventFound, null, 4));
    // check JSON object for the event for all properties set
    expect(eventFound.eventId).to.be.equal(event_id);
    expect(eventFound.name).to.be.equal(event_name);
    expect(eventFound.description).to.be.equal(event_description);
    expect(eventFound.implementation.priority).to.be.equal(event_priority);
    expect(eventFound.dataFormat.ComplexObject1.type).to.be.equal('object');
    expect(eventFound.dataFormat.ComplexObject1.properties.megaprop.$ref)
      .to.be.equal('#/definitions/' + complexObject_name_2);
    expect(eventFound.dataFormat.ComplexObject2.type).to.be.equal('object');
    expect(eventFound.dataFormat.ComplexObject2.properties.superprop.type).to.be.equal('array');
    expect(eventFound.dataFormat.ComplexObject2.properties.superprop.items.$ref)
      .to.be.equal('#/definitions/' + complexObject_name_3);
    expect(eventFound.dataFormat.ComplexObject3.type).to.be.equal('object');
    expect(eventFound.dataFormat.ComplexObject3.properties.mediumprop.type).to.be.equal('array');
    expect(eventFound.dataFormat.ComplexObject3.properties.mediumprop.items.$ref)
      .to.be.equal('#/definitions/' + complexObject_name_4);
    expect(eventFound.dataFormat.ComplexObject4.properties.prop.type).to.be.equal('array');
    expect(eventFound.dataFormat.ComplexObject4.properties.prop.items.type).to.be.equal('integer');
    expect(eventFound.dataFormat.ComplexObject4.properties.prop.items.format)
      .to.be.equal(complexObject_datatype_4);
    expect(eventFound.dataFormat.dataObject.type).to.be.equal('object');
    expect(eventFound.dataFormat.dataObject.$ref).to.be.equal('#/definitions/' + complexObject_name_1);

  });

  it('should add client event using 4-layer self-defind complex object with recusrion', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var event_id = uuid.substring(0, 7);

    var event_name = 'EVENT ' + event_id;
    var event_description = 'EVENT Description ' + event_id;
    var event_priority = 1;
    var isArray = false;

    // 2. ACT
    var complexObject_name_1 = 'ComplexObject1';
    var complexObject_property_name_1 = 'megaprop';
    var complexObject_isArray_1 = false;
    var complexObject_name_2 = 'ComplexObject2';
    var complexObject_property_name_2 = 'superprop';
    var complexObject_isArray_2 = true;
    var complexObject_datatype_1 = complexObject_name_2;
    var complexObject_name_3 = 'ComplexObject3';
    var complexObject_property_name_3 = 'mediumprop';
    var complexObject_isArray_3 = true;
    var complexObject_property_name_3p2 = 'recurseprop';
    var complexObject_isArray_3p2 = true;
    var complexObject_datatype_3p2 = complexObject_name_2;
    var complexObject_datatype_2 = complexObject_name_3;
    var complexObject_name_4 = 'ComplexObject4';
    var complexObject_property_name_4 = 'prop';
    var complexObject_datatype_4 = 'int32';
    var complexObject_isArray_4 = true;
    var complexObject_datatype_3 = complexObject_name_4;
    myMsbClient.createComplexDataFormat(complexObject_name_1);
    myMsbClient.createComplexDataFormat(complexObject_name_2);
    myMsbClient.createComplexDataFormat(complexObject_name_3);
    myMsbClient.createComplexDataFormat(complexObject_name_4);
    myMsbClient.addProperty(
      complexObject_name_4,
      complexObject_property_name_4,
      complexObject_datatype_4,
      complexObject_isArray_4
    );
    myMsbClient.addProperty(
      complexObject_name_3,
      complexObject_property_name_3,
      complexObject_datatype_3,
      complexObject_isArray_3
    );
    myMsbClient.addProperty(
      complexObject_name_3,
      complexObject_property_name_3p2,
      complexObject_datatype_3p2,
      complexObject_isArray_3p2
    );
    myMsbClient.addProperty(
      complexObject_name_2,
      complexObject_property_name_2,
      complexObject_datatype_2,
      complexObject_isArray_2
    );
    myMsbClient.addProperty(
      complexObject_name_1,
      complexObject_property_name_1,
      complexObject_datatype_1,
      complexObject_isArray_1
    );
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      complexObject_name_1,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var events = myMsbClient.events;
    // find the matching event by event id
    var eventFound = events[event_id];
    // console.log(JSON.stringify(eventFound, null, 4));
    // check JSON object for the event for all properties set
    expect(eventFound.eventId).to.be.equal(event_id);
    expect(eventFound.name).to.be.equal(event_name);
    expect(eventFound.description).to.be.equal(event_description);
    expect(eventFound.implementation.priority).to.be.equal(event_priority);
    expect(eventFound.dataFormat.ComplexObject1.type).to.be.equal('object');
    expect(eventFound.dataFormat.ComplexObject1.properties.megaprop.$ref)
      .to.be.equal('#/definitions/' + complexObject_name_2);
    expect(eventFound.dataFormat.ComplexObject2.type).to.be.equal('object');
    expect(eventFound.dataFormat.ComplexObject2.properties.superprop.type).to.be.equal('array');
    expect(eventFound.dataFormat.ComplexObject2.properties.superprop.items.$ref)
      .to.be.equal('#/definitions/' + complexObject_name_3);
    expect(eventFound.dataFormat.ComplexObject3.type).to.be.equal('object');
    expect(eventFound.dataFormat.ComplexObject3.properties.mediumprop.type).to.be.equal('array');
    expect(eventFound.dataFormat.ComplexObject3.properties.mediumprop.items.$ref)
      .to.be.equal('#/definitions/' + complexObject_name_4);
    expect(eventFound.dataFormat.ComplexObject3.properties.recurseprop.type).to.be.equal('array');
    expect(eventFound.dataFormat.ComplexObject3.properties.recurseprop.items.$ref)
      .to.be.equal('#/definitions/' + complexObject_name_2);
    expect(eventFound.dataFormat.ComplexObject4.properties.prop.type).to.be.equal('array');
    expect(eventFound.dataFormat.ComplexObject4.properties.prop.items.type).to.be.equal('integer');
    expect(eventFound.dataFormat.ComplexObject4.properties.prop.items.format)
      .to.be.equal(complexObject_datatype_4);
    expect(eventFound.dataFormat.dataObject.type).to.be.equal('object');
    expect(eventFound.dataFormat.dataObject.$ref).to.be.equal('#/definitions/' + complexObject_name_1);

  });

});


/**
 * Check self desription object
 */
describe('MSB Client Specification - Self Description', function() {

  it('should get self descriptoin with basic client config', function() {

    // 1. ARRANGE
    var type = 'SmartObject';
    var uuid = uuidGenerator.v4();
    var name = 'SO ' + uuid;
    var description = 'SO Desc' + uuid;
    var token = uuid.substring(0, 7);

    // 2. ACT
    var myMsbClient = new MsbClient(
      type,
      uuid,
      name,
      description,
      token
    );

    // 3. ASSERT
    var selfDescription = myMsbClient.getSelfDescription();
    // console.log(selfDescription);
    expect(selfDescription.uuid).to.be.equal(uuid);
    expect(selfDescription.name).to.be.equal(name);
    expect(selfDescription.description).to.be.equal(description);
    expect(selfDescription.token).to.be.equal(token);
  });

  it('should get self descriptoin with configuration parameters', function() {


    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var param_name_1 = 'testParam1';
    var param_value_1 = true;
    var param_datatype_1 = 'boolean';

    var param_name_2 = 'testParam2';
    var param_value_2 = 'StringValue';
    var param_datatype_2 = 'string';

    var param_name_3 = 'testParam3';
    var param_value_3 = 1000;
    var param_datatype_3 = 'int32';

    // 2. ACT
    myMsbClient.addConfigParameter(param_name_1, param_value_1, param_datatype_1);
    myMsbClient.addConfigParameter(param_name_2, param_value_2, param_datatype_2);
    myMsbClient.addConfigParameter(param_name_3, param_value_3, param_datatype_3);

    // 3. ASSERT
    var selfDescription = myMsbClient.getSelfDescription();
    // console.log(selfDescription);
    var parameters = selfDescription.configuration.parameters;
    // console.log(parameters);
    var parameterFound_1 = parameters[param_name_1];
    // console.log(parameterFound_1);
    expect(parameterFound_1.value).to.be.equal(param_value_1);
    expect(parameterFound_1.type).to.be.equal(param_datatype_1.toUpperCase());
    var parameterFound_2 = parameters[param_name_2];
    expect(parameterFound_2.value).to.be.equal(param_value_2);
    expect(parameterFound_2.type).to.be.equal(param_datatype_2.toUpperCase());
    var parameterFound_3 = parameters[param_name_3];
    expect(parameterFound_3.value).to.be.equal(param_value_3);
    expect(parameterFound_3.format).to.be.equal(param_datatype_3.toUpperCase());
  });

  it('should get self descriptoin with functions', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var function_id = uuid.substring(0, 7);

    var function_name = 'FUNC ' + function_id;
    var function_description = 'FUNC Description ' + function_id;
    var function_dataformat = 'string';
    var isArray = false;
    var responseEvents = [];

    // 2. ACT
    myMsbClient.addFunction(
      function_id,
      function_name,
      function_description,
      function_dataformat,
      printMsg,
      isArray,
      responseEvents
    );

    // 3. ASSERT
    var selfDescription = myMsbClient.getSelfDescription();
    var functions = selfDescription.functions;
    // console.log(functions);
    // find the matching function by function id
    var functionFound = functions[0];
    // console.log(JSON.stringify(functionFound, null, 4));
    // check JSON object for the function for all properties set
    expect(functionFound.functionId).to.be.equal(function_id);
    expect(functionFound.name).to.be.equal(function_name);
    expect(functionFound.description).to.be.equal(function_description);
    expect(functionFound.dataFormat.dataObject.type).to.be.equal(function_dataformat);
    expect(functionFound.responseEvents.length).to.be.equal(responseEvents.length);
  });

  it('should get self descriptoin with events', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var uuid = uuidGenerator.v4();
    var event_id = uuid.substring(0, 7);

    var event_name = 'EVENT ' + event_id;
    var event_description = 'EVENT Description ' + event_id;
    var event_datatype = 'string';
    var event_priority = 1;
    var isArray = false;

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var selfDescription = myMsbClient.getSelfDescription();
    var events = selfDescription.events;
    // find the matching event by event id
    var eventFound = events[0];
    // console.log(JSON.stringify(eventFound, null, 4));
    // check JSON object for the event for all properties set
    expect(eventFound.eventId).to.be.equal(event_id);
    expect(eventFound.name).to.be.equal(event_name);
    expect(eventFound.description).to.be.equal(event_description);
    expect(eventFound.dataFormat.dataObject.type).to.be.equal(event_datatype);
  });

});


/**
 * Test the validation of events before they get send
 */
describe('MSB Client - Event Value Validation', function() {

  var event_id;
  var event_name;
  var event_description;
  var event_priority;

  beforeEach(function() {
    // runs before each test in this block
    // prepare client evwent;
    var uuid = uuidGenerator.v4();
    event_id = uuid.substring(0, 7);

    event_name = 'EVENT ' + event_id;
    event_description = 'EVENT Description ' + event_id;
    event_priority = 1;
  });

  it('should be VALID event (simple string)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = false;
    var event_datatype = 'string';
    var event_value = 'Hello World!';

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(true);

  });

  it('should be INVALID event (simple string)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = false;
    var event_datatype = 'string';
    var event_value = true;

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(false);

  });

  it('should be VALID event (simple integer)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = false;
    var event_datatype = 'int32';
    var event_value = 12;

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(true);

  });

  it('should be INVALID event (simple integer)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = false;
    var event_datatype = 'int64';
    var event_value = 'Hello  ';

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(false);

  });

  it('should be VALID event (simple number)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = false;
    var event_datatype = 'float';
    var event_value = 12;

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(true);

  });

  it('should be INVALID event (simple number)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = false;
    var event_datatype = 'number';
    var event_value = false;

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(false);

  });

  it('should be VALID event (simple datet-ime)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = false;
    var event_datatype = 'date-time';
    var event_value = new Date().toISOString();

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(true);

  });

  it('should be INVALID event (simple date-time)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = false;
    var event_datatype = 'date-time';
    var event_value = 2011;

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(false);

  });

  it('should be VALID event (simple byte string)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = false;
    var event_datatype = 'byte';
    var event_value = '0x77';

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(true);

  });

  it('should be INVALID event (simple byte string)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = false;
    var event_datatype = 'byte';
    var event_value = 2011;

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(false);

  });

  it('should be VALID event (simple string ARRAY)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = true;
    var event_datatype = 'string';
    var event_value = ['Hello', 'World', '!'];

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(true);

  });

  it('should be INVALID event (simple string ARRAY)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = true;
    var event_datatype = 'string';
    var event_value = [true, true, false];

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(false);

  });

  it('should be VALID event (simple integer ARRAY)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = true;
    var event_datatype = 'int';
    var event_value = [12, 14, 24];

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(true);

  });

  it('should be INVALID event (simple integer ARRAY)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = true;
    var event_datatype = 'integer';
    var event_value = ['This', 'is not', 'a integer array'];

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(false);

  });

  it('should be VALID event (simple number ARRAY)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = true;
    var event_datatype = 'double';
    var event_value = [12.32, 14, 24];

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(true);

  });

  it('should be INVALID event (simple number ARRAY)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = true;
    var event_datatype = 'number';
    var event_value = false;

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(false);

  });

  it('should be VALID event (complex dataformat)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = false;
    var event_value = {
      megaprop: {
        superprop: [21, 22, 23],
      },
    };

    // 2. ACT
    var complexObject_name_1 = 'ComplexObject1';
    var complexObject_property_name_1 = 'megaprop';
    var complexObject_isArray_1 = false;
    var complexObject_name_2 = 'ComplexObject2';
    var complexObject_property_name_2 = 'superprop';
    var complexObject_datatype_2 = 'int32';
    var complexObject_isArray_2 = true;
    var complexObject_datatype_1 = complexObject_name_2;
    myMsbClient.createComplexDataFormat(complexObject_name_1);
    myMsbClient.createComplexDataFormat(complexObject_name_2);
    myMsbClient.addProperty(
      complexObject_name_2,
      complexObject_property_name_2,
      complexObject_datatype_2,
      complexObject_isArray_2
    );
    myMsbClient.addProperty(
      complexObject_name_1,
      complexObject_property_name_1,
      complexObject_datatype_1,
      complexObject_isArray_1
    );
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      complexObject_name_1,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(true);

  });

  it('should be INVALID event (complex dataformat)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = false;
    var event_value = {
      megaprop: {
        superprop: ['oh', 'no', 23],
      },
    };

    // 2. ACT
    var complexObject_name_1 = 'ComplexObject1';
    var complexObject_property_name_1 = 'megaprop';
    var complexObject_isArray_1 = false;
    var complexObject_name_2 = 'ComplexObject2';
    var complexObject_property_name_2 = 'superprop';
    var complexObject_datatype_2 = 'int32';
    var complexObject_isArray_2 = true;
    var complexObject_datatype_1 = complexObject_name_2;
    myMsbClient.createComplexDataFormat(complexObject_name_1);
    myMsbClient.createComplexDataFormat(complexObject_name_2);
    myMsbClient.addProperty(
      complexObject_name_2,
      complexObject_property_name_2,
      complexObject_datatype_2,
      complexObject_isArray_2
    );
    myMsbClient.addProperty(
      complexObject_name_1,
      complexObject_property_name_1,
      complexObject_datatype_1,
      complexObject_isArray_1
    );
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      complexObject_name_1,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(false);

  });

  it('should be VALID event (complex dataformat ARRAY)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = true;
    var event_value = [
      {
        megaprop: {
          superprop: [21, 22, 23],
        },
      },
      {
        megaprop: {
          superprop: [0, 1, 2],
        },
      },
    ];

    // 2. ACT
    var complexObject_name_1 = 'ComplexObject1';
    var complexObject_property_name_1 = 'megaprop';
    var complexObject_isArray_1 = false;
    var complexObject_name_2 = 'ComplexObject2';
    var complexObject_property_name_2 = 'superprop';
    var complexObject_datatype_2 = 'int32';
    var complexObject_isArray_2 = true;
    var complexObject_datatype_1 = complexObject_name_2;
    myMsbClient.createComplexDataFormat(complexObject_name_1);
    myMsbClient.createComplexDataFormat(complexObject_name_2);
    myMsbClient.addProperty(
      complexObject_name_2,
      complexObject_property_name_2,
      complexObject_datatype_2,
      complexObject_isArray_2
    );
    myMsbClient.addProperty(
      complexObject_name_1,
      complexObject_property_name_1,
      complexObject_datatype_1,
      complexObject_isArray_1
    );
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      complexObject_name_1,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(true);

  });

  it('should be INVALID event (complex dataformat ARRAY)', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();

    var isArray = true;
    var event_value = [
      {
        megaprop: {
          superprop: [21, 22, 23],
        },
      },
      {
        megaprop: {
          superprop: [1, false, 2],
        },
      },
    ];

    // 2. ACT
    var complexObject_name_1 = 'ComplexObject1';
    var complexObject_property_name_1 = 'megaprop';
    var complexObject_isArray_1 = false;
    var complexObject_name_2 = 'ComplexObject2';
    var complexObject_property_name_2 = 'superprop';
    var complexObject_datatype_2 = 'int32';
    var complexObject_isArray_2 = true;
    var complexObject_datatype_1 = complexObject_name_2;
    myMsbClient.createComplexDataFormat(complexObject_name_1);
    myMsbClient.createComplexDataFormat(complexObject_name_2);
    myMsbClient.addProperty(
      complexObject_name_2,
      complexObject_property_name_2,
      complexObject_datatype_2,
      complexObject_isArray_2
    );
    myMsbClient.addProperty(
      complexObject_name_1,
      complexObject_property_name_1,
      complexObject_datatype_1,
      complexObject_isArray_1
    );
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      complexObject_name_1,
      event_priority,
      isArray
    );

    // 3. ASSERT
    var valid = myMsbClient.validateEventValue(event_id, event_value);
    expect(valid).to.be.equal(false);

  });

});


/**
 * Test caching of events if not connected to MSB
 */
describe('MSB Client - Event Caching', function() {

  var event_id;
  var event_name;
  var event_description;
  var event_priority;

  beforeEach(function() {
    // runs before each test in this block
    // prepare client evwent;
    var uuid = uuidGenerator.v4();
    event_id = uuid.substring(0, 7);

    event_name = 'EVENT ' + event_id;
    event_description = 'EVENT Description ' + event_id;
    event_priority = 1;
  });

  it('should cache event if not connected', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();
    myMsbClient.disableEventCache(false);
    myMsbClient.setEventCacheSize(1000);

    var isArray = false;
    var event_datatype = 'string';
    var event_value = 'Hello World!';
    var isCached = true;

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );
    myMsbClient.publish(event_id, event_value, isCached);

    // 3. ASSERT
    // get events from cache
    var eventsInCache = myMsbClient.eventCache;
    var eventImplFound;
    eventsInCache.forEach(function(eventImpl) {
      // find the matching event by event id
      if (eventImpl.eventId === event_id){
        eventImplFound = eventImpl;
      }
    });
    // console.log(JSON.stringify(eventImplFound, null, 4));
    // check JSON object for the event for all properties set
    expect(eventImplFound.eventId).to.be.equal(event_id);
    expect(eventImplFound.dataObject).to.be.equal(event_value);
    expect(eventImplFound.priority).to.be.equal(event_priority);

  });

  it('should cache event if not connected by shifting full cache', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();
    myMsbClient.disableEventCache(false);
    // if set to 0 only one event gets cached by shifting
    myMsbClient.setEventCacheSize(0);

    var isArray = false;
    var event_datatype = 'string';
    var event_value = 'Hello World!';
    var isCached = true;

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );
    myMsbClient.publish(event_id, event_value, isCached);

    // 3. ASSERT
    // get events from cache
    var eventsInCache = myMsbClient.eventCache;
    var eventImplFound;
    eventsInCache.forEach(function(eventImpl) {
      // find the matching event by event id
      if (eventImpl.eventId === event_id){
        eventImplFound = eventImpl;
      }
    });
    // console.log(JSON.stringify(eventImplFound, null, 4));
    // check JSON object for the event for all properties set
    expect(eventImplFound.eventId).to.be.equal(event_id);
    expect(eventImplFound.dataObject).to.be.equal(event_value);
    expect(eventImplFound.priority).to.be.equal(event_priority);

  });

  it('should NOT cache event if globally disabled caching', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();
    myMsbClient.disableEventCache(true);
    myMsbClient.setEventCacheSize(1000);

    var isArray = false;
    var event_datatype = 'string';
    var event_value = 'Hello World!';
    var isCached = true;

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );
    myMsbClient.publish(event_id, event_value, isCached);

    // 3. ASSERT
    // get events from cache
    var eventsInCache = myMsbClient.eventCache;
    var eventImplFound;
    eventsInCache.forEach(function(eventImpl) {
      // find the matching event by event id
      if (eventImpl.eventId === event_id){
        eventImplFound = eventImpl;
      }
    });
    // console.log(JSON.stringify(eventImplFound, null, 4));
    expect(eventImplFound).to.be.a('undefined');

  });

  it('should NOT cache event if disabled caching for one event', function() {

    // 1. ARRANGE
    var myMsbClient = new MsbClient();
    myMsbClient.disableEventCache(false);
    myMsbClient.setEventCacheSize(1000);

    var isArray = false;
    var event_datatype = 'string';
    var event_value = 'Hello World!';
    var isCached = false;

    // 2. ACT
    myMsbClient.addEvent(
      event_id,
      event_name,
      event_description,
      event_datatype,
      event_priority,
      isArray
    );
    myMsbClient.publish(event_id, event_value, isCached);

    // 3. ASSERT
    // get events from cache
    var eventsInCache = myMsbClient.eventCache;
    var eventImplFound;
    eventsInCache.forEach(function(eventImpl) {
      // find the matching event by event id
      if (eventImpl.eventId === event_id){
        eventImplFound = eventImpl;
      }
    });
    // console.log(JSON.stringify(eventImplFound, null, 4));
    expect(eventImplFound).to.be.a('undefined');

  });

});


function printMsg(msg) {
  console.info('PrintMsg: ' + JSON.stringify(msg));
}
