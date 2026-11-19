import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermisosAdminService } from '../core/user/permisos-admin.service';

export const employeeGuard: CanActivateFn = async () => {
    const accesos = inject(PermisosAdminService);
    const router = inject(Router);

    try {
        await accesos.cargarAccesos();

        return accesos.permite('validacion') || router.createUrlTree(['/home']);
    } catch {
        return router.createUrlTree(['/home']);
    }
};
