# Liga Fantasy NBA "GO LAKERS!!!" 🏀 — v1.1.0

Aplicación web para analizar y visualizar el rendimiento de jugadores NBA en tu liga fantasy. Permite cargar dos archivos CSV con datos de jugadores y estadísticas semanales para obtener análisis detallados, gráficos comparativos y ratings de rendimiento.

---

## 🚀 Cómo usar

1. Abre `index.html` en tu navegador (no necesita servidor).
2. Carga los dos archivos CSV mediante los botones de la parte superior.
3. Explora la tabla, aplica filtros y analiza el gráfico.

---

## 📁 Formato de los archivos CSV

### `jugadores.csv`
| Columna | Descripción |
|---|---|
| ID_NBA | Código identificador único del jugador |
| Nombre | Nombre completo del jugador |
| Código-Equipo Fantasy | Abreviatura de tu equipo fantasy |
| Código-Equipo NBA | Abreviatura del equipo NBA real |
| Posición | PG, SG, SF, PF, C, G o F |
| Enlace ESPN | URL del perfil ESPN (opcional) |

**Ejemplo:**
```
ID_NBA;Nombre;Equipo_Fantasy;Equipo_NBA;Posicion;Enlace_Web_ESPN
LAL01;LeBron James;GLAL;LAL;SF;https://www.espn.com/nba/player/_/id/...
```

### `stats_semanales.csv`
| Columna | Descripción |
|---|---|
| ID_NBA | Código del jugador (debe coincidir con jugadores.csv) |
| Semana | Número de semana (entero, empieza en 1) |
| Puntos_Fantasy | Puntos obtenidos esa semana (puede estar vacío para semanas futuras) |

**Ejemplo:**
```
ID_NBA;Semana;Puntos_Fantasy
LAL01;1;45,5
LAL01;2;38,0
LAL01;3;
```

> **Importante:** Guarda los archivos como **CSV UTF-8** para que los caracteres especiales (ñ, á, etc.) se muestren correctamente. El separador de columnas es `;` y el decimal es `,`.

---

## 🎯 Cálculo del Rating (0–100)

El rating combina dos factores ponderados:

| Factor | Peso | Descripción |
|---|---|---|
| **Volumen** | 60% | Puntos totales acumulados durante la temporada |
| **Regularidad** | 40% | Consistencia semana a semana (menor variación = mejor rating) |

Puedes modificar estos porcentajes editando las variables `RATING_WEIGHTS` al inicio de `app.js`:

```js
const RATING_WEIGHTS = {
    volume:     0.60,   // 60% — puntos totales
    regularity: 0.40,   // 40% — consistencia
    activity:   0.00    // sin uso actualmente
};
// IMPORTANTE: Los valores deben sumar 1.0
```

---

## 📈 Indicadores de tendencia

| Indicador | Significado |
|---|---|
| ↑ **Subiendo** | Las últimas 4 semanas superan en más de un 5% las 4 anteriores |
| ↓ **Bajando** | Las últimas 4 semanas son más de un 5% peores que las 4 anteriores |
| − **Estable** | Rendimiento consistente sin cambios significativos |

---

## 🔧 Filtros disponibles

- **Equipos Fantasy** — filtra jugadores por su equipo en la liga.
- **Equipos NBA** — filtra por el equipo real de la NBA.
- **Posiciones** — PG · SG · SF · PF · C · G · F (o todos).
- **Ordenación** — haz clic en cualquier columna marcada con ⇅.

---

## 📊 Control del gráfico

El selector **"Mostrar: Top N"** controla cuántos jugadores aparecen en el gráfico:

| Opción | Descripción |
|---|---|
| Top 5 | 5 jugadores con más puntos totales (de los filtrados) |
| Top 10 | 10 jugadores con más puntos totales |
| Top 20 | 20 jugadores (opción por defecto) |
| Todos | Todos los jugadores visibles según los filtros activos |

> Si tras filtrar hay menos jugadores que el límite, se muestran todos los disponibles. Por ejemplo, si filtras un equipo con 8 jugadores y tienes "Top 20" seleccionado, verás los 8.

---

## 🌐 Idiomas y temas

La aplicación soporta **3 idiomas** (ES · EU · EN) y permite cambiar entre ellos en cualquier momento desde el selector de banderas del encabezado. La preferencia se guarda automáticamente.

El selector de tema 🎨 permite elegir entre modo claro, oscuro o automático (sigue la preferencia del sistema), así como 5 esquemas de color: azul, verde, púrpura, naranja y rojo. Las preferencias persisten entre sesiones.

---

## 🗂️ Estructura de archivos

```
nba-fantasy-app/
├── index.html          # Interfaz principal
├── app.js              # Lógica de la aplicación
├── styles.css          # Estilos (tema, colores, layout)
├── README.md           # Este archivo
├── lang/
│   ├── es.js           # Traducciones español
│   ├── eu.js           # Traducciones euskera
│   └── en.js           # Traducciones inglés
└── assets/
    ├── team-icons/     # Logos de equipos NBA (.png)
    └── fantasy-icons/  # Logos de equipos fantasy (.svg)
```

---

*Hecho por Julián Hernández.*

---

## 📋 Historial de versiones

### v1.1.0
- Selector de idioma integrado (ES · EU · EN) con banderas SVG
- Selector de tema mejorado con soporte para modo claro/oscuro/automático y 5 esquemas de color
- Traducción completa: filtros de equipo, encabezados de tabla y pie de página
- Pie de página con versión visible y "Datos no cargados" traducido al idioma activo
- Sección informativa eliminada de la pantalla y movida a este README

### v1.0.0
- Versión inicial con carga de CSV, tabla de jugadores, gráfico y selector de tema
