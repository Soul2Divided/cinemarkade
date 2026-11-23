import { Injectable } from '@angular/core';
import { BorradorCompra } from './borrador-compra.model';

@Injectable()
export abstract class BorradorCompraRepository {
    abstract recuperar(): BorradorCompra | null;
    abstract guardar(borrador: BorradorCompra): void;
    abstract eliminar(): void;
}
