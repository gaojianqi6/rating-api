import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

interface Response<T> {
  code: string;
  data: T | null;
  message: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: '200', // Default success code
        data: data ?? null, // Handle undefined/null responses
        message: '', // Default empty message
      })),
      catchError((error) => {
        console.error(error); // Keep for debugging
        const status =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        // Handle BadRequestException for validation errors
        let message: string;
        if (error instanceof BadRequestException) {
          const response = error.getResponse();
          message =
            response['message'] && Array.isArray(response['message'])
              ? response['message'].join(', ')
              : response['message'] || error.message || 'Bad Request';
        } else {
          message =
            error instanceof HttpException
              ? error.message
              : 'Internal server error';
        }

        return throwError(
          () =>
            new HttpException(
              {
                code: status.toString(),
                data: null,
                message,
              },
              status,
            ),
        );
      }),
    );
  }
}
