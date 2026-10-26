import { Component, input } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { TotalesResumenCompra } from '../../../../core/compra/resumen-compra.model';

@Component({
    selector: 'app-totales-compra',
    imports: [CurrencyPipe, DecimalPipe],
    templateUrl: './totales-compra.html',
    styleUrl: './totales-compra.scss',
})
export class TotalesCompra {
    readonly datos = input.required<TotalesResumenCompra>();
    readonly confirmada = input(false);
}
