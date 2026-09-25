import { Injectable, Inject } from '@angular/core';

import { ProductoRepository } from './producto.repository';
import { ProductoInput, Producto } from './producto.model';

@Injectable({ providedIn: 'root' })
export class ProductoService {

    constructor(
        @Inject(ProductoRepository) private productoRepository: ProductoRepository
    ) { }

    async listarProductos(): Promise<Producto[]> {
        return this.productoRepository.listar();
    }

    async obtenerPorId(id: number): Promise<Producto> {
        return this.productoRepository.obtenerPorId(id);
    }

    async crearProducto(datos: ProductoInput): Promise<Producto> {
        this.validarDatosBasicos(datos);
        return this.productoRepository.crear(datos);
    }

    async actualizarProducto(id: number, datos: ProductoInput): Promise<Producto> {
        this.validarDatosBasicos(datos);
        return this.productoRepository.actualizar(id, datos);
    }

    async cambiarActiva(id: number, activa: boolean): Promise<void> {
        return this.productoRepository.cambiarActiva(id, activa);
    }

    private validarDatosBasicos(datos: ProductoInput): void {
        const categoriasValidas = ['COMIDA', 'BEBIDA', 'GOLOSINA', 'SNACK'] as const;

        if (!datos.nombre || !datos.nombre.trim()) {
            throw new Error('El nombre del producto es obligatorio');
        }

        if (!datos.imagen || !datos.imagen.trim()) {
            throw new Error('La imagen del producto es obligatoria');
        }

        if (!datos.descripcion || !datos.descripcion.trim()) {
            throw new Error('La descripción del producto es obligatoria');
        }

        if (!datos.categoria || !categoriasValidas.includes(datos.categoria)) {
            throw new Error('Debe seleccionar una categoría válida');
        }

        if (typeof datos.precio !== 'number' || !Number.isFinite(datos.precio) || datos.precio <= 0) {
            throw new Error('El precio debe ser un número mayor a 0');
        }
    }
}