# NBA Hub 🏀

Aplicación web para seguimiento de ligas fantasy NBA y consulta de estadísticas históricas de jugadores.

Funciona directamente desde el navegador sin necesidad de servidor — basta con abrir `index.html` con doble clic.

🌐 **Demo:** [jhernand-alt.github.io/nba-hub-app](https://jhernand-alt.github.io/nba-hub-app/)

---

## Módulos

### 🏆 Liga Fantasy
Visualización de las estadísticas de tu liga fantasy ESPN en tiempo real. Carga dos CSVs generados por `espn_stats.py`:

- Tabla de jugadores con puntos totales, promedio, partidos jugados y rankings por período (semana, 2 semanas, mes, total)
- Indicador de tendencia por jugador (↑↑ ↑ -- ↓ ↓↓)
- Indicador de partido hoy y estado de lesión (OUT / DTD / Q)
- Filtros por equipo NBA, equipo fantasy y posición
- Buscador de texto
- Gráficos: top jugadores, por equipo fantasy, por equipo NBA, comparador de rankings

### 📈 Histórico NBA
Consulta del histórico de puntos fantasy de todos los jugadores NBA en temporadas anteriores. Carga `nba_fantasy_historico.csv` generado por los scripts Python:

- Selector de métrica: Puntos Totales / Partidos Jugados / Promedio
- Selector "Desde": filtra las temporadas visibles en la tabla
- Buscador de jugadores
- Gráfico de líneas comparando la evolución de los jugadores seleccionados

---

## Estructura de archivos

```
nba-hub-app/
├── index.html               # Shell principal — header + nav + módulos embebidos
├── styles.css               # Estilos globales (temas, colores, layout)
├── styles-nba.css           # Estilo alternativo inspirado en NBA.com (oscuro)
├── styles-espn.css          # Estilo alternativo inspirado en ESPN (claro y denso)
├── core.js                  # Lógica compartida (idioma, tema, navegación)
│
├── lang/
│   ├── es.js                # Español
│   ├── eu.js                # Euskera
│   └── en.js                # English
│
├── modules/
│   ├── liga/
│   │   ├── liga.html        # (fragmento — embebido en index.html)
│   │   ├── liga.js          # Lógica del módulo liga
│   │   └── liga.css         # Estilos específicos
│   └── historico/
│       ├── historico.html   # (fragmento — embebido en index.html)
│       ├── historico.js     # Lógica del módulo histórico
│       └── historico.css    # Estilos específicos
│
└── assets/
    ├── fantasy-icons/       # Iconos de equipos fantasy (.svg)
    └── team-icons/          # Iconos de equipos NBA (.png)
```

> **Nota sobre estilos alternativos:** para usar `styles-clasico.css` o `styles-espn.css`, renombrarlo a `styles.css` y añadir la fuente correspondiente en el `<head>` de `index.html` (ver comentario al inicio de cada fichero CSS).

---

## Scripts Python

### `espn_stats.py`
Descarga los datos de tu liga fantasy ESPN y genera tres CSVs con timestamp:

| Archivo | Contenido |
|---|---|
| `JUGADOR ids YYYYMMDD HHMM.csv` | Jugadores con equipo fantasy, equipo NBA, posición y enlace ESPN |
| `JUGADOR stats YYYYMMDD HHMM.csv` | Puntos, rankings y estado de lesión de cada jugador |
| `ENTRENADOR stats YYYYMMDD HHMM.csv` | Puntos y rankings de cada equipo fantasy |

**Configuración** — editar estas variables al inicio del script:

```python
LEAGUE_ID = 101965        # ID de tu liga (visible en la URL de ESPN)
ESPN_S2   = "..."         # Cookie espn_s2 (ver más abajo cómo obtenerla)
SWID      = "{...}"       # Cookie SWID
SEASON    = 2026          # Año en que ACABA la temporada (2025-26 → 2026)
```

**Cómo obtener ESPN_S2 y SWID:**
1. Ve a [ESPN Fantasy Basketball](https://www.espn.com/fantasy/basketball/) e inicia sesión
2. Abre las herramientas de desarrollador del navegador (F12)
3. Pestaña **Application** → **Cookies** → `www.espn.com`
4. Copia los valores de `espn_s2` y `SWID`

**Uso:**
```bash
pip install requests
python espn_stats.py
```

---

### `nba_resumen.py`
Descarga las estadísticas de todos los jugadores NBA de una temporada desde la API oficial (NBA.com) y calcula sus puntos fantasy.

Pregunta el año al arrancar (ej: `2025` para la temporada 2024-25) y genera `nba_resumen_2024-25.csv`.

**Sistema de puntuación configurado:**

| Estadística | Puntos |
|---|---|
| Tiro encestado (FGM) | +3 |
| Intento de tiro (FGA) | −1 |
| Tiro libre (FTM) | +2 |
| Intento TL (FTA) | −1 |
| Triple (3PM) | +1.5 |
| Rebote ofensivo (OREB) | +1.5 |
| Rebote defensivo (DREB) | +1 |
| Asistencia (AST) | +1.75 |
| Robo (STL) | +2 |
| Tapón (BLK) | +2 |
| Pérdida (TO) | −1 |
| Punto anotado (PTS) | +0.4 |
| Falta personal (PF) | −0.5 |

**Uso:**
```bash
pip install nba_api pandas
python nba_resumen.py
```

---

### `nba_fusionar.py`
Combina todos los `nba_resumen_XXXX-XX.csv` del directorio en un único CSV histórico.

Genera `nba_fantasy_historico.csv` con una fila por jugador y columnas `PTSTOT_XXXX`, `PJ_XXXX`, `PTSAVG_XXXX` por cada temporada detectada. Los jugadores sin datos en alguna temporada (retirados, lesionados, rookies) quedan con valor 0.

**Uso:**
```bash
python nba_fusionar.py
```

---

## Flujo de trabajo

### Liga Fantasy (uso semanal o diario)
```
espn_stats.py  →  JUGADOR ids + JUGADOR stats  →  cargar en módulo Liga
```

### Histórico NBA (uso anual, al acabar cada temporada)
```
nba_resumen.py  →  nba_resumen_XXXX-XX.csv
                        ↓  (repetir para cada temporada)
nba_fusionar.py →  nba_fantasy_historico.csv  →  cargar en módulo Histórico
```

---

## Personalización

### Tema y colores
Selector en el header: modo claro / oscuro / auto y 5 esquemas de color (azul, verde, púrpura, naranja, rojo). La preferencia se guarda en el navegador.

### Estilos alternativos
El repositorio incluye dos hojas de estilo adicionales:
- `styles-nba.css` — oscuro y premium, inspirado en NBA.com. Fuente recomendada: **Barlow Condensed + Inter**
- `styles-espn.css` — claro y denso, inspirado en ESPN. Fuente recomendada: **Roboto Condensed + Roboto**

Para activar uno: renombrarlo a `styles.css` y añadir el enlace a Google Fonts en el `<head>` de `index.html` (ver comentario al inicio de cada fichero).

### Idioma
Español, euskera e inglés. Las claves de traducción están en `lang/es.js`, `lang/eu.js` y `lang/en.js`.

### Añadir un módulo nuevo
1. Crear carpeta `modules/nuevo/` con `nuevo.html`, `nuevo.js` y `nuevo.css`
2. Añadir `<link rel="stylesheet" href="modules/nuevo/nuevo.css">` en el `<head>` de `index.html`
3. Añadir el `<div id="module-nuevo" class="module-container" style="display:none;">` con el HTML embebido
4. Añadir el botón de pestaña en el nav: `<button class="module-tab" onclick="switchModule('nuevo')">Nuevo</button>`
5. Añadir `<script src="modules/nuevo/nuevo.js"></script>` al final del `<body>`
6. En `nuevo.js`, exponer `window.Nuevo = (() => { ... })()` con una función `init()`

---

## Notas técnicas

- **Sin servidor:** toda la carga de datos usa `<input type="file">`. No hay `fetch()` de ficheros locales, por lo que funciona con `file://` (doble clic).
- **Jugadores traspasados:** `nba_resumen.py` conserva solo la fila `TOT` de la API para jugadores que cambiaron de equipo, evitando duplicar estadísticas.
- **Nombres con caracteres especiales:** la API de NBA.com usa caracteres Unicode (Jokić, Dončić...). Si tu CSV de ids usa nombres sin acentos, el módulo histórico los mostrará tal como aparecen en el CSV de resumen. Se recomienda unificar la escritura.
- **Formato CSV:** separador `;`, decimales con coma, encoding UTF-8 con BOM (`utf-8-sig`).

---

## Tecnologías

- HTML / CSS / JavaScript puro — sin frameworks ni dependencias de build
- [Chart.js 3.7](https://www.chartjs.org/) — gráficos (cargado desde CDN)
- [nba_api](https://github.com/swar/nba_api) — datos históricos NBA
- ESPN Fantasy API — datos de liga fantasy

---

*Hecho por Julián Hernández*
