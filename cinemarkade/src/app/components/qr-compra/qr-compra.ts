import { Component, input, output } from '@angular/core';
import { Modal } from '../modal/modal';

@Component({
    selector: 'app-qr-compra',
    imports: [Modal],
    templateUrl: './qr-compra.html',
    styleUrl: './qr-compra.scss',
})
export class QrCompra {
    readonly imagen = input<string | null>(null);
    readonly codigoManual = input<string | null>(null);
    readonly esCandy = input(false);
    readonly cerrar = output<void>();
}
