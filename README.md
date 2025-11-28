# README -- Fantasy NBA Dashboard "GO LAKERS!!!!"

Este proyecto es una aplicación web interactiva diseñada para
visualizar, analizar y gestionar estadísticas de jugadores en una liga
**Fantasy NBA**. Permite cargar archivos CSV personalizados, filtrar
jugadores, ordenar estadísticas y visualizar puntos diarios o semanales
mediante gráficos dinámicos.

## Características principales

-   Carga de datos mediante CSV.
-   Filtros avanzados por posición y equipo fantasy.
-   Ordenación interactiva de columnas.
-   Visualización gráfica mediante Chart.js.
-   Descarga de gráfico en PNG.
-   Descarga de datos CSV generados.
-   Persistencia de estado mediante LocalStorage.

## Formato CSV esperado

Separado por punto y coma `;`:

    EquipoFantasy;Nombre;EquipoNBA;Posición;Día1;Día2;...
    EquipoFantasy;Nombre;EquipoNBA;Posición;Etiqueta1;Etiqueta2;...
    Lakers;LeBron James;LAL;SF/PF;45;38;41;...

## Cómo usar la aplicación

1.  Abrir `index.html` en un navegador.
2.  Cargar CSV desde el botón correspondiente.
3.  Usar filtros y controles para explorar datos.
4.  Cambiar entre gráfico diario/semanal.
5.  Descargar CSV o imagen del gráfico.

## Tecnologías utilizadas

-   HTML5, CSS3, JavaScript Vanilla
-   Chart.js (CDN)
-   FileReader API
-   LocalStorage

## Autor

Julián Hernández
