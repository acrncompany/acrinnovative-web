import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { NotifyService } from './notify.service';

/** Everything except /login requires a login. Unknown visitors are sent to /login and returned afterwards. */
export const authGuard: CanActivateFn = async (_route, state) => {
  // inject() must happen before the first await.
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ensureChecked();
  return auth.user() ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** If the session expires while working, go to the login page (and say why). Network failures get a clear message. */
export const sessionInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotifyService);
  return next(req).pipe(
    catchError((e: HttpErrorResponse) => {
      const isLogin = req.url.endsWith('/auth/login');
      if (e.status === 401 && !isLogin) {
        if (auth.user()) {
          auth.user.set(null);
          notify.error('Your session has expired. Please log in again.');
          router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        }
      } else if (e.status === 0) {
        notify.error('Cannot reach the server. Please check your internet connection and try again.');
      }
      return throwError(() => e);
    }),
  );
};
