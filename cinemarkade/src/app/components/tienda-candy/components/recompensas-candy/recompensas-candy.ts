import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { TarjetaCandy } from '../tarjeta-candy/tarjeta-candy';
import { CarritoCandyService } from '../../../../core/candy/carrito-candy.service';
import { CatalogoCandyService } from '../../../../core/candy/catalogo-candy.service';

@Component({
    selector: 'app-recompensas-candy',
    imports: [DecimalPipe, TarjetaCandy],
    templateUrl: './recompensas-candy.html',
    styleUrl: './recompensas-candy.scss',
})
export class RecompensasCandy {
    readonly catalogo = inject(CatalogoCandyService);
    readonly carrito = inject(CarritoCandyService);

    readonly recompensas = computed(() =>
        this.catalogo.recompensas().map((recompensa) => {
            const producto =
                recompensa.tipo === 'producto'
                    ? this.catalogo.productos().find((item) => item.id === recompensa.producto_id)
                    : undefined;
            const combo =
                recompensa.tipo === 'combo'
                    ? this.catalogo.combos().find((item) => item.id === recompensa.combo_id)
                    : undefined;

            return {
                ...recompensa,
                nombreArticulo: producto?.nombre ?? combo?.nombre ?? recompensa.nombre,
                descripcion: producto?.descripcion ?? combo?.descripcion ?? '',
                imagen: producto?.imagen ?? (combo ? this.catalogo.imagenCombo(combo) : ''),
                maximoCanjes: Math.floor(this.carrito.maximoUnidades / recompensa.cantidad),
            };
        }),
    );
}
