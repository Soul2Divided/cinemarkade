# Objetivos destacados
1. El estilo visual de la aplicación debe ser único y producido.
2. Defender oralmente tus decisiones el día de la entrega.
3. Se tendrá en cuenta el uso correcto de Angular, las buenas prácticas y las técnicas vistas en clase.
4. Se tendrá en cuenta la integración con Supabase.
5. Se tendrá en cuenta la integración de PWA.
6. Se tendrá en cuenta la lógica de negocio lograda.

---

# Tener en cuenta

### Formato de la sala:
* Son varias salas
* 20 filas numeradas con letra y 3 columnas con 4, 20 y 4 butacas (ver imagen)
  * Se quitaron la J y la K
  * 2, 10 y 2 deben estar marcadas para gente con discapacidad
  * Butacas VIP en las 3 últimas filas (R, S, T), distinguidas con otro color y precio más alto
* No puede haber funciones antes de que pase media hora de que terminó la función anterior en esa sala
* Cartelera de “Próximamente”
* Asignación de salas automática
* Bajo ningún término dos funciones pueden ser a la misma hora en la misma sala

### Beneficios:
* El beneficio que tienen por registrarse es un cupón de 20% de descuento en la primera compra (predeterminado).
* El dueño puede elegir cuánto descuento dar de bienvenida
* Los puntos deben poder canjear por entradas gratis o por productos del candy bar

### Entradas y películas:
* Ver reseñas antes de sacar la entrada
* En la página principal se muestran primero las 3 películas más vendidas y los combos destacados
* Usuarios que no cumplen con la edad mínima, no pueden sacar entrada
* Si es +18, informar que debe ir un adulto
* NO usar calendarios para seleccionar fechas y horarios
* Preventa con precio especial
* Las compras se pueden cancelar hasta 2 horas antes
* Cancelar devuelve el dinero en forma de créditos

---

# Requisitos funcionales

1. **Crear cuenta**
   1. Ver perfil
   2. Puntos asociados
   3. Historial de canjes
   4. “Mis películas”:
      1. Películas vistas con su póster y fecha de visto, calificación del usuario
2. **Entrar como anónimo**
3. **Poder elegir películas desde la homepage**
4. **Sacar entradas**
   1. Seleccionar horarios
   2. Seleccionar formato (2d, 3d, 4d o 5d)
   3. Seleccionar idiomas
   4. Seleccionar butaca en tiempo real (mostrar ocupadas)
   5. Generar PDF con los datos de la entrada y del candy
   6. Generar QR a presentar para ver película
   7. Preventa 7 días antes del estreno de “Próximamente”
5. **Cancelar compra**
6. **Sistema de reseñas**
   1. Calificar con estrellas
   2. Dejar un comentario corto
   3. Puntuación promedio
7. **Buscador**
   1. Filtro por género
8. **Generador de cupones**
   1. Elegir con filtro de edad a quien darle los cupones
9. **Compra candy online**
   1. Productos a la venta
   2. Comprar al mismo tiempo que la entrada
10. **Reporte de ventas**
    1. Facturación por día
    2. Cuántas entradas se vendieron
11. **Sistema de puntos/canjes**
    1. Usuarios registrados
    2. $1 == 1 punto
    3. Puntos acumulados en el perfil
    4. Historial de canjes
12. **Sistema de notificaciones**
    1. Poner recordatorio a las películas de “Próximamente”

---

# Formatos (Tablas en Supabase)

### Usuario
* **id**: uuid (PK)
* **nombre**: varchar
* **apellido**: varchar
* **mail**: varchar (UNIQUE)
* **fecha_nacimiento**: date
* **tipo_sangre**: varchar
* **color_ojos**: varchar
* **cantidad_dias_vacaciones**: integer
* **puntos**: integer
* **rol**: enum
* **created_at**: timestamp

### Película
* **id**: bigint (PK, autogenerado)
* **nombre**: varchar *
* **genero**: varchar *
* **duracion**: integer *
* **imagen**: text *
* **sinopsis**: text *
* **restriccion_edad**: varchar *
* **banner**: text
* **created_at**: timestamp (por defecto fecha actual)
* **activa**: boolean (por defecto true)

### Sala
* **id**: integer (PK, autogenerado)
* **activa**: boolean (por defecto true)
* **formato**: enum (por defecto 2D)

### Butaca
* **id**: bigint (PK, autogenerado)
* **sala_id**: integer (FK → sala.id)
* **fila**: varchar
* **columna**: integer
* **tipo**: enum (normal, VIP o discapacidad)

### Función
* **id**: bigint (PK, autogenerado)
* **pelicula_id**: bigint (FK → pelicula.id)
* **sala_id**: integer (FK → sala.id)
* **fecha**: date
* **formato**: varchar
* **idioma**: varchar
* **es_preventa**: boolean
* **created_at**: timestamp
* **activa**: boolean (por defecto true)

### Proyección
* **id**: bigint (PK, autogenerado)
* **funcion_id**: bigint (FK → funcion.id)
* **horario**: varchar
* **idioma**: varchar
* **activa**: boolean
* **created_at**: timestamp con zona horaria (por defecto fecha actual)

### Butaca de proyección
* **id**: bigint (PK, autogenerado)
* **proyeccion_id**: bigint (FK → proyeccion.id)
* **butaca_id**: bigint (FK → butaca.id)
* **estado**: enum (libre, reservada u ocupada)

### Producto
* **id**: bigint (PK, autogenerado)
* **nombre**: varchar *
* **categoria**: varchar
* **descripcion**: text
* **precio**: numeric
* **created_at**: timestamp
* **imagen**: text *
* **activa**: boolean (por defecto true)

