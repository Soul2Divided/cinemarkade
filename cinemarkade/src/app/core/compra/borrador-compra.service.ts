import { Injectable, inject } from '@angular/core';
import { BorradorCompra } from './borrador-compra.model';
import { BorradorCompraRepository } from './borrador-compra.repository';

@Injectable({ providedIn: 'root' })
export class BorradorCompraService {
    private readonly repository = inject(BorradorCompraRepository);

    recuperar(): BorradorCompra | null {
        return this.repository.recuperar();
    }

    guardar(borrador: BorradorCompra): void {
        this.repository.guardar(borrador);
    }

    guardarConSolicitud(borrador: BorradorCompra): BorradorCompra {
        const previo = this.repository.recuperar();
        let solicitudId: string = crypto.randomUUID();

        if (previo?.solicitudId && this.mismaSolicitud(previo, borrador)) {
            solicitudId = previo.solicitudId;
        }

        const actualizado = { ...borrador, solicitudId };
        this.repository.guardar(actualizado);
        return actualizado;
    }

    eliminar(): void {
        this.repository.eliminar();
    }

    private mismaSolicitud(primera: BorradorCompra, segunda: BorradorCompra): boolean {
        const firma = (borrador: BorradorCompra) => JSON.stringify({
            tipo: borrador.tipoCompra,
            usuario: borrador.usuarioId,
            productos: borrador.productos,
            combos: borrador.combos,
            recompensas: borrador.recompensas?.map(item => ({
                id: item.recompensa.id,
                cantidad: item.cantidad,
            })),
        });

        return firma(primera) === firma(segunda);
    }
}
