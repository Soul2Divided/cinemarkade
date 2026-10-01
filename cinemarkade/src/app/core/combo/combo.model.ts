export interface Combo {
    id: number;
    nombre: string;
    descripcion: string | null;
    imagen: string | null;
    precio: number;
    activo: boolean;
    destacado: boolean;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    created_at: string;
    items?: ComboItem[];
}

export interface ComboItem {
    id: number;
    combo_id: number;
    producto_id: number;
    cantidad: number;
}

export interface ComboItemInput {
    producto_id: number;
    cantidad: number;
}

export interface CrearComboInput {
    nombre: string;
    descripcion?: string | null;
    imagen?: string | null;
    precio: number;
    activo?: boolean;
    destacado?: boolean;
    fecha_inicio?: string | null;
    fecha_fin?: string | null;
    items: ComboItemInput[];
}
