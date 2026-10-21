# Checklist de requisitos funcionales

## 1. Crear cuenta

- [x] Crear cuenta.
- [x] Ver perfil.
- [x] Consultar los puntos asociados al usuario.
- [ ] Ver historial de canjes.
- [ ] Consultar “Mis películas”.
    - [ ] Mostrar películas vistas con su póster.
    - [ ] Mostrar la fecha en que se vio cada película.
    - [ ] Mostrar la calificación del usuario.

## 2. Entrar como anónimo

- [x] Permitir el acceso como anónimo.

## 3. Elegir películas desde la homepage

- [x] Permitir elegir películas desde la página principal.

## 4. Sacar entradas

- [x] Completar el circuito de compra de entradas.
    - [x] Seleccionar horarios.
    - [x] Seleccionar formato: 2D, 3D, 4D o 5D.
    - [x] Seleccionar idioma.
    - [x] Seleccionar butaca en tiempo real y mostrar las ocupadas.
    - [x] Generar un PDF con los datos de la entrada y del candy.
    - [x] Generar un QR para presentar al ingresar a la película.
    - [ ] Habilitar la preventa siete días antes del estreno de las películas de “Próximamente”.

## 5. Cancelar compra

- [x] Permitir cancelar una compra.

## 6. Sistema de reseñas

- [ ] Implementar el sistema de reseñas.
    - [ ] Calificar con estrellas.
    - [ ] Dejar un comentario corto.
    - [ ] Mostrar la puntuación promedio.

## 7. Buscador

- [x] Implementar el buscador.
    - [x] Filtrar por género.

## 8. Generador de cupones

- [x] Generar cupones.
    - [x] Elegir a quién entregar los cupones mediante un filtro de edad.

## 9. Compra candy online

- [x] Permitir comprar candy online.
    - [x] Mostrar los productos a la venta.
    - [x] Comprar candy al mismo tiempo que la entrada.

## 10. Reporte de ventas

- [ ] Implementar el reporte de ventas.
    - [ ] Mostrar la facturación por día.
    - [ ] Mostrar cuántas entradas se vendieron.

## 11. Sistema de puntos y canjes

- [x] Implementar el sistema de puntos y canjes.
    - [x] Disponible para usuarios registrados.
    - [x] Acumular un punto por cada $1 de compra.
    - [x] Mostrar los puntos acumulados en el perfil.
    - [ ] Mostrar el historial de canjes.

## 12. Sistema de notificaciones

- [ ] Implementar el sistema de notificaciones.
    - [ ] Permitir activar recordatorios para películas de “Próximamente”.

## 13. Clientes proponen películas

- [ ] Implementar propuestas de películas por parte de los clientes.
    - [ ] Permitir proponer películas que no estén en cartelera.
    - [ ] Permitir una propuesta a la vez por cliente.
    - [ ] Solicitar el título.
    - [ ] Solicitar la descripción.
    - [ ] Solicitar una explicación de por qué quieren esa película en el cine.
    - [ ] Permitir a la administración consultar las propuestas.
    - [ ] Permitir aceptar o rechazar propuestas.
    - [ ] Al aceptar, abrir la pantalla de creación de película con los datos enviados precargados.

## 14. Lista de espera para funciones agotadas

- [ ] Implementar la lista de espera.
    - [ ] Permitir que usuarios registrados se anoten cuando una función no tenga butacas disponibles.
    - [ ] Mostrar en el perfil las listas en las que está anotado el usuario.
    - [ ] Mostrar su posición en cada lista.
    - [ ] Mostrar al administrador cuántas personas esperan por función.
    - [ ] Detectar la liberación de butacas cuando se cancela una compra.
    - [ ] Avisar automáticamente mediante una notificación push al primero de la lista.
    - [ ] Darle 15 minutos para comprar antes de pasar la oportunidad al siguiente.
    - [ ] Pasar automáticamente al siguiente si vence el plazo sin compra.

## 15. Cancelación de funciones por parte del cine

- [ ] Implementar la cancelación completa de funciones desde la administración.
    - [ ] Convertir el monto total de cada compra afectada en crédito en la cuenta del usuario.
    - [ ] Incluir el importe del candy cuando corresponda.
    - [ ] Liberar las butacas.
    - [ ] Notificar a cada comprador afectado.
    - [ ] Ofrecer reubicación en otra función de la misma película usando el crédito recibido.
    - [ ] Ejecutar el proceso de forma atómica: acreditar a todos o a nadie, sin estados parciales.

## Reglas complementarias del enunciado

Estas condiciones acompañan a los requisitos numerados y a la definición de roles.

### Salas y programación

- [x] Disponer de varias salas.
- [x] Respetar la distribución indicada: 20 filas con letras y bloques de 4, 20 y 4 butacas, según el plano.
- [x] Verificar las letras de las filas según el enunciado, que indica quitar J y K.
- [x] Disponer de los bloques de 2, 10 y 2 lugares para personas con discapacidad.
- [x] Identificar las tres últimas filas VIP (R, S y T) con otro color y precio superior.
- [x] Respetar 30 minutos entre el final de una proyección y el inicio de la siguiente en la misma sala.
- [x] Asignar salas automáticamente.
- [x] Impedir funciones simultáneas en la misma sala.

### Películas y compras

- [ ] Mostrar la cartelera de “Próximamente”.
- [ ] Permitir consultar reseñas antes de comprar.
- [ ] Mostrar primero las tres películas más vendidas y los combos destacados en la homepage.
- [x] Impedir la compra a usuarios que no cumplen la edad mínima.
- [x] Mostrar el aviso de acompañamiento de un adulto para películas +18 indicado en el enunciado.
- [x] Seleccionar fechas y horarios sin calendarios.
- [ ] Aplicar un precio especial de preventa.
- [x] Permitir cancelar compras hasta dos horas antes de la función.
- [x] Reintegrar el dinero de las cancelaciones en forma de créditos.

### Beneficios

- [ ] Entregar un cupón de bienvenida de 20% por defecto para la primera compra.
- [ ] Permitir al dueño configurar el porcentaje de bienvenida.
- [x] Canjear puntos por entradas gratis.
- [x] Canjear puntos por productos de candy.

### Administración y permisos

- [x] Administrar salas.
- [x] Administrar funciones.
- [x] Administrar productos.
- [x] Gestionar la distribución de butacas.
- [x] Configurar recompensas por puntos.
- [x] Crear combos que incluyan entradas y candy.
- [ ] Exportar reportes de facturación a PDF.
- [ ] Exportar reportes de facturación a Excel.
- [ ] Mostrar gráficos de películas más vistas por semana y por mes.
- [ ] Mostrar el producto de candy más vendido.
- [ ] Registrar la actividad de todas las operaciones con fecha y hora.
- [ ] Crear roles configurables con acceso a determinadas secciones de administración.
- [ ] Asignar esos roles a usuarios elegidos.

### Empleado, cliente y anónimo

- [x] Permitir al empleado escanear los QR de entradas y candy.
- [x] Permitir al cliente iniciar sesión.
- [ ] Permitir al cliente editar su perfil.
- [x] Permitir al anónimo consultar homepage, cartelera, “Próximamente”, detalles, reseñas y promedio.
- [x] Permitir al anónimo usar el buscador y filtro por género.
- [x] Permitir al anónimo comprar entradas y candy sin acumular puntos ni acceder a cupones o beneficios.
