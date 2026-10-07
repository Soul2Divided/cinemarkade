import { Injectable } from '@angular/core';
import { Compra, CompraInput, ConfirmarCompraInput, EstadoCompra } from './compra.model';

@Injectable()
export abstract class CompraRepository {
    abstract obtenerPorId(id: string): Promise<Compra>;
    abstract listarPorUsuario(usuarioId: string): Promise<Compra[]>;
    abstract crear(datos: CompraInput): Promise<Compra>;
    abstract confirmarCompra(datos: ConfirmarCompraInput): Promise<string>;
    abstract cambiarEstado(id: string, estado: EstadoCompra): Promise<void>;
}
