import { Controller, Get } from "@midwayjs/core";

@Controller("/api")
export class ApiController {
  @Get("/health")
  async health() {
    return {
      status: "ok" as const,
      service: "campus-marketplace-api",
      timestamp: new Date().toISOString(),
    };
  }
}
