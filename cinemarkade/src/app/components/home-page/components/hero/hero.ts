import { Component, input, output } from '@angular/core';
import { UpperCasePipe, CurrencyPipe } from '@angular/common';
import { FormatoDuracion } from '../../../../shared/duracion.pipe';

export interface ItemHero {
    id: number;
    nombre: string;
    banner: string;
    genero: string;
    duracion: number;
    restriccion_edad: string;
    sinopsis: string;
    esCombo?: boolean;
    precio?: number;
}

@Component({
    imports: [UpperCasePipe, CurrencyPipe, FormatoDuracion],
    selector: 'app-hero',
    styleUrl: './hero.scss',
    templateUrl: './hero.html',
})

export class Hero {
    elementos = input.required<ItemHero[]>();
    seleccionarDestacado = output<ItemHero>();

    indiceHeroActual: number = 0;

    seleccionarHero(index: number): void {
        this.indiceHeroActual = index;
    }
}
