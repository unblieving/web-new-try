import { CommonJSFileDetector, Configuration } from "@midwayjs/core";
import * as koa from "@midwayjs/koa";
import { join } from "node:path";

@Configuration({
  imports: [koa],
  importConfigs: [join(__dirname, "./config")],
  detector: new CommonJSFileDetector(),
})
export class MainConfiguration {}
