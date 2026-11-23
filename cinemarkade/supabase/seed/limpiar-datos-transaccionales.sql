-- Elimina compras/reseñas existentes para dejar la base lista para el mock.
-- Conserva tablas, usuarios, películas, productos, salas, funciones y proyecciones.
-- Ejecutar solo si aceptás borrar todas las compras y reseñas actuales del proyecto.

BEGIN;

DELETE FROM public.canje_recompensa;
DELETE FROM public.compra_butaca;
DELETE FROM public.detalle_compra;
DELETE FROM public.compra;
DELETE FROM public.resena;

UPDATE public.butaca_proyeccion
SET estado = 'libre';

COMMIT;
