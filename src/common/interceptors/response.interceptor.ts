import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: data ?? null, // Handle undefined/null responses
        message: '', // Default empty message
      })),
      catchError((error) => {
        const status =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        const message =
          error instanceof HttpException
            ? error.message
            : 'Internal server error';

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
