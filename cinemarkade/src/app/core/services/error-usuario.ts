export const MENSAJE_ERROR_USUARIO =
    'Ocurrió un error. Disculpá las molestias e intentá nuevamente más tarde.';

export function registrarErrorUsuario(contexto: string, error: unknown): string {
    console.error(contexto, error);
    return MENSAJE_ERROR_USUARIO;
}
