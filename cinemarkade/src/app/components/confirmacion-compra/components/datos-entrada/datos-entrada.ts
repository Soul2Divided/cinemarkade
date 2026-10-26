import { Component, input } from '@angular/core';
import { DatosEntradaCompra } from '../../../../core/compra/resumen-compra.model';

@Component({
    selector: 'app-datos-entrada',
    templateUrl: './datos-entrada.html',
    styleUrl: './datos-entrada.scss',
})
export class DatosEntrada {
    readonly datos = input.required<DatosEntradaCompra>();
}
