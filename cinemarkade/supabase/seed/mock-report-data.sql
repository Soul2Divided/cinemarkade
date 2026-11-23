-- Datos de prueba para historial, reseñas y reportes.
-- Antes de ejecutar: correr crear-cuentas-mock.mjs para crear las cuentas de Auth.
-- Este script crea sus perfiles, pero NO las agrega a usuario_prueba ni crea Auth users.
-- Requiere al menos una película, un producto candy, una sala con 5 butacas y
-- las migraciones del esquema ya aplicadas. Ejecutar una sola vez por proyecto.

BEGIN;

DO $$
DECLARE
    v_hoy date := timezone('America/Argentina/Buenos_Aires', now())::date;
    v_lunes date;
    v_fechas date[];
    v_pelicula record;
    v_producto record;
    v_sala record;
    v_funcion_id bigint;
    v_proyeccion_id bigint;
    v_compra_id uuid;
    v_precio numeric;
    v_grupo integer;
    v_indice_pelicula integer;
    v_usuario integer;
    v_indice_producto integer;
    v_total_peliculas integer;
    v_total_productos integer;
    v_total_pesos integer;
    v_usuario_id uuid;
    v_solicitud uuid;
    v_asiento record;
    v_asientos_asignados integer;
    v_numero_compras integer := 0;
    v_numero_resenas integer := 0;
    v_email text;
