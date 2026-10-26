import { Component, input } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { LineaResumenCompra } from '../../../../core/compra/resumen-compra.model';

@Component({
    selector: 'app-detalle-compra',
    imports: [CurrencyPipe, DecimalPipe],
    templateUrl: './detalle-compra.html',
    styleUrl: './detalle-compra.scss',
})
export class DetalleCompra {
    readonly productos = input.required<LineaResumenCompra[]>();
    readonly recompensas = input.required<LineaResumenCompra[]>();
}
