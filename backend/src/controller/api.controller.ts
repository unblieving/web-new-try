import {
  Body,
  Controller,
  Get,
  httpError,
  Inject,
  Post,
  Query,
} from "@midwayjs/core";
import { CourseService } from "../service/course.service";
import { parseCourseInput } from "../utils/course-input";

@Controller("/api")
export class ApiController {
  @Inject()
  courseService: CourseService;

  @Get("/health")
  async health() {
    return {
      status: "ok" as const,
      service: "course-demo-api",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("/courses")
  async listCourses() {
    return { data: this.courseService.list() };
  }

  @Post("/courses")
  async createCourse(@Body() body: unknown) {
    try {
      const input = parseCourseInput(body);
      return { data: this.courseService.create(input) };
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "课程数据无效";
      throw new httpError.BadRequestError(message);
    }
  }
}
