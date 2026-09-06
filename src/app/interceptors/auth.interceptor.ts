import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const LOGIN_ENDPOINT_PATH = '/api/auth/login';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const authorizedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authorizedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const isLoginRequest = req.url.includes(LOGIN_ENDPOINT_PATH);
      if (!isLoginRequest && (error.status === 401 || error.status === 403)) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
