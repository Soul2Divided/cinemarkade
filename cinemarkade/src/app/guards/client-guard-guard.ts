import { CanActivateFn } from '@angular/router';

export const clientGuardGuard: CanActivateFn = (route, state) => {
  return true;
};
