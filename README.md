# NBA Hub 🏀

Aplicación web para seguimiento de ligas fantasy NBA y consulta de estadísticas históricas de jugadores.

Funciona directamente desde el navegador sin necesidad de servidor — basta con abrir `index.html`.

---

## Módulos

### 🏆 Liga Fantasy
Visualización de las estadísticas de tu liga fantasy de ESPN en tiempo real. Carga dos archivos CSV generados por el script `espn_stats.py` y muestra:

- Tabla de jugadores con puntos totales, promedio, partidos jugados y rankings por período (semana, 2 semanas, mes)
- Indicador de tendencia por jugador
- Indicador de si el jugador juega hoy y su estado de lesión
- Filtros por equipo NBA, equipo fantasy y posición
- Buscador
- Gráficos: top jugadores, por equipo fantasy, por equipo NBA, comparador de rankings

### 📈 Histórico NBA
Consulta del histórico de puntos fantasy de jugadores NBA en temporadas anteriores. Carga el archivo `nba_fantasy_historico.csv` generado por los scripts Python y muestra:

- Tabla con puntos totales, partidos jugados o promedio por temporada (selector de métrica)
- Buscador de jugadores
- Gráfico de líneas comparando la evolución de los jugadores seleccionados entre temporadas

---

## Estructura de archivos

```
nba-hub-app/
├── index.html              # Shell principal
├── styles.css              # Estilos globales (temas, colores, layout)
├── core.js                 # Lógica compartida (idioma, tema, navegación)
│
├── lang/
│   ├── es.js               # Español
│   ├── eu.js               # Euskera
│   └── en.js               # English
│
├── modules/
│   ├── liga/
│   │   ├── liga.html       # HTML del módulo liga
│   │   ├── liga.js         # Lógica del módulo liga
│   │   └── liga.css        # Estilos específicos
│   └── historico/
│       ├── historico.html  # HTML del módulo histórico
│       ├── historico.js    # Lógica del módulo histórico
│       └── historico.css   # Estilos específicos
│
└── assets/
    ├── fantasy-icons/      # Iconos de equipos fantasy (.svg)
    └── team-icons/         # Iconos de equipos NBA (.png)
```

---

## Scripts Python

### `espn_stats.py`
Descarga las estadísticas de tu liga fantasy de ESPN y genera tres CSVs:

| Archivo | Contenido |
|---|---|
| `JUGADOR ids YYYYMMDD HHMM.csv` | Jugadores con equipo fantasy, equipo NBA, posición y enlace ESPN |
| `JUGADOR stats YYYYMMDD HHMM.csv` | Puntos, rankings y estado de lesión de cada jugador |
| `ENTRENADOR stats YYYYMMDD HHMM.csv` | Puntos y rankings de cada equipo fantasy |

**Configuración** — edita estas variables al inicio del script:
```python
LEAGUE_ID = 101965        # ID de tu liga ESPN
ESPN_S2   = "..."         # Cookie espn_s2 de tu sesión
SWID      = "{...}"       # Cookie SWID de tu sesión
SEASON    = 2026          # Temporada actual
```

**Uso:**
```bash
pip install requests
python espn_stats.py
```

---

### `nba_resumen.py`
Descarga las estadísticas de todos los jugadores NBA de una temporada desde la API oficial y calcula sus puntos fantasy según el sistema de puntuación de tu liga.

Pregunta el año al arrancar (ej: `2025` para la temporada 2024-25) y genera:
- `nba_resumen_2024-25.csv` — puntos fantasy totales, partidos jugados y promedio por jugador

**Sistema de puntuación configurado:**

| Estadística | Puntos |
|---|---|
| Tiro encestado (FGM) | +3 |
| Intento de tiro (FGA) | -1 |
| Tiro libre (FTM) | +2 |
| Intento TL (FTA) | -1 |
| Triple (3PM) | +1.5 |
| Rebote ofensivo (OREB) | +1.5 |
| Rebote defensivo (DREB) | +1 |
| Asistencia (AST) | +1.75 |
| Robo (STL) | +2 |
| Tapón (BLK) | +2 |
| Pérdida (TO) | -1 |
| Punto anotado (PTS) | +0.4 |
| Falta personal (PF) | -0.5 |

**Uso:**
```bash
pip install basketball-reference-web-scraper pandas
python nba_resumen.py
```

---

### `nba_fusionar.py`
Combina todos los archivos `nba_resumen_XXXX-XX.csv` del directorio en un único CSV histórico.

Genera `nba_fantasy_historico.csv` con una fila por jugador y columnas `PTSTOT_XXXX`, `PJ_XXXX`, `PTSAVG_XXXX` por cada temporada detectada.

**Uso:**
```bash
python nba_fusionar.py
```

---

## Flujo de trabajo

### Liga Fantasy (uso semanal)
```
espn_stats.py  →  JUGADOR ids + JUGADOR stats  →  cargar en módulo Liga
```

### Histórico NBA (uso anual, al acabar cada temporada)
```
nba_resumen.py  →  nba_resumen_XXXX-XX.csv
nba_fusionar.py →  nba_fantasy_historico.csv  →  cargar en módulo Histórico
```

---

## Personalización

**Tema y colores** — selector en el header: modo claro/oscuro/auto y 5 esquemas de color.

**Idioma** — español, euskera e inglés. Selector en el header.

**Añadir un módulo nuevo** — crear carpeta `modules/nuevo/` con `nuevo.html`, `nuevo.js` y `nuevo.css`, añadir la pestaña en `index.html` y registrar el módulo en `core.js`.

---

## Tecnologías

- HTML / CSS / JavaScript puro — sin frameworks
- [Chart.js 3.7](https://www.chartjs.org/) — gráficos
- [basketball-reference-web-scraper](https://github.com/jaebradley/basketball_reference_web_scraper) — datos históricos NBA
- ESPN Fantasy API — datos de liga fantasy

---

*Hecho por Julián Hernández*
