import { Injectable } from '@angular/core';
import { SeleccionCandy } from './carrito-candy.model';

@Injectable()
export abstract class CarritoCandyRepository {
    abstract restaurar(clave: string): SeleccionCandy[];
    abstract guardar(clave: string, items: SeleccionCandy[]): void;
}
