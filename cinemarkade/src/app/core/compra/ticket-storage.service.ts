import { Injectable, inject } from '@angular/core';
import { GuardarTicketInput } from './ticket-storage.model';
import { TicketStorageRepository } from './ticket-storage.repository';

@Injectable({ providedIn: 'root' })
export class TicketStorageService {
    private readonly repository = inject(TicketStorageRepository);

    guardar(compraId: string, pdf: Blob): Promise<string | null> {
        const datos: GuardarTicketInput = { compraId, archivo: pdf };
        this.validarCompraId(datos.compraId);

        if (!(datos.archivo instanceof Blob) || datos.archivo.type !== 'application/pdf') {
            throw new Error('El archivo del ticket debe ser un PDF válido.');
        }

        return this.repository.guardar(datos);
    }

    obtenerUrlDescarga(ruta: string): Promise<string> {
        if (!ruta.trim()) {
            throw new Error('La ruta del ticket es obligatoria.');
        }

        return this.repository.obtenerUrlDescarga(ruta);
    }

    eliminar(ruta: string): Promise<void> {
        if (!ruta.trim()) {
            throw new Error('La ruta del ticket es obligatoria.');
        }

        return this.repository.eliminar(ruta);
    }

    private validarCompraId(compraId: string): void {
        if (!compraId.trim()) {
            throw new Error('El identificador de la compra es obligatorio.');
        }
    }
}
