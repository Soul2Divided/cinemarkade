import { Component, computed, inject } from '@angular/core';
import { CatalogoCandyService } from '../../../../core/candy/catalogo-candy.service';
import { Hero, ItemHero } from '../../../home-page/components/hero/hero';

@Component({
    selector: 'app-cabecera-candy',
    imports: [Hero],
    templateUrl: './cabecera-candy.html',
    styleUrl: './cabecera-candy.scss',
})
export class CabeceraCandy {
    private readonly catalogo = inject(CatalogoCandyService);

    readonly destacados = computed<ItemHero[]>(() => {
        const combos = this.catalogo.combos();
        const destacados = combos.filter((combo) => combo.destacado);

        return (destacados.length ? destacados : combos)
            .map((combo) => ({
                id: combo.id,
                nombre: combo.nombre,
                banner: this.catalogo.imagenCombo(combo),
                genero: 'CANDY BAR',
                duracion: 0,
                restriccion_edad: '',
                sinopsis: combo.descripcion ?? '',
                esCombo: true,
                precio: combo.precio,
            }))
            .filter((combo) => !!combo.banner);
    });
}
