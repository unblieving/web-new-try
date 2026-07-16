import { Controller, Get } from "@midwayjs/core";

@Controller("/")
export class ApiController {
  @Get("/api/health")
  async health() {
    return {
      status: "ok" as const,
      service: "campus-marketplace-api",
      timestamp: new Date().toISOString(),
    };
  }
}
