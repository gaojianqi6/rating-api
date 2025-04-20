import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

interface Response<T> {
  code: string;
  data: T | null;
  message: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string;
    if (exception instanceof HttpException) {
      const errorResponse = exception.getResponse();
      message =
        typeof errorResponse === 'string'
          ? errorResponse
          : errorResponse['message'] ||
            exception.message ||
            'An error occurred';
      if (Array.isArray(message)) {
        message = message.join(', ');
      }
    } else {
      message = 'Internal server error';
    }

    const errorResponse: Response<null> = {
      code: status.toString(),
      data: null,
      message,
    };

    response.status(status).json(errorResponse);
  }
}
