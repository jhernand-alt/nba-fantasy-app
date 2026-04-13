# Liga Fantasy NBA — GO LAKERS!!!

Web estática para visualizar estadísticas de una liga fantasy de baloncesto NBA en ESPN.
Muestra datos de jugadores y equipos fantasy con tabla ordenable, filtros y gráficos.

---

## Estructura del proyecto

```
nba-fantasy-app/
│
├── index.html              # Página principal
├── app.js                  # Lógica de la aplicación
├── styles.css              # Estilos (no modificar)
│
├── lang/
│   ├── es.js               # Textos en español
│   ├── eu.js               # Textos en euskera
│   └── en.js               # Textos en inglés
│
├── assets/
│   ├── team-icons/         # Iconos de equipos NBA (.png)
│   └── fantasy-icons/      # Iconos de equipos fantasy (.svg)
│
├── csv/                    # CSVs de datos (ver sección siguiente)
│   ├── JUGADOR ids.csv          ← estático, editar manualmente
│   ├── ENTRENADOR ids.csv       ← estático, editar manualmente
│   ├── JUGADOR ids FECHA HORA.csv       ← generado por el script
│   ├── JUGADOR stats FECHA HORA.csv     ← generado por el script
│   └── ENTRENADOR stats FECHA HORA.csv  ← generado por el script
│
└── espn_stats.py           # Script Python para descargar datos de ESPN
```

---

## Archivos CSV

### Archivos estáticos (mantener manualmente)

**`JUGADOR ids.csv`**
Lista de todos los jugadores NBA a seguir. La columna `Equipo_Fantasy` se deja vacía —
el script la rellena automáticamente.

```
ID;Nombre;Equipo_Fantasy;Equipo_NBA;Posicion;Enlace_Web_ESPN
4066457;Austin Reaves;;LAL - LA Lakers;SG/PG/SF;https://www.espn.com/...
```

**`ENTRENADOR ids.csv`**
Lista de entrenadores/managers de la liga fantasy. Las columnas `Equipo_NBA` y `Posicion`
se dejan vacías. Solo hay que editarlo si cambia un manager.

```
ID;Nombre;Equipo_Fantasy;Equipo_NBA;Posicion;Enlace_Web_ESPN
101965-18;Ibon Muñoz;5ATQ - 5 EN ATAQUE;;;https://fantasy.espn.com/...
```

El ID tiene el formato `LEAGUE_ID-TEAM_ID` (ej. `101965-18`).

Los nombres de equipo usan el formato `ABBR - Nombre completo` (ej. `5ATQ - 5 EN ATAQUE`).
El código ABBR se usa para buscar el icono en `assets/fantasy-icons/`.

### Archivos generados por el script

**`JUGADOR ids FECHA HORA.csv`**
Igual que `JUGADOR ids.csv` pero con la columna `Equipo_Fantasy` rellenada desde ESPN.
Este es el archivo que se carga en la web para ver jugadores.

**`JUGADOR stats FECHA HORA.csv`**
Estadísticas de cada jugador. 13 columnas:

```
ID;Equipo_Fantasy;Pts_Total;Pts_Avg;Partidos;
Rank_Pos;Rank_Total;
Pts_Semana;Rank_Semana;Pts_2Semanas;Rank_2Semanas;Pts_Mes;Rank_Mes
```

- `Pts_Total` / `Pts_Avg` / `Partidos` → temporada completa
- `Rank_Pos` → ranking dentro de la posición del jugador (ESPN global)
- `Rank_Total` → ranking global entre todos los jugadores (ESPN global)
- `Pts_Semana` / `Rank_Semana` → enfrentamiento actual
- `Pts_2Semanas` / `Rank_2Semanas` → últimas ~2 semanas
- `Pts_Mes` / `Rank_Mes` → último mes (~30 días)

Los rankings los calcula ESPN con su propio algoritmo (pondera consistencia,
proyección, valor por posición, etc.). Un jugador con más puntos puede tener
peor ranking que otro si ESPN lo valora diferente.

**`ENTRENADOR stats FECHA HORA.csv`**
Estadísticas de cada equipo fantasy. 9 columnas (sin rankings por período):

```
ID;Equipo_Fantasy;Pts_Total;Pts_Avg;Partidos;Rank_Total;Pts_Semana;Pts_2Semanas;Pts_Mes
```

- `Partidos` → enfrentamientos jugados (liga regular + playoffs)
- `Pts_Total` → suma de puntos de todos los enfrentamientos (incluyendo playoffs)
- `Pts_Avg` → `Pts_Total / Partidos`
- `Rank_Total` → posición en la clasificación de liga regular (`playoffSeed` de ESPN)
- `Pts_Semana` → puntos del enfrentamiento actual
- `Pts_2Semanas` → suma de los 2 últimos enfrentamientos
- `Pts_Mes` → suma de los 4 últimos enfrentamientos

---

## Script Python

### Requisitos

```bash
pip install requests
```

### Configuración

Editar las constantes al inicio de `espn_stats.py`:

