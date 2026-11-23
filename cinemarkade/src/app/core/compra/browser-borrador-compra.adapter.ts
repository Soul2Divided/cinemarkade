import { Injectable } from '@angular/core';
import { BorradorCompra } from './borrador-compra.model';
import { BorradorCompraRepository } from './borrador-compra.repository';

@Injectable({ providedIn: 'root' })
export class BrowserBorradorCompraAdapter implements BorradorCompraRepository {
    private readonly clave = 'cinemarkade-compra-borrador';

    recuperar(): BorradorCompra | null {
        const guardado = sessionStorage.getItem(this.clave);

        if (!guardado) {
            return null;
        }

        try {
            return JSON.parse(guardado) as BorradorCompra;
        } catch {
            return null;
        }
    }

    guardar(borrador: BorradorCompra): void {
        sessionStorage.setItem(this.clave, JSON.stringify(borrador));
    }

    eliminar(): void {
        sessionStorage.removeItem(this.clave);
    }
}
