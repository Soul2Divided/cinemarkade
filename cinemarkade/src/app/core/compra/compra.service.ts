import { Inject, Injectable } from '@angular/core';
import { CompraRepository } from './compra.repository';
import {
    Compra,
    CompraInput,
    CompraValidadaQr,
    ConfirmarCompraInput,
    EstadoCompra,
} from './compra.model';

@Injectable({ providedIn: 'root' })
export class CompraService {
    constructor(
        @Inject(CompraRepository)
        private readonly compraRepository: CompraRepository,
    ) {}

    async obtenerPorId(id: string): Promise<Compra> {
        this.validarUuid(id, 'compra');
        return this.compraRepository.obtenerPorId(id);
    }

    async listarPorUsuario(usuarioId: string): Promise<Compra[]> {
        this.validarUuid(usuarioId, 'usuario');
        return this.compraRepository.listarPorUsuario(usuarioId);
    }

    async crear(datos: CompraInput): Promise<Compra> {
        if (datos.id) {
            this.validarUuid(datos.id, 'compra');
        }

        if (datos.usuario_id !== null) {
            this.validarUuid(datos.usuario_id, 'usuario');
        }

        if (!Number.isInteger(datos.proyeccion_id) || (datos.proyeccion_id ?? 0) <= 0) {
            throw new Error('La proyección indicada no es válida.');
        }

        if (!datos.estado?.trim()) {
            throw new Error('El estado de la compra es obligatorio.');
        }

        this.validarImporte(datos.total);
        this.validarPuntos(datos.creditos_usados ?? 0);
        this.validarPuntos(datos.puntos_generados);

        return this.compraRepository.crear({
            ...datos,
            creditos_usados: datos.creditos_usados ?? 0,
        });
    }

    async confirmarCompra(datos: ConfirmarCompraInput): Promise<string> {
        const candy = datos.tipo_compra === 'candy';

        if (candy) {
            if (
                datos.proyeccion_id !== null ||
                datos.butacas.length ||
                (!datos.detalles.length && !datos.recompensas.length)
            ) {
                throw new Error(
                    'El pedido de candy debe incluir artículos y no puede tener función ni butacas.',
                );
            }
        } else if (!Number.isInteger(datos.proyeccion_id) || (datos.proyeccion_id ?? 0) <= 0) {
            throw new Error('La proyección indicada no es válida.');
        }
        this.validarImporte(datos.total);
        this.validarPuntos(datos.creditos_usados);
        this.validarPuntos(datos.puntos_generados);
        if (!candy && datos.butacas.length === 0) {
            throw new Error('La compra debe incluir al menos una butaca.');
        }
        if (
            datos.butacas.some(
                (butaca) =>
                    !Number.isInteger(butaca.butaca_proyeccion_id) ||
                    butaca.butaca_proyeccion_id <= 0,
            )
        ) {
            throw new Error('Hay una butaca seleccionada que no es válida.');
        }
        return this.compraRepository.confirmarCompra(datos);
    }

    async validarQr(codigoQr: string): Promise<CompraValidadaQr | null> {
        const codigo = codigoQr.trim().toUpperCase();
        const manual = codigo.replace(/[\s-]/g, '');

        if (/^[0-9A-F]{10}$/.test(manual)) {
            return this.compraRepository.validarQr(manual);
        }

        this.validarUuid(codigo, 'código QR');

        return this.compraRepository.validarQr(codigo.toLowerCase());
    }

    async obtenerTicketConfirmado(solicitudId: string): Promise<CompraValidadaQr> {
        this.validarUuid(solicitudId, 'solicitud');

        return this.compraRepository.obtenerTicketConfirmado(solicitudId);
    }

    async cancelarCompra(compraId: string): Promise<number> {
        this.validarUuid(compraId, 'compra');
        return this.compraRepository.cancelarCompra(compraId);
    }

    async cambiarEstado(id: string, estado: EstadoCompra): Promise<void> {
        this.validarUuid(id, 'compra');

        if (!estado.trim()) {
            throw new Error('El estado de la compra es obligatorio.');
        }

        return this.compraRepository.cambiarEstado(id, estado);
    }

    private validarImporte(importe: number): void {
        if (!Number.isFinite(importe) || importe < 0) {
            throw new Error('El total de la compra debe ser un importe válido.');
        }
    }

    private validarPuntos(puntos: number): void {
        if (!Number.isInteger(puntos) || puntos < 0) {
            throw new Error('La cantidad de puntos debe ser un entero igual o mayor que cero.');
        }
    }

    private validarUuid(valor: string, entidad: string): void {
        const uuidValido =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                valor,
            );

        if (!uuidValido) {
            throw new Error(`El identificador de ${entidad} no es válido.`);
        }
    }
}
