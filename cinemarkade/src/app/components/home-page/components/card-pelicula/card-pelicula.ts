import { Component, input, output } from '@angular/core';
import { Pelicula } from '../../../../core/pelicula/pelicula.model';

@Component({
    imports: [],
    selector: 'app-card-pelicula',
    styleUrl: './card-pelicula.scss',
    templateUrl: './card-pelicula.html',
})

export class CardPelicula {
    readonly pelicula = input.required<Pelicula>();

    seleccionarPelicula = output<Pelicula>();
}
