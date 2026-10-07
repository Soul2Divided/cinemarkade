import { Injectable } from '@angular/core';
import { DetalleCompra, DetalleCompraInput } from './detalle-compra.model';

@Injectable()
export abstract class DetalleCompraRepository {
    abstract listarPorCompra(compraId: string): Promise<DetalleCompra[]>;
    abstract crearVarios(detalles: DetalleCompraInput[]): Promise<DetalleCompra[]>;
}