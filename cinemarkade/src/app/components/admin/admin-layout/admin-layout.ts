import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PermisosAdminService, SECCIONES_ADMIN } from '../../../core/user/permisos-admin.service';

@Component({
    imports: [RouterLink, RouterLinkActive, RouterOutlet],
    selector: 'app-admin-layout',
    styleUrl: './admin-layout.scss',
    templateUrl: './admin-layout.html'
})
export class AdminLayout {
    private readonly accesos = inject(PermisosAdminService);

    readonly secciones = computed(() => [
        ...SECCIONES_ADMIN.filter(seccion => this.accesos.permite(seccion.permiso)),
        ...(this.accesos.esAdmin() ? [
            { route: '/admin/nuevo-empleado', label: 'Alta de empleado', icon: '👤' }
        ] : []),
        { route: '/home', label: 'Inicio', icon: '🏠' }
    ]);
}
