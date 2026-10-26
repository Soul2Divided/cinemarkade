import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Component, inject } from '@angular/core';
import {
    LineaCarritoCandy,
    CarritoCandyService,
} from '../../../../core/candy/carrito-candy.service';
import { CatalogoCandyService } from '../../../../core/candy/catalogo-candy.service';

@Component({
    selector: 'app-resumen-candy',
    imports: [CurrencyPipe, DecimalPipe],
    templateUrl: './resumen-candy.html',
    styleUrl: './resumen-candy.scss',
})
export class ResumenCandy {
    private readonly router = inject(Router);
    readonly catalogo = inject(CatalogoCandyService);
    readonly carrito = inject(CarritoCandyService);

    continuar(): void {
        try {
            this.carrito.prepararCompra();
            void this.router.navigate(['/confirmacion-compra'], { queryParams: { tipo: 'candy' } });
        } catch (error) {
            this.carrito.mensaje.set(
                error instanceof Error ? error.message : 'No se pudo preparar el pedido.',
            );
        }
    }

    actualizarCantidad(item: LineaCarritoCandy, event: Event): void {
        const input = event.target as HTMLInputElement;
        this.carrito.cambiarCantidad(item.tipo, item.id, input.valueAsNumber);
        input.value = String(this.carrito.cantidad(item.tipo, item.id));
    }
}
