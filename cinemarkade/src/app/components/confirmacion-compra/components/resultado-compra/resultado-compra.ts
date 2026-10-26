import { Component, input, output } from '@angular/core';
import { Modal } from '../../../modal/modal';

@Component({
    selector: 'app-resultado-compra',
    imports: [Modal],
    templateUrl: './resultado-compra.html',
    styleUrl: './resultado-compra.scss',
})
export class ResultadoCompra {
    readonly esCandy = input(false);
    readonly abierto = input(false);
    readonly compraAnonima = input(false);
    readonly compraId = input('');
    readonly codigoManual = input('');
    readonly ticketDisponible = input(false);
    readonly error = input('');

    readonly cerrar = output<void>();
    readonly descargar = output<void>();
    readonly volver = output<void>();
    readonly verEntradas = output<void>();
}
