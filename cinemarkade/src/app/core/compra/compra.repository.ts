import { Injectable } from '@angular/core';
import { Compra, CompraInput, CompraValidadaQr, ConfirmarCompraInput, EstadoCompra } from './compra.model';

@Injectable()
export abstract class CompraRepository {
    abstract obtenerPorId(id: string): Promise<Compra>;
    abstract listarPorUsuario(usuarioId: string): Promise<Compra[]>;
    abstract crear(datos: CompraInput): Promise<Compra>;
    abstract confirmarCompra(datos: ConfirmarCompraInput): Promise<string>;
    abstract validarQr(codigoQr: string): Promise<CompraValidadaQr | null>;
    abstract cancelarCompra(compraId: string): Promise<number>;
    abstract cambiarEstado(id: string, estado: EstadoCompra): Promise<void>;
}
