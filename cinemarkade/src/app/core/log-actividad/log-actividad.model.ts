export interface LogActividad {
    id: number;
    usuario_id: string | null;
    accion: string | null;
    detalle: string | null;
    fecha_hora: string | null;
    usuario_nombre: string;
}

export interface RegistrarLogActividadInput {
    usuario_id: string;
    accion: string;
    detalle: string;
    fecha_hora: string;
}
