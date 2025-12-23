# 🌍 Sistema de Proyecciones Cartográficas

Herramienta web interactiva para la enseñanza de proyecciones cartográficas y geodesia en Ingeniería Geográfica.

![Vista previa](https://img.shields.io/badge/Ingeniería-Geográfica-blue)
![Tecnología](https://img.shields.io/badge/React-18-61DAFB)
![3D](https://img.shields.io/badge/Three.js-0.160-black)

## 📋 Descripción

Esta aplicación permite:
- Dibujar polígonos sobre un mapa 2D con diferentes proyecciones cartográficas
- Visualizar los polígonos en una esfera 3D (elipsoide WGS84)
- Calcular métricas geodésicas en tiempo real
- Convertir coordenadas entre diferentes sistemas

## ✨ Características

### 🗺️ Proyecciones Cartográficas
- **Equirectangular (Plate Carrée)** - Cilíndrica Equidistante
- **Mercator** - Cilíndrica Conforme
- **Mollweide** - Pseudocilíndrica Equivalente
- **Sinusoidal** - Pseudocilíndrica Equivalente
- **Robinson** - Pseudocilíndrica Compromiso
- **Lambert Cilíndrica** - Cilíndrica Equivalente

### 📐 Cálculos Geodésicos
- Distancia geodésica (Fórmula de Vincenty)
- Área geodésica
- Perímetro
- Centroide
- Azimut y Rumbo
- Radios de curvatura (M y N)
- Conversión a coordenadas UTM

### 🌐 Visualización 3D
- Esfera interactiva con controles de rotación y zoom
- Relleno de polígonos que sigue la curvatura de la esfera
- Líneas de referencia: Ecuador, Greenwich, Trópicos, Círculos Polares

## 🚀 Cómo usar

1. Clona el repositorio o descarga los archivos
2. Abre `index.html` en un navegador moderno
   - **Nota**: Para desarrollo local, usa un servidor como Live Server en VS Code

## 📁 Estructura de archivos

```
proyecto-cartografia/
├── index.html      # Archivo principal HTML
├── styles.css      # Estilos CSS
├── script.js       # Código JavaScript/React
└── README.md       # Este archivo
```

## 🛠️ Tecnologías

- **React 18** - Interfaz de usuario
- **Three.js** - Renderizado 3D
- **Babel** - Transpilación de JSX
- **CSS3** - Estilos y animaciones

## 📚 Contenido Educativo

### Elipsoide WGS84
| Parámetro | Valor |
|-----------|-------|
| Semieje Mayor (a) | 6,378,137.0 m |
| Semieje Menor (b) | 6,356,752.314 m |
| Achatamiento (f) | 1/298.257223563 |
| Excentricidad (e) | 0.0818191908426 |

### Fórmulas Implementadas
- **Vincenty**: Distancia geodésica precisa (~0.5mm)
- **UTM**: Conversión a coordenadas proyectadas
- **Azimut**: Dirección entre dos puntos

## 👤 Autor

**John Leonardo Cabrera Espíndola**  
Ingeniería Geográfica

## 📄 Licencia

Este proyecto es de uso educativo.

---

⭐ Si te fue útil, ¡dale una estrella al repositorio!
