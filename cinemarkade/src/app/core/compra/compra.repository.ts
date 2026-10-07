import { Injectable } from '@angular/core';
import { Compra, CompraInput, EstadoCompra } from './compra.model';

@Injectable()
export abstract class CompraRepository {
    abstract obtenerPorId(id: string): Promise<Compra>;
    abstract listarPorUsuario(usuarioId: string): Promise<Compra[]>;
    abstract crear(datos: CompraInput): Promise<Compra>;
    abstract cambiarEstado(id: string, estado: EstadoCompra): Promise<void>;
}