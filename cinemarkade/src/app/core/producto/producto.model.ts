export type CategoriaProducto = 'COMIDA' | 'BEBIDA' | 'GOLOSINA' | 'SNACK';

export interface Producto {
    id: number;
    nombre: string;
    imagen: string;
    categoria: CategoriaProducto;
    descripcion: string;
    precio: number;
    activa: boolean;
}

export type ProductoInput = Omit<Producto, 'id' | 'activa'>;