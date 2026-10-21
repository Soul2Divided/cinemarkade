-- Ejecutar después de 202610210001_resenas.sql y 202610210002_usuarios_prueba.sql.
-- Corrige las vistas existentes y deja las políticas de reseñas explícitas.
BEGIN;

-- Los nombres y los datos de acceso de prueba son proyecciones públicas.
-- Se conserva el tipo original para reemplazar las vistas sin cambiar sus columnas.
DO $$
DECLARE
    tipo_nombre text;
    tipo_mail text;
    tipo_rol text;
BEGIN
    SELECT format_type(atttypid, atttypmod) INTO tipo_nombre
    FROM pg_attribute WHERE attrelid = 'public.usuario'::regclass AND attname = 'nombre' AND NOT attisdropped;

    SELECT format_type(atttypid, atttypmod) INTO tipo_mail
    FROM pg_attribute WHERE attrelid = 'public.usuario'::regclass AND attname = 'mail' AND NOT attisdropped;

    SELECT format_type(atttypid, atttypmod) INTO tipo_rol
    FROM pg_attribute WHERE attrelid = 'public.usuario'::regclass AND attname = 'rol' AND NOT attisdropped;

    EXECUTE format('ALTER TABLE public.resena ADD COLUMN IF NOT EXISTS autor_nombre %s', tipo_nombre);
    EXECUTE format('ALTER TABLE public.usuario_prueba ADD COLUMN IF NOT EXISTS mail %s', tipo_mail);
    EXECUTE format('ALTER TABLE public.usuario_prueba ADD COLUMN IF NOT EXISTS rol_usuario %s', tipo_rol);
END;
$$;

UPDATE public.resena resena
SET autor_nombre = coalesce(usuario.nombre, 'Usuario')
FROM public.usuario usuario
WHERE usuario.id = resena.usuario_id;

ALTER TABLE public.resena ALTER COLUMN autor_nombre SET NOT NULL;

-- El nombre público se toma del perfil del autor al publicar o editar.
-- La función usa los permisos del usuario: no eleva privilegios.
CREATE OR REPLACE FUNCTION public.completar_autor_resena()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    SELECT coalesce(usuario.nombre, 'Usuario') INTO NEW.autor_nombre
    FROM public.usuario usuario
    WHERE usuario.id = NEW.usuario_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró el perfil del autor de la reseña.';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.completar_autor_resena() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS resena_completar_autor ON public.resena;
CREATE TRIGGER resena_completar_autor BEFORE INSERT OR UPDATE ON public.resena
    FOR EACH ROW EXECUTE FUNCTION public.completar_autor_resena();

ALTER TABLE public.resena ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resena_lectura ON public.resena;
DROP POLICY IF EXISTS resena_crear_propia ON public.resena;
DROP POLICY IF EXISTS resena_editar_propia ON public.resena;
DROP POLICY IF EXISTS resena_eliminar_propia ON public.resena;
DROP POLICY IF EXISTS resena_insert_identidad ON public.resena;
DROP POLICY IF EXISTS resena_update_identidad ON public.resena;
DROP POLICY IF EXISTS resena_delete_identidad ON public.resena;

-- Cualquiera puede leer las reseñas, incluidos los visitantes sin sesión.
CREATE POLICY resena_lectura ON public.resena FOR SELECT TO anon, authenticated
    USING (true);

-- Los usuarios con sesión solo pueden crear, editar o eliminar sus reseñas.
CREATE POLICY resena_crear_propia ON public.resena FOR INSERT TO authenticated
    WITH CHECK (usuario_id = (SELECT auth.uid()));
CREATE POLICY resena_editar_propia ON public.resena FOR UPDATE TO authenticated
    USING (usuario_id = (SELECT auth.uid())) WITH CHECK (usuario_id = (SELECT auth.uid()));
CREATE POLICY resena_eliminar_propia ON public.resena FOR DELETE TO authenticated
    USING (usuario_id = (SELECT auth.uid()));

-- Estas restricciones siguen aplicándose si existen otras políticas permisivas.
CREATE POLICY resena_insert_identidad ON public.resena AS RESTRICTIVE FOR INSERT TO authenticated
    WITH CHECK (usuario_id = (SELECT auth.uid()));
CREATE POLICY resena_update_identidad ON public.resena AS RESTRICTIVE FOR UPDATE TO authenticated
    USING (usuario_id = (SELECT auth.uid())) WITH CHECK (usuario_id = (SELECT auth.uid()));
CREATE POLICY resena_delete_identidad ON public.resena AS RESTRICTIVE FOR DELETE TO authenticated
    USING (usuario_id = (SELECT auth.uid()));

REVOKE ALL ON public.resena FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id, usuario_id, pelicula_id, estrellas, comentario, fecha, autor_nombre),
    UPDATE (id, usuario_id, pelicula_id, estrellas, comentario, fecha, autor_nombre)
    ON public.resena FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.resena TO anon, authenticated;
