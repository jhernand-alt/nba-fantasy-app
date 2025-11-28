# Fantasy NBA Dashboard – GO LAKERS!!!!

Este proyecto es una **aplicación web interactiva** diseñada para analizar, visualizar y gestionar datos de una liga *Fantasy NBA*.  
Permite cargar archivos CSV personalizados, filtrar jugadores por posición o equipo fantasy, ordenar estadísticas y generar gráficos dinámicos.

---

## 🚀 Funcionalidades Principales

### 📂 Carga y Exportación de Datos
- Carga de archivos **CSV** (separados por `;`).
- Exportación de datos procesados a un nuevo archivo CSV.
- Procesamiento automático de:
  - Puntos diarios.
  - Puntos semanales.
  - Partidos jugados.
  - Estadísticas agregadas por jugador.

---

### 🎯 Filtros Inteligentes
- Filtrado por **equipo fantasy** mediante selector dinámico.
- Filtrado por **posición**:
  - PG, SG, SF, PF, C, G, F o *Todos*.
- Ambos filtros se combinan para mostrar resultados precisos.

---

### 📊 Visualizaciones Interactivas
- Gráficos generados con **Chart.js**.
- Modo **Puntos Diarios** y **Puntos Semanales**.
- Línea adicional de **Promedio Global** calculada dinámicamente.
- Opción para **descargar gráfico** en PNG.

---

### 📋 Tabla Completa de Estadísticas
Incluye los siguientes datos:
- Equipo Fantasy  
- Nombre del Jugador  
- Equipo NBA  
- Posición  
- Partidos Jugados  
- Puntos Totales  
- Promedio de Puntos  
- Margen de Error (cálculo con desviación estándar y Z=1.96)

Permite **ordenar por columnas** haciendo clic en los encabezados.

---

## 🧮 Cálculos Estadísticos
Cada jugador obtiene:
- **Desviación estándar**
- **Margen de error en puntos**
- **Margen de error porcentual**

Además, las semanas se generan siguiendo el calendario definido en el código.

---

## 🛠️ Tecnologías Utilizadas
- **HTML5 + CSS3** (responsive y optimizado para móvil)
- **JavaScript** (toda la lógica interna)
- **Chart.js** para gráficos
- **LocalStorage** para recordar filtros del usuario

---

## 📁 Estructura del Proyecto

```
/
├── index.html   # Archivo principal
└── README.md    # Este archivo
```

---

## 🧑‍💻 Autor

Proyecto desarrollado por **Julián Hernández**.  
La fecha de la versión se muestra dinámicamente en la propia web.

---

## 📜 Licencia

Este proyecto puede ser modificado y adaptado libremente para uso personal o educativo.

---

¡Disfruta analizando tus datos de la Fantasy NBA! 🏀🔥
