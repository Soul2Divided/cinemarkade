import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { PermisosAdminService } from '../core/user/permisos-admin.service';

export const adminGuard: CanActivateFn = async () => {
    const accesos = inject(PermisosAdminService);
    const router = inject(Router);

    try {
        await accesos.cargarAccesos();

        if (accesos.esAdmin() || accesos.secciones().some(seccion => seccion !== 'validacion')) {
            return true;
        }

        return router.createUrlTree([accesos.primeraRuta()]);
    } catch {
        return router.createUrlTree(['/home']);
    }
};

export const seccionAdminGuard: CanActivateChildFn = async (ruta) => {
    const accesos = inject(PermisosAdminService);
    const router = inject(Router);

    try {
        await accesos.cargarAccesos();

        if (ruta.data['soloAdmin'] ? accesos.esAdmin() :
            ruta.data['permiso'] && accesos.permite(ruta.data['permiso'])) {
            return true;
        }

        return router.createUrlTree([accesos.primeraRuta()]);
    } catch {
        return router.createUrlTree(['/home']);
    }
};