```python
LEAGUE_ID      = 101965          # ID de tu liga ESPN
ESPN_S2        = "..."           # Cookie espn_s2 (ver más abajo)
SWID           = "{...}"         # Cookie SWID (ver más abajo)
SEASON         = 2026            # Temporada actual
JUGADOR_IDS    = "JUGADOR ids.csv"
ENTRENADOR_IDS = "ENTRENADOR ids.csv"
CARPETA_SALIDA = ""              # Dejar vacío para guardar junto al script
                                 # O poner ruta completa: r"C:\Users\...\csv"
```

### Obtener las cookies de ESPN

1. Abrir [fantasy.espn.com](https://fantasy.espn.com) con sesión iniciada
2. Abrir DevTools → Application → Cookies → `fantasy.espn.com`
3. Copiar los valores de `espn_s2` y `SWID`

Las cookies caducan periódicamente — si el script devuelve error 401, hay que renovarlas.

### Uso

```bash
python espn_stats.py
```

Genera tres archivos en `CARPETA_SALIDA` (o junto al script si está vacío):

```
JUGADOR ids   20260409 1430.csv
JUGADOR stats 20260409 1430.csv
ENTRENADOR stats 20260409 1430.csv
```

Copiar los tres a la carpeta `csv/` de la web.

---

## Web

La web es completamente estática — no necesita servidor, se abre directamente con el navegador
(o se puede servir con cualquier servidor HTTP simple).

### Cargar datos

1. Pulsar **"Identificadores CSV"** y seleccionar:
   - `JUGADOR ids FECHA HORA.csv` para ver jugadores
   - `ENTRENADOR ids.csv` para ver equipos fantasy
2. Pulsar **"Estadísticas CSV"** y seleccionar:
   - `JUGADOR stats FECHA HORA.csv` (si cargaste jugadores)
   - `ENTRENADOR stats FECHA HORA.csv` (si cargaste entrenadores)

Al cargar un nuevo archivo se hace reset automático de filtros y búsqueda.

### Tabla

Columnas: Nombre · Equipo NBA · Equipo Fantasy · Pos. · Rank (pos.) · Pts Total (rank) · Pts Avg · PJ · Sem (rank) · 2 Sem (rank) · Mes (rank)

- Click en cualquier cabecera para ordenar. Los rankings ordenan ascendente por defecto (menor rank = mejor).
- Los valores nulos aparecen siempre al final, independientemente de la dirección.
- El rank entre paréntesis en Pts Total, Sem, 2 Sem y Mes es el ranking ESPN global de ese período.

### Filtros

- **Buscador**: filtra por nombre, equipo NBA o equipo fantasy
- **Equipo NBA / Equipo Fantasy**: selectores desplegables
- **Posición**: botones PG / SG / SF / PF / C / G / F (G = guards, F = forwards)

### Gráficos

| Pestaña | Descripción |
|---|---|
| Top Pts Total | Barras horizontales, top N jugadores por puntos totales |
| Top Pts Avg | Barras horizontales, top N jugadores por average |
| Por Equipo Fantasy (Total) | Suma de puntos por equipo fantasy |
| Por Equipo Fantasy (Avg) | Media de puntos por equipo fantasy (total/partidos) |
| Por Equipo NBA (Total) | Suma de puntos por equipo NBA |
| Por Equipo NBA (Avg) | Media de puntos por equipo NBA |
| Comparar | Compara los jugadores marcados con checkbox (Avg, Sem, 2Sem, Mes) |

- El selector **Top 4 / Top 8 / Top 16** aplica a todas las pestañas excepto Comparar.
- Los gráficos de grupo excluyen automáticamente "Waivers" y "Free Agent".
- En la pestaña Comparar, el gráfico se actualiza en tiempo real al marcar/desmarcar checkboxes.
- Botón **Borrar**: elimina el gráfico actual.
- Botón **Descargar**: guarda el gráfico como PNG con fondo blanco.

### Tema e idioma

- **Idioma**: español / euskera / inglés (selector de banderas, esquina superior derecha)
- **Tema**: claro / oscuro / auto (sigue el sistema), con 5 esquemas de color
- Las preferencias se guardan en `localStorage` y se restauran al recargar

---

## Temporada 2026-27

Al inicio de la nueva temporada hay que actualizar:

1. `SEASON = 2027` en `espn_stats.py`
2. Las cookies `ESPN_S2` y `SWID` si han caducado
3. `JUGADOR ids.csv` — añadir/quitar jugadores según el draft
4. `ENTRENADOR ids.csv` — solo si cambia algún manager

---

## Notas técnicas

- Los decimales usan **coma** como separador (formato europeo): `1.234,56`
- El separador de columnas en los CSVs es **punto y coma** (`;`)
- La codificación es **UTF-8 con BOM** (`utf-8-sig`) para compatibilidad con Excel en Windows
- Los rankings ESPN son globales entre todas las ligas, no solo la tuya
- `Pts_2Semanas` y `Pts_Mes` pueden coincidir si el jugador no ha jugado recientemente
  (ESPN devuelve el mismo bloque cuando no hay suficientes datos recientes)
