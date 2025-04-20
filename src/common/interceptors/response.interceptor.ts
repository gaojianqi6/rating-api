import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
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
    const httpContext = context.switchToHttp();
    const res = httpContext.getResponse();

    return next.handle().pipe(
      map((data) => ({
        code: '200',
        data: data ?? null,
        message: '',
      })),
      catchError((error) => {
        console.error(error); // Keep for debugging

        const status =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        let message: string;
        if (error instanceof HttpException) {
          const response = error.getResponse();
          message =
            typeof response === 'string'
              ? response
              : response['message'] || error.message || 'An error occurred';
          if (Array.isArray(message)) {
            message = message.join(', ');
          }
        } else {
          message = 'Internal server error';
        }

        // Set the HTTP status code on the response
        res.status(status);

        // Return the error response in the desired format
        return new Observable<Response<T>>((subscriber) => {
          subscriber.next({
            code: status.toString(),
            data: null,
            message,
          });
          subscriber.complete();
        });
      }),
    );
  }
}