GRANT INSERT (usuario_id, pelicula_id, estrellas, comentario) ON public.resena TO authenticated;
GRANT UPDATE (estrellas, comentario) ON public.resena TO authenticated;
GRANT DELETE ON public.resena TO authenticated;

DO $$
DECLARE
    secuencia text := pg_get_serial_sequence('public.resena', 'id');
BEGIN
    IF secuencia IS NOT NULL THEN
        EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO authenticated', secuencia);
    END IF;
END;
$$;

-- No se agrega ninguna política de lectura pública sobre usuario.
-- El autor puede leer su propio nombre con las políticas de perfil existentes.
GRANT SELECT (id, nombre) ON public.usuario TO authenticated;
GRANT SELECT (id, nombre, imagen) ON public.pelicula TO anon, authenticated;

CREATE OR REPLACE VIEW public.resena_detalle
WITH (security_invoker = true, security_barrier = true) AS
SELECT
    resena.id,
    resena.usuario_id,
    resena.pelicula_id,
    resena.estrellas,
    resena.comentario,
    resena.fecha,
    resena.autor_nombre,
    pelicula.nombre AS pelicula_nombre,
    pelicula.imagen AS pelicula_imagen
FROM public.resena resena
JOIN public.pelicula pelicula ON pelicula.id = resena.pelicula_id;

REVOKE ALL ON public.resena_detalle FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.resena_detalle TO anon, authenticated;

-- El catálogo de pruebas guarda únicamente los datos que muestra el menú.
UPDATE public.usuario_prueba prueba
SET mail = usuario.mail, rol_usuario = usuario.rol
FROM public.usuario usuario
WHERE usuario.id = prueba.usuario_id;

ALTER TABLE public.usuario_prueba
    ALTER COLUMN mail SET NOT NULL,
    ALTER COLUMN rol_usuario SET NOT NULL;

-- La clave compuesta mantiene mail y rol sincronizados sin consultas públicas
-- a usuario. Impide que una cuenta del catálogo pase a ser administradora:
-- primero habría que retirarla expresamente del catálogo de pruebas.
CREATE UNIQUE INDEX IF NOT EXISTS usuario_identidad_prueba ON public.usuario(id, mail, rol);

ALTER TABLE public.usuario_prueba DROP CONSTRAINT IF EXISTS usuario_prueba_identidad;
ALTER TABLE public.usuario_prueba ADD CONSTRAINT usuario_prueba_identidad
    FOREIGN KEY (usuario_id, mail, rol_usuario) REFERENCES public.usuario(id, mail, rol)
    ON UPDATE CASCADE;

ALTER TABLE public.usuario_prueba DROP CONSTRAINT IF EXISTS usuario_prueba_rol_valido;
ALTER TABLE public.usuario_prueba ADD CONSTRAINT usuario_prueba_rol_valido CHECK (
    (tipo = 'empleado' AND rol_usuario::text = 'empleado')
    OR (tipo IN ('cliente', 'cliente_menor') AND rol_usuario::text = 'cliente')
);

ALTER TABLE public.usuario_prueba ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS usuario_prueba_lectura ON public.usuario_prueba;
DROP POLICY IF EXISTS usuario_prueba_solo_activos ON public.usuario_prueba;

CREATE POLICY usuario_prueba_lectura ON public.usuario_prueba FOR SELECT TO anon, authenticated
    USING (activo);
CREATE POLICY usuario_prueba_solo_activos ON public.usuario_prueba AS RESTRICTIVE FOR SELECT TO anon, authenticated
    USING (activo);

REVOKE ALL ON public.usuario_prueba FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, etiqueta, mail, tipo, orden, activo, rol_usuario)
    ON public.usuario_prueba TO anon, authenticated;

CREATE OR REPLACE VIEW public.usuario_prueba_disponible
WITH (security_invoker = true, security_barrier = true) AS
SELECT
    prueba.id,
    prueba.etiqueta,
    prueba.mail,
    prueba.tipo,
    prueba.orden,
    prueba.activo
FROM public.usuario_prueba prueba
WHERE prueba.activo
    AND (
        (prueba.tipo = 'empleado' AND prueba.rol_usuario::text = 'empleado')
        OR (prueba.tipo IN ('cliente', 'cliente_menor') AND prueba.rol_usuario::text = 'cliente')
    );

REVOKE ALL ON public.usuario_prueba_disponible FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.usuario_prueba_disponible TO anon, authenticated;

COMMIT;

-- Verificación: las dos vistas deben incluir security_invoker=true.
SELECT relname AS vista, reloptions AS opciones
FROM pg_class
WHERE oid IN ('public.resena_detalle'::regclass, 'public.usuario_prueba_disponible'::regclass);

SELECT policyname, roles, cmd, permissive, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('resena', 'usuario_prueba')
ORDER BY tablename, policyname;