### Combo
* **id**: bigint (PK, autogenerado)
* **nombre**: varchar * (no puede estar vacío)
* **descripcion**: text
* **precio**: numeric * (debe ser mayor o igual a cero)
* **activo**: boolean (por defecto true)
* **fecha_inicio**: timestamp con zona horaria
* **fecha_fin**: timestamp con zona horaria
* **created_at**: timestamp con zona horaria (por defecto fecha actual)
* **imagen**: text
* **destacado**: boolean

### Producto incluido en un combo
* **id**: bigint (PK, autogenerado)
* **combo_id**: bigint (FK → combo.id)
* **producto_id**: bigint (FK → producto.id)
* **cantidad**: integer * (debe ser mayor a cero)

### Compra
* **id**: uuid (PK, por defecto UUID generado)
* **usuario_id**: uuid (FK → usuario.id; puede ser nulo para compras anónimas)
* **proyeccion_id**: bigint (FK → proyeccion.id) *
* **fecha_compra**: timestamp (por defecto fecha actual)
* **estado**: enum
* **total**: numeric (por defecto cero) *
* **creditos_usados**: integer
* **codigo_qr**: text
* **url_pdf**: text
* **puntos_generados**: bigint (por defecto cero) *

### Butaca comprada
* **id**: bigint (PK, autogenerado)
* **compra_id**: uuid (FK → compra.id)
* **butaca_proyeccion_id**: bigint (FK → butaca_proyeccion.id)
* **medio_pago**: enum *
* **precio_unitario**: numeric
* **puntos_usados**: numeric

### Detalle de compra
* **id**: bigint (PK, autogenerado)
* **compra_id**: uuid (FK → compra.id)
* **producto_id**: bigint (FK → producto.id)
* **cantidad**: integer
* **combo_id**: bigint (FK → combo.id)
* **tipo_item**: enum *
* **nombre_item**: varchar
* **precio_unitario**: numeric
* **puntos_generados**: numeric
* **medio_pago**: enum *
* **puntos_usados**: numeric

### Reseña
* **id**: bigint (PK, autogenerado)
* **usuario_id**: uuid (FK → usuario.id)
* **pelicula_id**: bigint (FK → pelicula.id)
* **estrellas**: integer
* **comentario**: text
* **fecha**: timestamp

### Cupón
* **id**: bigint (PK, autogenerado)
* **codigo**: varchar (UNIQUE)
* **porcentaje_descuento**: numeric
* **edad_minima**: integer
* **fecha_inicio**: timestamp
* **fecha_fin**: timestamp
* **activa**: boolean (por defecto true)

### Cupón asignado a usuario
* **id**: bigint (PK, autogenerado)
* **usuario_id**: uuid (FK → usuario.id)
* **cupon_id**: bigint (FK → cupon.id)
* **usado**: boolean
* **fecha_uso**: timestamp

### Canje
* **id**: bigint (PK, autogenerado)
* **usuario_id**: uuid (FK → usuario.id)
* **tipo**: enum
* **producto_id**: bigint (FK → producto.id)
* **puntos_utilizados**: integer
* **fecha**: timestamp

### Notificación
* **id**: bigint (PK, autogenerado)
* **usuario_id**: uuid (FK → usuario.id)
* **funcion_id**: bigint (FK → funcion.id)
* **mensaje**: text
* **fecha_envio**: timestamp
* **leida**: boolean

### Registro de actividad
* **id**: bigint (PK, autogenerado)
* **usuario_id**: uuid (FK → usuario.id)
* **accion**: varchar
* **detalle**: text
* **fecha_hora**: timestamp

### Tarifa por formato
* **id**: bigint (PK, autogenerado)
* **formato**: enum (UNIQUE)
* **precio_base**: numeric
* **created_at**: timestamp con zona horaria (por defecto fecha actual)

---

# Roles

* **Admin**
  * ABM de salas
  * ABM de funciones
  * ABM productos
  * Distribución de las butacas
  * Configurar recompensas por puntos
  * Crear combos entradas + candy
  * Exportar reporte de facturación a PDF y Excel
  * Gráficos de películas más vistas por semana y por mes
  * Ver cuál es el producto del candy que más se vende
  * Log de actividad para TODO (fecha y hora)
* **Empleado**
  * Escanea QRs de entrada + candy
* **Cliente**
  * Crear cuenta / iniciar sesión
  * Ver y editar su perfil
  * Ver puntos acumulados y canjearlos (entradas gratis o productos de candy bar)
  * Ver historial de canjes
  * Ver "mis películas" (vistas, póster, fecha, calificación propia)
  * Elegir películas desde la homepage / usar el buscador (filtro por género)
  * Ver reseñas y dejar reseña (estrellas + comentario corto)
  * Sacar entradas: horario, formato, idioma, butaca en tiempo real, candy bar
  * Generar PDF y QR de la entrada
  * Cancelar compra (hasta 2h antes, devolución en créditos)
  * Recibir cupón de bienvenida (20% por defecto)
  * Recibir notificaciones / recordatorios de "próximamente"
* **Anónimo (sin cuenta)**
  * Ver homepage, cartelera y "próximamente"
  * Ver detalle de película, reseñas y calificación promedio
  * Usar el buscador (filtro por género)
  * Sacar entradas y comprar candy bar, **sin** acumular puntos ni acceder a cupones/beneficios

---

# Requisitos no funcionales
* Las interfaces deben ser fáciles de navegar y de entender tanto para los clientes como los empleados.