# Application Sample Guide

## Prerequisites

- nodeJs and npm installed: https://nodejs.org/en/
- This MSB client project including app_sample.js downloaded

## Install node modules

Install the required node modules execute

```sh
$ npm install
```

## Run sample application

To run the sample client enter

```sh
$ npm start
```

or

```sh
$ node app_sample.js
```

You should get this output, 
if a valid MSB host address has been provided 
and debugging is enabled (myMsbClient.enableDebug(true)):

```sh
  <self-description output as json string>
  Connecting to MSB @ ws://127.0.0.1:8085
  Socket open
  IO_CONNECTED
  IO_REGISTERED
  Sent >> EVENT2 >> {"priority":0,"dataObject":65,"uuid":"32801d88-34cf-4836-8cc1-7e0d9c54dacd","eventId":"EVENT2","postDate":"2019-01-20T12:59:33.981Z"}
  Sent >> SIMPLE_EVENT3 >> {"uuid":"32801d88-34cf-4836-8cc1-7e0d9c54dacd","eventId":"SIMPLE_EVENT3","priority":0,"postDate":"2019-01-20T12:59:33.981Z"}
  IO_PUBLISHED
  IO_PUBLISHED
```

The application establishes a connection, registers and publishes a sample event, 
to which the MSB sends an acknowledgement response (IO_PUBLISHED). 
The app_sample.js file is the main application file, 
you can extend it with your own code to add functionality 
or copy parts of it into your own application file.

## Description of the template files

The application template files and their function will be described in the following:

  - `app_sample.js` is the main class which is used to run the actual application.
  - `src/msb_client.js` is the client library which handles the websocket connection, 
  events and function calls and sends them to the application via an event emitter.
  - `src/application.properties` is an optional file, 
  it can be used to define the config parameters of the smart object or application, 
  like the UUID, object name, description or broker url from an external source, 
  e.g. configuration of a Docker container.
  - `package.json` contains all the meta information for the node platform manager (npm) 
  which allows to automatically install all needed modules and start the application via npm start.

## Write your own application

If you checked out our appolication sample, you are ready to write your own application.

Visit [README.md](/../../) on our main page  for instrcutions how to integrate the msb client to your own applicaton using npm.