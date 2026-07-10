const { Bootstrap } = require("@midwayjs/bootstrap");
const { DefaultConsoleLoggerFactory } = require("@midwayjs/core");

Bootstrap.configure({
  loggerFactory: new DefaultConsoleLoggerFactory(),
}).run();
