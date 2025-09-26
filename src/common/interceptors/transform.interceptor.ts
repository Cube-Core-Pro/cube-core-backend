import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { StandardResponseDto } from "../types/response.types";

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, StandardResponseDto<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<StandardResponseDto<T>> {
    return next.handle().pipe(
      map(data => {
        // If data is already a StandardResponseDto, return as is
        if (data && typeof data === 'object' && 'success' in data && 'timestamp' in data) {
          return data;
        }

        // Transform the response
        return new StandardResponseDto(
          true,
          'Request successful',
          data
        );
      }),
    );
  }
}