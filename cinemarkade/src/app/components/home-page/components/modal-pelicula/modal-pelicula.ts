import { Component, input, output } from '@angular/core';
import { Pelicula } from '../../../../core/pelicula/pelicula.model';
import { UpperCasePipe } from '@angular/common';
import { FormatoDuracion } from '../../../../shared/duracion.pipe';
import { EnfoqueDirective } from '../../../../shared/enfoque.directive';

@Component({
    imports: [UpperCasePipe, FormatoDuracion, EnfoqueDirective],
    selector: 'app-modal-pelicula',
    styleUrl: './modal-pelicula.scss',
    templateUrl: './modal-pelicula.html',
})
export class ModalPelicula {
    pelicula = input.required<Pelicula>();

    cerrar = output<void>();
    verFunciones = output<number>();
}
