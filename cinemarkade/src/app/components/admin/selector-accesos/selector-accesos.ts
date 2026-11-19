import { Component, input, output } from '@angular/core';
import { SECCIONES_ADMIN } from '../../../core/user/permisos-admin.service';

@Component({
    selector: 'app-selector-accesos',
    templateUrl: './selector-accesos.html',
    styleUrl: './selector-accesos.scss'
})
export class SelectorAccesos {
    readonly seleccion = input<string[]>([]);
    readonly bloqueado = input(false);
    readonly cambiar = output<string[]>();
    readonly opciones = SECCIONES_ADMIN.filter(seccion => seccion.permiso !== 'validacion');

    alternar(permiso: string): void {
        const actuales = this.seleccion();
        this.cambiar.emit(actuales.includes(permiso)
            ? actuales.filter(actual => actual !== permiso)
            : [...actuales, permiso]);
    }
}
