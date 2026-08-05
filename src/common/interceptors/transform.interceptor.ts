import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((res) => {
        let message = 'Request successful';
        let data = res;

        if (res && typeof res === 'object') {
          if (res.hasOwnProperty('message') && res.hasOwnProperty('data')) {
            message = res.message;
            data = res.data;
          } else if (res.hasOwnProperty('message') && Object.keys(res).length === 1) {
            message = res.message;
            data = {};
          }
        }

        return {
          success: true,
          message,
          data: data ?? {},
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