BEGIN
    CREATE TEMP TABLE _mock_usuarios (
        indice integer PRIMARY KEY,
        usuario_id uuid UNIQUE NOT NULL
    ) ON COMMIT DROP;

    CREATE TEMP TABLE _mock_peliculas (
        indice integer PRIMARY KEY,
        pelicula_id bigint UNIQUE NOT NULL
    ) ON COMMIT DROP;

    CREATE TEMP TABLE _mock_productos (
        indice integer PRIMARY KEY,
        producto_id bigint UNIQUE NOT NULL,
        nombre text NOT NULL,
        precio numeric NOT NULL
    ) ON COMMIT DROP;

    CREATE TEMP TABLE _mock_proyecciones (
        grupo integer NOT NULL,
        indice_pelicula integer NOT NULL,
        proyeccion_id bigint NOT NULL,
        PRIMARY KEY (grupo, indice_pelicula)
    ) ON COMMIT DROP;

    CREATE TEMP TABLE _mock_compras_entradas (
        grupo integer NOT NULL,
        indice_pelicula integer NOT NULL,
        indice_usuario integer NOT NULL,
        compra_id uuid NOT NULL,
        proyeccion_id bigint NOT NULL,
        cantidad_entradas integer NOT NULL,
        PRIMARY KEY (grupo, indice_pelicula, indice_usuario)
    ) ON COMMIT DROP;

    FOR v_usuario IN 1..20 LOOP
        v_email := 'cliente.mock' || lpad(v_usuario::text, 2, '0') || '@cinemarkade.example';
        SELECT id INTO v_usuario_id FROM auth.users WHERE lower(email) = v_email;

        IF v_usuario_id IS NULL THEN
            RAISE EXCEPTION 'Falta crear % en Authentication. Créalo con la contraseña compartida y vuelve a ejecutar.', v_email;
        END IF;

        INSERT INTO public.usuario (
            id, nombre, apellido, mail, fecha_nacimiento, tipo_sangre,
            color_ojos, cantidad_dias_vacaciones, puntos, rol, permisos_admin
        ) VALUES (
            v_usuario_id,
            'Cliente Mock ' || lpad(v_usuario::text, 2, '0'),
            'Cinemarkade',
            v_email,
            make_date(1980 + ((v_usuario - 1) % 18), ((v_usuario - 1) % 8) + 1, 15),
            (ARRAY['A+', 'A-', 'B+', 'B-', 'AB+', 'O+', 'O-'])[((v_usuario - 1) % 7) + 1],
            (ARRAY['Marrón', 'Verde', 'Azul/Celeste'])[((v_usuario - 1) % 3) + 1],
            14,
            5000 + (v_usuario - 1) * 250,
            'cliente',
            '{}'
        ) ON CONFLICT (id) DO NOTHING;

        INSERT INTO _mock_usuarios (indice, usuario_id) VALUES (v_usuario - 1, v_usuario_id);
    END LOOP;

    INSERT INTO _mock_peliculas (indice, pelicula_id)
    SELECT row_number() OVER (ORDER BY id) - 1, id
    FROM (SELECT id FROM public.pelicula WHERE activa ORDER BY id LIMIT 5) peliculas;
    SELECT count(*) INTO v_total_peliculas FROM _mock_peliculas;
    IF v_total_peliculas = 0 THEN
        RAISE EXCEPTION 'Agregá al menos una película activa antes de ejecutar el mock.';
    END IF;
    SELECT sum(v_total_peliculas - indice) INTO v_total_pesos FROM _mock_peliculas;

    INSERT INTO _mock_productos (indice, producto_id, nombre, precio)
    SELECT row_number() OVER (ORDER BY id) - 1, id, nombre, precio
    FROM (
        SELECT id, nombre, precio
        FROM public.producto
        WHERE activa
          AND precio IS NOT NULL
          AND precio >= 0
        ORDER BY id
    ) productos;
    SELECT count(*) INTO v_total_productos FROM _mock_productos;
    IF v_total_productos = 0 THEN
        RAISE EXCEPTION 'Agregá al menos un producto candy activo antes de ejecutar el mock.';
    END IF;

    SELECT s.id, s.formato INTO v_sala
    FROM public.sala s
    WHERE s.activa
      AND (SELECT count(*) FROM public.butaca b WHERE b.sala_id = s.id) >=
          ceil(20.0 * v_total_peliculas / v_total_pesos)::integer + 1
    ORDER BY s.id
    LIMIT 1;
    IF v_sala.id IS NULL THEN
        RAISE EXCEPTION 'Se necesita una sala activa con capacidad para las entradas del mock.';
    END IF;

    v_lunes := v_hoy - (extract(isodow FROM v_hoy)::integer - 1);
    v_fechas := ARRAY[
        v_lunes + least(2, v_hoy - v_lunes),
        make_date(extract(year FROM v_hoy)::integer, extract(month FROM v_hoy)::integer, greatest(1, least(extract(day FROM v_hoy)::integer, 15))),
        (date_trunc('month', v_hoy) - interval '1 month' + interval '9 days')::date,
        (date_trunc('month', v_hoy) - interval '2 months' + interval '9 days')::date
    ];

    FOR v_grupo IN 0..3 LOOP
        FOR v_pelicula IN SELECT indice, pelicula_id FROM _mock_peliculas ORDER BY indice LOOP
            v_indice_pelicula := v_pelicula.indice;

            INSERT INTO public.funcion (
                pelicula_id, sala_id, fecha, formato, idioma, es_estreno,
                es_preventa, fecha_disponible_preventa, porcentaje_recargo_preventa, activa
            ) VALUES (
                v_pelicula.pelicula_id, v_sala.id, v_fechas[v_grupo + 1], v_sala.formato,
                CASE WHEN v_indice_pelicula % 2 = 0 THEN 'Subtitulada' ELSE 'Doblada' END,
                false, false, null, null, false
            ) RETURNING id INTO v_funcion_id;

            INSERT INTO public.proyeccion (funcion_id, horario, idioma, activa)
            VALUES (
                v_funcion_id,
                to_char(make_time(10 + v_indice_pelicula * 2, 0, 0), 'HH24:MI:SS'),
                CASE WHEN v_indice_pelicula % 2 = 0 THEN 'Subtitulada' ELSE 'Doblada' END,
                false
            )
            RETURNING id INTO v_proyeccion_id;

            INSERT INTO public.butaca_proyeccion (proyeccion_id, butaca_id, estado)
            SELECT v_proyeccion_id, b.id, 'libre'
            FROM public.butaca b
            WHERE b.sala_id = v_sala.id
            ON CONFLICT (proyeccion_id, butaca_id) DO NOTHING;

            INSERT INTO _mock_proyecciones (grupo, indice_pelicula, proyeccion_id)
            VALUES (v_grupo, v_indice_pelicula, v_proyeccion_id);

            FOR v_usuario IN
                SELECT u.indice
                FROM _mock_usuarios u
                CROSS JOIN LATERAL (
                    SELECT floor((((u.indice + v_grupo * 3) % 20)::numeric * v_total_pesos) / 20)::integer AS turno
                ) t
                JOIN (
                    SELECT indice,
                           sum(v_total_peliculas - indice) OVER (ORDER BY indice) AS acumulado
                    FROM _mock_peliculas
                ) pesos ON pesos.indice = v_indice_pelicula
                WHERE t.turno >= pesos.acumulado - (v_total_peliculas - pesos.indice)
                  AND t.turno < pesos.acumulado
                ORDER BY u.indice
            LOOP
                v_compra_id := gen_random_uuid();
                v_solicitud := (
                    substr(md5('cinemarkade-mock-entrada:' || v_grupo || ':' || v_usuario), 1, 8) || '-' ||
                    substr(md5('cinemarkade-mock-entrada:' || v_grupo || ':' || v_usuario), 9, 4) || '-' ||
                    substr(md5('cinemarkade-mock-entrada:' || v_grupo || ':' || v_usuario), 13, 4) || '-' ||
                    substr(md5('cinemarkade-mock-entrada:' || v_grupo || ':' || v_usuario), 17, 4) || '-' ||
                    substr(md5('cinemarkade-mock-entrada:' || v_grupo || ':' || v_usuario), 21, 12)
                )::uuid;
                v_precio := 7000 + ((v_usuario + v_grupo) % 4) * 750;
                INSERT INTO public.compra (
                    id, usuario_id, proyeccion_id, fecha_compra, estado, total,
                    creditos_usados, codigo_qr, url_pdf, puntos_generados, solicitud_id
                ) VALUES (
                    v_compra_id,
                    (SELECT usuario_id FROM _mock_usuarios WHERE indice = v_usuario),
                    v_proyeccion_id,
                    v_fechas[v_grupo + 1] + make_time(10 + v_indice_pelicula * 2, 0, 0),
                    'utilizada',
                    v_precio * CASE WHEN v_usuario = (SELECT min(u.indice) FROM _mock_usuarios u WHERE (u.indice + v_grupo) % v_total_peliculas = v_indice_pelicula) THEN 2 ELSE 1 END,
                    0, null, null, 0, v_solicitud
                );

                INSERT INTO _mock_compras_entradas (
                    grupo, indice_pelicula, indice_usuario, compra_id, proyeccion_id, cantidad_entradas
                ) VALUES (
                    v_grupo, v_indice_pelicula, v_usuario, v_compra_id, v_proyeccion_id,
                    CASE WHEN v_usuario = (SELECT min(u.indice) FROM _mock_usuarios u WHERE (u.indice + v_grupo) % v_total_peliculas = v_indice_pelicula) THEN 2 ELSE 1 END
                );
                v_numero_compras := v_numero_compras + 1;
            END LOOP;
        END LOOP;
    END LOOP;

    FOR v_pelicula IN
        SELECT c.compra_id, c.proyeccion_id, c.indice_usuario, c.cantidad_entradas,
               c.grupo, c.indice_pelicula
        FROM _mock_compras_entradas c
        ORDER BY c.grupo, c.indice_pelicula, c.indice_usuario
    LOOP
        v_asientos_asignados := 0;
        FOR v_asiento IN
            SELECT bp.id
            FROM public.butaca_proyeccion bp
            JOIN public.butaca b ON b.id = bp.butaca_id
            WHERE bp.proyeccion_id = v_pelicula.proyeccion_id
              AND bp.estado::text = 'libre'
            ORDER BY b.fila, b.columna
            LIMIT v_pelicula.cantidad_entradas
        LOOP
            INSERT INTO public.compra_butaca (
                compra_id, butaca_proyeccion_id, medio_pago, precio_unitario, puntos_usados
            ) VALUES (
                v_pelicula.compra_id, v_asiento.id, 'dinero',
                (SELECT c.total / e.cantidad_entradas FROM _mock_compras_entradas e
                 JOIN public.compra c ON c.id = e.compra_id
                 WHERE e.compra_id = v_pelicula.compra_id),
                0
            );
            UPDATE public.butaca_proyeccion SET estado = 'ocupada' WHERE id = v_asiento.id;
            v_asientos_asignados := v_asientos_asignados + 1;
        END LOOP;

        IF v_asientos_asignados <> v_pelicula.cantidad_entradas THEN
            RAISE EXCEPTION 'No hay suficientes butacas libres en la proyección % para la compra mock.', v_pelicula.proyeccion_id;
        END IF;
    END LOOP;

    FOR v_usuario IN 0..19 LOOP
        FOR v_indice_producto IN 0..1 LOOP
            v_compra_id := gen_random_uuid();
            v_solicitud := (
                substr(md5('cinemarkade-mock-candy:' || v_usuario || ':' || v_indice_producto), 1, 8) || '-' ||
                substr(md5('cinemarkade-mock-candy:' || v_usuario || ':' || v_indice_producto), 9, 4) || '-' ||
                substr(md5('cinemarkade-mock-candy:' || v_usuario || ':' || v_indice_producto), 13, 4) || '-' ||
                substr(md5('cinemarkade-mock-candy:' || v_usuario || ':' || v_indice_producto), 17, 4) || '-' ||
                substr(md5('cinemarkade-mock-candy:' || v_usuario || ':' || v_indice_producto), 21, 12)
            )::uuid;
            SELECT producto_id, nombre, precio INTO v_producto
            FROM _mock_productos
            WHERE indice = 0;
            v_precio := v_producto.precio * (2 + ((v_usuario + v_indice_producto) % 4));

            INSERT INTO public.compra (
                id, usuario_id, proyeccion_id, fecha_compra, estado, total,
                creditos_usados, codigo_qr, url_pdf, puntos_generados, solicitud_id
            ) VALUES (
                v_compra_id,
                (SELECT usuario_id FROM _mock_usuarios WHERE indice = v_usuario),
                null,
                v_hoy - ((v_usuario * 3 + v_indice_producto * 7) % 20) + time '17:00',
                'confirmada', v_precio, 0, v_compra_id::text, null, floor(v_precio)::bigint, v_solicitud
            );

            INSERT INTO public.detalle_compra (
                compra_id, producto_id, combo_id, tipo_item, nombre_item, cantidad,
                precio_unitario, medio_pago, puntos_usados, puntos_generados
            ) VALUES (
                v_compra_id, v_producto.producto_id, null, 'producto', v_producto.nombre,
                2 + ((v_usuario + v_indice_producto) % 4), v_producto.precio,
                'dinero', 0, floor(v_producto.precio * (2 + ((v_usuario + v_indice_producto) % 4)))
            );

            IF v_total_productos > 1 THEN
                SELECT producto_id, nombre, precio INTO v_producto
                FROM _mock_productos
                WHERE indice = 1 + ((v_usuario + v_indice_producto) % (v_total_productos - 1));
                INSERT INTO public.detalle_compra (
                    compra_id, producto_id, combo_id, tipo_item, nombre_item, cantidad,
                    precio_unitario, medio_pago, puntos_usados, puntos_generados
                ) VALUES (
                    v_compra_id, v_producto.producto_id, null, 'producto', v_producto.nombre,
                    1 + ((v_usuario + 2 * v_indice_producto) % 3), v_producto.precio,
                    'dinero', 0,
                    floor(v_producto.precio * (1 + ((v_usuario + 2 * v_indice_producto) % 3)))
                );
                UPDATE public.compra
                SET total = total + v_producto.precio * (1 + ((v_usuario + 2 * v_indice_producto) % 3)),
                    puntos_generados = floor(total + v_producto.precio * (1 + ((v_usuario + 2 * v_indice_producto) % 3)))::bigint
                WHERE id = v_compra_id;
            END IF;
            v_numero_compras := v_numero_compras + 1;
        END LOOP;
    END LOOP;

    INSERT INTO public.resena (usuario_id, pelicula_id, estrellas, comentario, fecha)
    SELECT u.usuario_id,
           p.pelicula_id,
           1 + ((u.indice + p.indice) % 5),
           (ARRAY[
               'La volvería a ver en pantalla grande.',
               'Muy buena experiencia, el sonido estuvo genial.',
               'Me gustó la historia y la sala.',
               'Buena película para compartir con amigos.',
               'La recomiendo para una salida al cine.'
           ])[1 + ((u.indice + p.indice) % 5)],
           (v_hoy - (u.indice % 30))::timestamp
    FROM _mock_usuarios u
    CROSS JOIN LATERAL (
        SELECT DISTINCT c.indice_pelicula
        FROM _mock_compras_entradas c
        WHERE c.indice_usuario = u.indice
        ORDER BY c.indice_pelicula
        LIMIT 2
    ) vistas
    JOIN _mock_peliculas p ON p.indice = vistas.indice_pelicula
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.resena existente
        WHERE existente.usuario_id = u.usuario_id
          AND existente.pelicula_id = p.pelicula_id
    );

    GET DIAGNOSTICS v_numero_resenas = ROW_COUNT;
    RAISE NOTICE 'Mock cargado: % cuentas reutilizadas, % compras y % reseñas nuevas.', 20, v_numero_compras, v_numero_resenas;
END;
$$;

COMMIT;
