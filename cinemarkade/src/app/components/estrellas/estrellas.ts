import { Component, computed, input } from '@angular/core';

@Component({
    selector: 'app-estrellas',
    templateUrl: './estrellas.html',
    styleUrl: './estrellas.scss',
})
export class Estrellas {
    readonly valor = input(0);
    readonly cantidad = input(5);
    readonly posiciones = computed(() => [1, 2, 3, 4, 5].slice(0, this.cantidad()));

    porcentaje(posicion: number): number {
        return Math.max(0, Math.min(100, (this.valor() - posicion + 1) * 100));
    }
}
