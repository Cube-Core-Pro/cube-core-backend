import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const origin = this.configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');
    const credentials = this.configService.get<boolean>('CORS_CREDENTIALS', true);

    response.header('Access-Control-Allow-Origin', origin);
    response.header('Access-Control-Allow-Credentials', credentials.toString());
    response.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-API-Key'
    );
    response.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    );

    if (request.method === 'OPTIONS') {
      response.status(200).end();
      return;
    }

    next();
  }
}