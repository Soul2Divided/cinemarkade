-- Ejecutar después de las migraciones de recompensas, códigos manuales y compra candy.
-- Los accesos adicionales se guardan en cada empleado. El mostrador siempre está habilitado.
BEGIN;

DROP TRIGGER IF EXISTS proteger_rol_usuario ON public.usuario;
DROP TRIGGER IF EXISTS proteger_accesos_usuario ON public.usuario;

ALTER TABLE public.usuario ADD COLUMN IF NOT EXISTS permisos_admin text[] NOT NULL DEFAULT '{}';

-- Conserva los accesos si se instaló la versión anterior del esquema.
DO $$
BEGIN
    IF to_regclass('public.rol_empleado') IS NOT NULL AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'usuario' AND column_name = 'rol_empleado_id'
    ) THEN
        EXECUTE 'UPDATE public.usuario u
            SET permisos_admin = ARRAY(
                SELECT DISTINCT unnest(array_remove(u.permisos_admin || r.secciones, ''validacion''))
            )
            FROM public.rol_empleado r
            WHERE u.rol_empleado_id = r.id AND u.rol::text = ''empleado''';
    END IF;
END;
$$;

ALTER TABLE public.usuario DROP CONSTRAINT IF EXISTS usuario_permisos_admin_validos;
ALTER TABLE public.usuario ADD CONSTRAINT usuario_permisos_admin_validos CHECK (
    array_position(permisos_admin, NULL) IS NULL
    AND permisos_admin <@ ARRAY[
        'peliculas', 'salas', 'funciones', 'productos', 'combos',
        'recompensas', 'cupones', 'reportes', 'auditoria'
    ]::text[]
);

CREATE OR REPLACE FUNCTION public.tiene_permiso_admin(p_seccion text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.usuario u
        WHERE u.id = auth.uid()
            AND (
                u.rol::text = 'admin'
                OR (
                    u.rol::text = 'empleado'
                    AND (
                        p_seccion = 'validacion'
                        OR p_seccion = ANY(u.permisos_admin)
                    )
                )
            )
    );
$$;

REVOKE ALL ON FUNCTION public.tiene_permiso_admin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tiene_permiso_admin(text) TO anon, authenticated;

-- El perfil propio no permite otorgarse accesos ni convertirse en administrador.
CREATE OR REPLACE FUNCTION public.proteger_accesos_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT coalesce(public.es_admin(), false) THEN
        IF TG_OP = 'INSERT' THEN
            IF NEW.rol::text IS DISTINCT FROM 'cliente' OR cardinality(NEW.permisos_admin) <> 0 THEN
                RAISE EXCEPTION 'Solo un administrador puede asignar permisos';
            END IF;
        ELSIF NEW.rol IS DISTINCT FROM OLD.rol OR NEW.permisos_admin IS DISTINCT FROM OLD.permisos_admin THEN
            RAISE EXCEPTION 'Solo un administrador puede modificar los accesos';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proteger_accesos_usuario ON public.usuario;
CREATE TRIGGER proteger_accesos_usuario BEFORE INSERT OR UPDATE ON public.usuario
FOR EACH ROW EXECUTE FUNCTION public.proteger_accesos_usuario();

CREATE OR REPLACE FUNCTION public.crear_perfil_empleado(p_usuario_id uuid, p_datos jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_perfil public.usuario;
BEGIN
    IF auth.uid() IS NULL OR NOT coalesce(public.es_admin(), false) THEN
        RAISE EXCEPTION 'Solo un administrador puede crear empleados';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = p_usuario_id AND lower(email) = lower(btrim(p_datos->>'mail'))
    ) THEN
        RAISE EXCEPTION 'No existe una cuenta de acceso con ese identificador y correo';
    END IF;

    IF EXISTS (SELECT 1 FROM public.usuario WHERE id = p_usuario_id) THEN
        RAISE EXCEPTION 'Esta cuenta ya tiene un perfil; el alta de empleados requiere una cuenta nueva';
    END IF;

    -- Convierte fechas y tipos enumerados usando los tipos reales de usuario.
    SELECT * INTO v_perfil FROM jsonb_populate_record(NULL::public.usuario,
        p_datos || jsonb_build_object('id', p_usuario_id, 'rol', 'empleado', 'puntos', NULL,
            'permisos_admin', coalesce(p_datos->'permisos_admin', '[]'::jsonb))
    );

    INSERT INTO public.usuario (
        id, nombre, apellido, mail, fecha_nacimiento, tipo_sangre, color_ojos,
        cantidad_dias_vacaciones, rol, puntos, permisos_admin
    )
    VALUES (
        v_perfil.id, v_perfil.nombre, v_perfil.apellido, v_perfil.mail, v_perfil.fecha_nacimiento,
        v_perfil.tipo_sangre, v_perfil.color_ojos, v_perfil.cantidad_dias_vacaciones,
        v_perfil.rol, v_perfil.puntos, v_perfil.permisos_admin
    )
    RETURNING * INTO v_perfil;

    RETURN to_jsonb(v_perfil);
END;
$$;

REVOKE ALL ON FUNCTION public.crear_perfil_empleado(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_perfil_empleado(uuid, jsonb) TO authenticated;

-- Mantiene las lecturas públicas y agrega escrituras limitadas a cada sección.
-- Las políticas restrictivas evitan que una política antigua amplíe esos permisos.
DO $$
DECLARE
    v_tabla text;
    v_permiso text;
    v_operacion text;
BEGIN
    FOR v_tabla, v_permiso IN
        SELECT * FROM (VALUES
            ('pelicula', 'peliculas'), ('sala', 'salas'), ('butaca', 'salas'),
            ('funcion', 'funciones'), ('proyeccion', 'funciones'),
            ('butaca_proyeccion', 'funciones'), ('tarifa_formato', 'funciones'),
            ('producto', 'productos'), ('combo', 'combos'), ('combo_item', 'combos'),
            ('cupon', 'cupones'), ('recompensa', 'recompensas')
        ) AS accesos(tabla, permiso)
    LOOP
        IF to_regclass(format('public.%I', v_tabla)) IS NULL THEN
            RAISE EXCEPTION 'Falta la tabla public.%; revisá el esquema antes de instalar los permisos', v_tabla;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_tabla);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', v_tabla);
        EXECUTE format('DROP POLICY IF EXISTS acceso_seccion ON public.%I', v_tabla);
        EXECUTE format(
            'CREATE POLICY acceso_seccion ON public.%I FOR ALL TO authenticated
             USING (public.tiene_permiso_admin(%L)) WITH CHECK (public.tiene_permiso_admin(%L))',
            v_tabla, v_permiso, v_permiso
        );
        EXECUTE format('DROP POLICY IF EXISTS reportes_lectura_catalogo ON public.%I', v_tabla);
        EXECUTE format(
            'CREATE POLICY reportes_lectura_catalogo ON public.%I FOR SELECT TO authenticated
             USING (public.tiene_permiso_admin(''reportes''))', v_tabla
        );

        FOREACH v_operacion IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE'] LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                'limite_seccion_' || lower(v_operacion), v_tabla);
            EXECUTE format(
                'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO authenticated %s',
                'limite_seccion_' || lower(v_operacion), v_tabla, v_operacion,
                CASE v_operacion
                    WHEN 'INSERT' THEN format('WITH CHECK (public.tiene_permiso_admin(%L))', v_permiso)
                    WHEN 'UPDATE' THEN format('USING (public.tiene_permiso_admin(%L)) WITH CHECK (public.tiene_permiso_admin(%L))', v_permiso, v_permiso)
                    ELSE format('USING (public.tiene_permiso_admin(%L))', v_permiso)
                END
            );
        END LOOP;
    END LOOP;
END;
$$;

-- Las secuencias conservan sus permisos actuales y habilitan altas a usuarios
-- autenticados; la inserción de filas sigue condicionada por las políticas RLS.
DO $$
DECLARE
    v_secuencia text;
    v_tabla text;
BEGIN
    FOREACH v_tabla IN ARRAY ARRAY[
        'pelicula', 'sala', 'butaca', 'funcion', 'proyeccion', 'butaca_proyeccion',
        'tarifa_formato', 'producto', 'combo', 'combo_item', 'cupon', 'recompensa'
    ] LOOP
        v_secuencia := pg_get_serial_sequence('public.' || v_tabla, 'id');

        IF v_secuencia IS NOT NULL THEN
            EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO authenticated', v_secuencia);
        END IF;
    END LOOP;
END;
$$;

-- Los reportes ven las compras; cada cliente conserva la lectura de las propias.
DO $$
DECLARE
    v_tabla text;
    v_condicion text;
BEGIN
    FOREACH v_tabla IN ARRAY ARRAY['compra', 'compra_butaca', 'detalle_compra', 'canje_recompensa'] LOOP
        v_condicion := CASE
            WHEN v_tabla IN ('compra', 'canje_recompensa') THEN
                'usuario_id = auth.uid() OR public.tiene_permiso_admin(''reportes'')'
            ELSE format(
                'public.tiene_permiso_admin(''reportes'') OR EXISTS (
                    SELECT 1 FROM public.compra c WHERE c.id = %I.compra_id AND c.usuario_id = auth.uid()
                )', v_tabla)
        END;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_tabla);
        EXECUTE format('GRANT SELECT ON public.%I TO authenticated', v_tabla);
        EXECUTE format('DROP POLICY IF EXISTS lectura_propietario_reportes ON public.%I', v_tabla);
        EXECUTE format(
            'CREATE POLICY lectura_propietario_reportes ON public.%I FOR SELECT TO authenticated USING (%s)',
            v_tabla, v_condicion
        );
        EXECUTE format('DROP POLICY IF EXISTS limite_lectura_propietario_reportes ON public.%I', v_tabla);
        EXECUTE format(
            'CREATE POLICY limite_lectura_propietario_reportes ON public.%I AS RESTRICTIVE FOR SELECT
             TO authenticated USING (%s)', v_tabla, v_condicion
        );
        EXECUTE format('DROP POLICY IF EXISTS sin_lectura_anonima_detalle ON public.%I', v_tabla);
        EXECUTE format(
            'CREATE POLICY sin_lectura_anonima_detalle ON public.%I AS RESTRICTIVE FOR SELECT
             TO anon USING (false)', v_tabla
        );
    END LOOP;
END;
$$;

-- La función de validación es SECURITY DEFINER: también debe verificar el permiso.
DO $$
DECLARE
    v_definicion text := pg_get_functiondef('public.validar_qr_compra(text)'::regprocedure);
BEGIN
    IF position('public.tiene_permiso_admin(''validacion'')' IN v_definicion) > 0 THEN
        RETURN;
    END IF;

    IF position('rol::text IN (''admin'', ''empleado'')' IN v_definicion) = 0 THEN
        RAISE EXCEPTION 'La función validar_qr_compra tiene otra estructura; revisar antes de aplicar permisos';
    END IF;

    EXECUTE replace(v_definicion,
        'rol::text IN (''admin'', ''empleado'')',
        'public.tiene_permiso_admin(''validacion'')'
    );
END;
$$;

-- Retira la gestión anterior de roles si llegó a instalarse.
DROP FUNCTION IF EXISTS public.asignar_rol_empleado(uuid, bigint);
DROP FUNCTION IF EXISTS public.proteger_rol_usuario();

DO $$
BEGIN
    IF to_regclass('public.rol_empleado') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS rol_empleado_consulta ON public.rol_empleado';
    END IF;
END;
$$;

ALTER TABLE public.usuario DROP COLUMN IF EXISTS rol_empleado_id;
DROP TABLE IF EXISTS public.rol_empleado;

COMMIT;
