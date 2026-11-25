export interface NotificacionUsuario {
    id: string;
    titulo: string;
    mensaje: string;
    creada_en: string;
    leida_en: string | null;
    funcion_id: number | null;
    tipo: string;
    pelicula_id?: number | null;
}

export interface SuscripcionPushInput {
    usuarioId: string;
    clavePublica: string;
}
