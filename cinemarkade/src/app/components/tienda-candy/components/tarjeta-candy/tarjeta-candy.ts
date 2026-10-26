import { Component, input, output, signal } from '@angular/core';

@Component({
    selector: 'app-tarjeta-candy',
    templateUrl: './tarjeta-candy.html',
    styleUrl: './tarjeta-candy.scss',
})
export class TarjetaCandy {
    readonly nombre = input.required<string>();
    readonly imagen = input<string | null>(null);
    readonly cantidad = input(0);
    readonly bloqueada = input(false);
    readonly bloquearIncremento = input(false);
    readonly maximo = input(99);
    readonly esRecompensa = input(false);
    readonly etiquetaAgregar = input('AGREGAR +');
    readonly agregar = output<void>();
    readonly cambiarCantidad = output<number>();
    readonly imagenFallida = signal(false);
}
