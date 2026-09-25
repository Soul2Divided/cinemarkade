import { Injectable } from '@angular/core';

import { ProductoInput, Producto } from './producto.model';

@Injectable()
export abstract class ProductoRepository {
    abstract listar(): Promise<Producto[]>;
    abstract obtenerPorId(id: number): Promise<Producto>;
    abstract crear(datos: ProductoInput): Promise<Producto>;
    abstract actualizar(id: number, datos: ProductoInput): Promise<Producto>;
    abstract cambiarActiva(id: number, activa: boolean): Promise<void>;
}