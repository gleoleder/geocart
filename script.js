/* ============================================
   SISTEMA DE PROYECCIONES CARTOGRÁFICAS
   Archivo: script.js
   
   Este archivo contiene todo el código JavaScript
   de la aplicación, organizado en secciones:
   
   1. CONSTANTES GEODÉSICAS (WGS84)
   2. FUNCIONES DE GEODESIA
   3. FUNCIONES DE PROYECCIONES
   4. FUNCIONES DE RENDERIZADO 3D
   5. COMPONENTE PRINCIPAL REACT
   
   Elaborado por: John Leonardo Cabrera Espíndola
   Carrera: Ingeniería Geográfica
============================================ */


/* ============================================
   SECCIÓN 1: CONSTANTES GEODÉSICAS
   
   Define los parámetros del elipsoide WGS84
   y configuraciones de la aplicación.
============================================ */

/**
 * ELIPSOIDE WGS84 (World Geodetic System 1984)
 * 
 * El elipsoide es una aproximación matemática de la forma de la Tierra.
 * La Tierra no es una esfera perfecta, sino que está achatada en los polos
 * debido a la rotación. El WGS84 es el sistema de referencia usado por GPS.
 */
const WGS84 = {
    /**
     * Semieje Mayor (a) - Radio ecuatorial
     * Unidad: metros
     * Es la distancia desde el centro de la Tierra hasta el ecuador.
     */
    a: 6378137.0,
    
    /**
     * Semieje Menor (b) - Radio polar
     * Unidad: metros
     * Es la distancia desde el centro de la Tierra hasta los polos.
     * Es ~21 km menor que el semieje mayor debido al achatamiento.
     */
    b: 6356752.314245,
    
    /**
     * Achatamiento (f - flattening)
     * Fórmula: f = (a - b) / a
     * Mide cuánto difiere el elipsoide de una esfera perfecta.
     */
    f: 1 / 298.257223563,
    
    /**
     * Primera Excentricidad (e)
     * Fórmula: e = sqrt(1 - (b²/a²))
     * Mide la desviación del elipsoide respecto a un círculo.
     */
    e: 0.0818191908426,
    
    /**
     * Primera Excentricidad al Cuadrado (e²)
     * Se usa frecuentemente en cálculos geodésicos.
     */
    e2: 0.00669437999014,
    
    /**
     * Segunda Excentricidad al Cuadrado (e'²)
     * Fórmula: e'² = (a² - b²) / b²
     * Usada especialmente en la proyección UTM.
     */
    ep2: 0.00673949674228,
};

/**
 * COLORES DISPONIBLES
 * Array de colores para dibujar polígonos.
 */
const COLORS = [
    { hex: '#00f5ff', name: 'Cian' },
    { hex: '#ff006e', name: 'Magenta' },
    { hex: '#8b5cf6', name: 'Púrpura' },
    { hex: '#00ff88', name: 'Verde' },
    { hex: '#ffbe0b', name: 'Dorado' },
    { hex: '#fb5607', name: 'Naranja' },
];

/**
 * PROYECCIONES CARTOGRÁFICAS DISPONIBLES
 * Cada proyección tiene un ID, nombre y tipo.
 */
const PROJECTIONS = [
    { 
        id: 'equirectangular', 
        name: 'Equirectangular (Plate Carrée)', 
        type: 'Cilíndrica Equidistante'
    },
    { 
        id: 'mercator', 
        name: 'Mercator', 
        type: 'Cilíndrica Conforme'
    },
    { 
        id: 'mollweide', 
        name: 'Mollweide', 
        type: 'Pseudocilíndrica Equivalente'
    },
    { 
        id: 'sinusoidal', 
        name: 'Sinusoidal', 
        type: 'Pseudocilíndrica Equivalente'
    },
    { 
        id: 'robinson', 
        name: 'Robinson', 
        type: 'Pseudocilíndrica Compromiso'
    },
    { 
        id: 'lambert', 
        name: 'Lambert Cilíndrica', 
        type: 'Cilíndrica Equivalente'
    },
];


/* ============================================
   SECCIÓN 2: FUNCIONES DE GEODESIA
   
   Funciones para cálculos geodésicos:
   - Conversión de ángulos
   - Distancia de Vincenty
   - Área geodésica
   - Azimut y rumbo
   - Conversión a UTM
============================================ */

/**
 * Convierte grados a radianes
 * Los cálculos trigonométricos requieren radianes.
 * Fórmula: radianes = grados × (π / 180)
 * 
 * @param {number} deg - Ángulo en grados
 * @returns {number} - Ángulo en radianes
 */
const toRadians = (deg) => deg * Math.PI / 180;

/**
 * Convierte radianes a grados
 * Fórmula: grados = radianes × (180 / π)
 * 
 * @param {number} rad - Ángulo en radianes
 * @returns {number} - Ángulo en grados
 */
const toDegrees = (rad) => rad * 180 / Math.PI;

/**
 * Convierte coordenadas DMS (Grados, Minutos, Segundos) a decimal
 * 
 * Formato DMS: 41° 24' 12.2" N
 * Fórmula: decimal = grados + (minutos / 60) + (segundos / 3600)
 * 
 * @param {number} deg - Grados
 * @param {number} min - Minutos (0-60)
 * @param {number} sec - Segundos (0-60)
 * @param {string} direction - 'N', 'S', 'E' o 'W'
 * @returns {number} - Coordenada en grados decimales
 */
const dmsToDecimal = (deg, min, sec, direction) => {
    // Calculamos el valor absoluto
    let decimal = Math.abs(parseFloat(deg) || 0) + 
                  (parseFloat(min) || 0) / 60 + 
                  (parseFloat(sec) || 0) / 3600;
    
    // Sur y Oeste son negativos
    if (direction === 'S' || direction === 'W') {
        decimal = -decimal;
    }
    
    return decimal;
};

/**
 * Convierte coordenadas decimales a DMS
 * 
 * @param {number} decimal - Coordenada en grados decimales
 * @returns {object} - { deg, min, sec }
 */
const decimalToDMS = (decimal) => {
    const abs = Math.abs(decimal);
    const deg = Math.floor(abs);
    const minFloat = (abs - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = (minFloat - min) * 60;
    
    return { deg, min, sec: sec.toFixed(2) };
};

/**
 * DISTANCIA GEODÉSICA - FÓRMULA DE VINCENTY
 * 
 * Calcula la distancia entre dos puntos sobre el elipsoide WGS84.
 * Es uno de los métodos más precisos (~0.5mm de precisión).
 * 
 * A diferencia de Haversine (que asume esfera), Vincenty considera
 * el achatamiento de la Tierra.
 * 
 * @param {number} lat1 - Latitud punto 1 (grados)
 * @param {number} lon1 - Longitud punto 1 (grados)
 * @param {number} lat2 - Latitud punto 2 (grados)
 * @param {number} lon2 - Longitud punto 2 (grados)
 * @returns {number} - Distancia en metros
 */
const vincentyDistance = (lat1, lon1, lat2, lon2) => {
    // Convertimos latitudes a radianes
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const L = toRadians(lon2 - lon1);
    
    // Calculamos las latitudes reducidas (parametric latitude)
    const tanU1 = (1 - WGS84.f) * Math.tan(φ1);
    const cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1);
    const sinU1 = tanU1 * cosU1;
    
    const tanU2 = (1 - WGS84.f) * Math.tan(φ2);
    const cosU2 = 1 / Math.sqrt(1 + tanU2 * tanU2);
    const sinU2 = tanU2 * cosU2;
    
    // Proceso iterativo para resolver las ecuaciones de Vincenty
    let λ = L, λʹ, iterLimit = 100;
    let sinσ, cosσ, σ, sinα, cos2α, cos2σm;
    
    do {
        const sinλ = Math.sin(λ), cosλ = Math.cos(λ);
        
        sinσ = Math.sqrt((cosU2 * sinλ) ** 2 + (cosU1 * sinU2 - sinU1 * cosU2 * cosλ) ** 2);
        if (sinσ === 0) return 0; // Puntos coincidentes
        
        cosσ = sinU1 * sinU2 + cosU1 * cosU2 * cosλ;
        σ = Math.atan2(sinσ, cosσ);
        sinα = cosU1 * cosU2 * sinλ / sinσ;
        cos2α = 1 - sinα ** 2;
        cos2σm = cos2α !== 0 ? cosσ - 2 * sinU1 * sinU2 / cos2α : 0;
        
        const C = WGS84.f / 16 * cos2α * (4 + WGS84.f * (4 - 3 * cos2α));
        λʹ = λ;
        λ = L + (1 - C) * WGS84.f * sinα * (σ + C * sinσ * (cos2σm + C * cosσ * (-1 + 2 * cos2σm ** 2)));
        
    } while (Math.abs(λ - λʹ) > 1e-12 && --iterLimit > 0);
    
    // Calculamos la distancia final
    const u2 = cos2α * (WGS84.a ** 2 - WGS84.b ** 2) / (WGS84.b ** 2);
    const A = 1 + u2 / 16384 * (4096 + u2 * (-768 + u2 * (320 - 175 * u2)));
    const B = u2 / 1024 * (256 + u2 * (-128 + u2 * (74 - 47 * u2)));
    const Δσ = B * sinσ * (cos2σm + B / 4 * (cosσ * (-1 + 2 * cos2σm ** 2) - B / 6 * cos2σm * (-3 + 4 * sinσ ** 2) * (-3 + 4 * cos2σm ** 2)));
    
    // s = b × A × (σ - Δσ)
    return WGS84.b * A * (σ - Δσ);
};

/**
 * ÁREA GEODÉSICA
 * 
 * Calcula el área de un polígono sobre la superficie terrestre.
 * Usa la fórmula de exceso esférico.
 * 
 * @param {Array} pts - Array de puntos [{lat, lon}, ...]
 * @returns {number} - Área en metros cuadrados
 */
const calculateGeodesicArea = (pts) => {
    if (pts.length < 3) return 0;
    
    let area = 0;
    const n = pts.length;
    
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const lat1 = toRadians(pts[i].lat);
        const lat2 = toRadians(pts[j].lat);
        const dLon = toRadians(pts[j].lon - pts[i].lon);
        area += dLon * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    
    return Math.abs(area * WGS84.a * WGS84.a / 2);
};

/**
 * PERÍMETRO
 * 
 * Suma las distancias geodésicas entre vértices consecutivos.
 * 
 * @param {Array} pts - Array de puntos [{lat, lon}, ...]
 * @returns {number} - Perímetro en metros
 */
const calculatePerimeter = (pts) => {
    if (pts.length < 2) return 0;
    
    let perimeter = 0;
    for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        perimeter += vincentyDistance(pts[i].lat, pts[i].lon, pts[j].lat, pts[j].lon);
    }
    return perimeter;
};

/**
 * CENTROIDE
 * 
 * Calcula el centro geométrico del polígono.
 * 
 * @param {Array} pts - Array de puntos [{lat, lon}, ...]
 * @returns {object} - { lat, lon }
 */
const calculateCentroid = (pts) => {
    if (pts.length === 0) return { lat: 0, lon: 0 };
    
    let sumLat = 0, sumLon = 0;
    pts.forEach(p => { sumLat += p.lat; sumLon += p.lon; });
    
    return { lat: sumLat / pts.length, lon: sumLon / pts.length };
};

/**
 * RADIO DE CURVATURA MERIDIANA (M)
 * 
 * Radio del círculo osculador en dirección Norte-Sur.
 * Fórmula: M = a(1-e²) / (1-e²sin²φ)^(3/2)
 * 
 * @param {number} lat - Latitud en grados
 * @returns {number} - Radio en metros
 */
const radiusMeridian = (lat) => {
    const sinLat = Math.sin(toRadians(lat));
    return WGS84.a * (1 - WGS84.e2) / Math.pow(1 - WGS84.e2 * sinLat * sinLat, 1.5);
};

/**
 * RADIO DE CURVATURA PRIMER VERTICAL (N)
 * 
 * Radio del círculo osculador en dirección Este-Oeste.
 * Fórmula: N = a / sqrt(1-e²sin²φ)
 * 
 * @param {number} lat - Latitud en grados
 * @returns {number} - Radio en metros
 */
const radiusPrimeVertical = (lat) => {
    const sinLat = Math.sin(toRadians(lat));
    return WGS84.a / Math.sqrt(1 - WGS84.e2 * sinLat * sinLat);
};

/**
 * AZIMUT GEODÉSICO
 * 
 * Ángulo medido desde el Norte en sentido horario.
 * Rango: 0° a 360°
 * 
 * @param {number} lat1, lon1 - Punto origen
 * @param {number} lat2, lon2 - Punto destino
 * @returns {number} - Azimut en grados (0-360)
 */
const calculateAzimuth = (lat1, lon1, lat2, lon2) => {
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δλ = toRadians(lon2 - lon1);
    
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    
    let azimuth = toDegrees(Math.atan2(y, x));
    if (azimuth < 0) azimuth += 360;
    
    return azimuth;
};

/**
 * CONVERSIÓN DE AZIMUT A RUMBO
 * 
 * El rumbo usa cuadrantes (NE, SE, SW, NW).
 * 
 * @param {number} azimuth - Azimut en grados (0-360)
 * @returns {object} - { quadrant, angle }
 */
const azimuthToRumbo = (azimuth) => {
    if (azimuth >= 0 && azimuth < 90) return { quadrant: 'NE', angle: azimuth.toFixed(2) };
    if (azimuth >= 90 && azimuth < 180) return { quadrant: 'SE', angle: (180 - azimuth).toFixed(2) };
    if (azimuth >= 180 && azimuth < 270) return { quadrant: 'SW', angle: (azimuth - 180).toFixed(2) };
    return { quadrant: 'NW', angle: (360 - azimuth).toFixed(2) };
};

/**
 * CONVERSIÓN A COORDENADAS UTM
 * 
 * UTM divide la Tierra en 60 husos de 6° cada uno.
 * Las coordenadas se expresan en metros (Easting, Northing).
 * 
 * @param {number} lat - Latitud (-80° a 84°)
 * @param {number} lon - Longitud (-180° a 180°)
 * @returns {object} - { zone, hemisphere, easting, northing }
 */
const latLonToUTM = (lat, lon) => {
    // Calculamos la zona UTM
    const zone = Math.floor((lon + 180) / 6) + 1;
    const lonOrigin = (zone - 1) * 6 - 180 + 3;
    
    const latRad = toRadians(lat);
    const lonRad = toRadians(lon);
    const lonOriginRad = toRadians(lonOrigin);
    
    // Cálculos intermedios
    const N = WGS84.a / Math.sqrt(1 - WGS84.e2 * Math.sin(latRad) ** 2);
    const T = Math.tan(latRad) ** 2;
    const C = WGS84.ep2 * Math.cos(latRad) ** 2;
    const A = Math.cos(latRad) * (lonRad - lonOriginRad);
    
    // Longitud del arco del meridiano
    const M = WGS84.a * (
        (1 - WGS84.e2/4 - 3*WGS84.e2**2/64 - 5*WGS84.e2**3/256) * latRad
        - (3*WGS84.e2/8 + 3*WGS84.e2**2/32 + 45*WGS84.e2**3/1024) * Math.sin(2*latRad)
        + (15*WGS84.e2**2/256 + 45*WGS84.e2**3/1024) * Math.sin(4*latRad)
        - (35*WGS84.e2**3/3072) * Math.sin(6*latRad)
    );
    
    const k0 = 0.9996; // Factor de escala central UTM
    
    // Easting (X) - con falso easting de 500,000 m
    let easting = k0 * N * (A + (1-T+C)*A**3/6 + (5-18*T+T**2+72*C-58*WGS84.ep2)*A**5/120) + 500000;
    
    // Northing (Y)
    let northing = k0 * (M + N*Math.tan(latRad)*(A**2/2 + (5-T+9*C+4*C**2)*A**4/24 + (61-58*T+T**2+600*C-330*WGS84.ep2)*A**6/720));
    
    // En hemisferio sur, añadimos falso northing de 10,000,000 m
    if (lat < 0) northing += 10000000;
    
    const hemisphere = lat >= 0 ? 'N' : 'S';
    
    return { zone, hemisphere, easting: easting.toFixed(2), northing: northing.toFixed(2) };
};

/**
 * FACTOR DE ESCALA
 * 
 * Indica la distorsión de la proyección en una latitud dada.
 * k = 1: sin distorsión | k > 1: ampliación
 * 
 * @param {number} lat - Latitud
 * @param {string} projection - ID de la proyección
 * @returns {number} - Factor de escala
 */
const getScaleFactor = (lat, projection) => {
    const latRad = toRadians(Math.abs(lat));
    switch(projection) {
        case 'mercator': return 1 / Math.cos(latRad);
        case 'lambert': return 1 / Math.cos(latRad);
        default: return 1;
    }
};

/**
 * FORMATEO DE NÚMEROS
 */
const formatNumber = (num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(3) + ' km²';
    if (num >= 1e6) return (num / 1e6).toFixed(3) + ' km²';
    return num.toFixed(2) + ' m²';
};

const formatDistance = (m) => m >= 1000 ? (m / 1000).toFixed(3) + ' km' : m.toFixed(2) + ' m';


/* ============================================
   SECCIÓN 3: FUNCIONES DE PROYECCIONES
   
   Transforman coordenadas geográficas (lat/lon)
   a coordenadas planas (x/y) según diferentes
   proyecciones cartográficas.
============================================ */

/**
 * PROYECTAR PUNTO
 * 
 * Transforma coordenadas geográficas a coordenadas del plano
 * según la proyección seleccionada.
 * 
 * @param {number} lat - Latitud (-90 a 90)
 * @param {number} lon - Longitud (-180 a 180)
 * @param {string} projection - ID de la proyección
 * @param {number} width - Ancho del área (normalmente 100 para %)
 * @param {number} height - Alto del área
 * @returns {object} - { x, y } en porcentaje
 */
const projectPoint = (lat, lon, projection, width, height) => {
    const latRad = toRadians(lat);
    const lonRad = toRadians(lon);
    let x, y;

    switch(projection) {
        
        /* MERCATOR - Cilíndrica Conforme
           Preserva ángulos. Ideal para navegación.
           Distorsiona áreas cerca de los polos. */
        case 'mercator':
            x = (lon + 180) / 360;
            const maxLat = 85; // Limitamos para evitar infinitos
            const clampedLat = Math.max(-maxLat, Math.min(maxLat, lat));
            y = 0.5 - Math.log(Math.tan(Math.PI/4 + toRadians(clampedLat)/2)) / (2 * Math.PI);
            break;
        
        /* MOLLWEIDE - Pseudocilíndrica Equivalente
           Preserva áreas. La Tierra aparece como elipse. */
        case 'mollweide':
            let theta = latRad;
            for(let i = 0; i < 10; i++) {
                theta = theta - (2*theta + Math.sin(2*theta) - Math.PI*Math.sin(latRad)) / (2 + 2*Math.cos(2*theta));
            }
            x = 0.5 + (lonRad / Math.PI) * Math.cos(theta) * 0.4;
            y = 0.5 - Math.sin(theta) * 0.45;
            break;
        
        /* SINUSOIDAL - Pseudocilíndrica Equivalente
           Preserva áreas. Meridianos son curvas senoidales. */
        case 'sinusoidal':
            x = 0.5 + (lonRad * Math.cos(latRad)) / Math.PI * 0.45;
            y = 0.5 - latRad / Math.PI * 0.9;
            break;
        
        /* ROBINSON - Pseudocilíndrica Compromiso
           Balance entre distorsión de formas y áreas.
           Usa tabla de interpolación. */
        case 'robinson':
            const absLat = Math.abs(lat);
            const robinsonTable = [
                [0, 1.0000, 0.0000], [5, 0.9986, 0.0620], [10, 0.9954, 0.1240],
                [15, 0.9900, 0.1860], [20, 0.9822, 0.2480], [25, 0.9730, 0.3100],
                [30, 0.9600, 0.3720], [35, 0.9427, 0.4340], [40, 0.9216, 0.4958],
                [45, 0.8962, 0.5571], [50, 0.8679, 0.6176], [55, 0.8350, 0.6769],
                [60, 0.7986, 0.7346], [65, 0.7597, 0.7903], [70, 0.7186, 0.8435],
                [75, 0.6732, 0.8936], [80, 0.6213, 0.9394], [85, 0.5722, 0.9761],
                [90, 0.5322, 1.0000]
            ];
            let idx = Math.floor(absLat / 5);
            if (idx >= robinsonTable.length - 1) idx = robinsonTable.length - 2;
            const t = (absLat - robinsonTable[idx][0]) / 5;
            const plen = robinsonTable[idx][1] * (1-t) + robinsonTable[idx+1][1] * t;
            const pdfe = robinsonTable[idx][2] * (1-t) + robinsonTable[idx+1][2] * t;
            x = 0.5 + (lon / 180) * plen * 0.45;
            y = 0.5 - (lat < 0 ? -1 : 1) * pdfe * 0.45;
            break;
        
        /* LAMBERT CILÍNDRICA - Equivalente
           Preserva áreas. Paralelos comprimidos hacia polos. */
        case 'lambert':
            x = (lon + 180) / 360;
            y = 0.5 - Math.sin(latRad) * 0.5;
            break;
        
        /* EQUIRECTANGULAR (Plate Carrée) - Por defecto
           La más simple: mapeo directo lat→Y, lon→X */
        default:
            x = (lon + 180) / 360;
            y = (90 - lat) / 180;
    }
    
    return { x: x * 100, y: y * 100 };
};


/* ============================================
   SECCIÓN 4: FUNCIONES DE RENDERIZADO 3D
   
   Funciones para Three.js:
   - Conversión de coordenadas a vectores 3D
   - Creación del relleno esférico
   - Creación de líneas geodésicas
============================================ */

/**
 * CONVERTIR LAT/LON A VECTOR 3D
 * 
 * Transforma coordenadas geográficas a posición 3D en la esfera.
 * 
 * Sistema de coordenadas:
 * - Y: hacia arriba (polos)
 * - X: hacia la derecha
 * - Z: hacia el observador
 * 
 * @param {number} lat - Latitud
 * @param {number} lon - Longitud
 * @param {number} radius - Radio de la esfera
 * @returns {THREE.Vector3}
 */
const latLonToVector3 = (lat, lon, radius = 2) => {
    const phi = (90 - lat) * (Math.PI / 180);   // Ángulo polar
    const theta = (lon + 180) * (Math.PI / 180); // Ángulo azimutal
    
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
};

/**
 * CREAR RELLENO ESFÉRICO
 * 
 * Crea una malla que sigue la curvatura de la esfera.
 * Usa teselación para dividir el polígono en triángulos pequeños.
 * 
 * @param {Array} polygonPoints - Puntos del polígono
 * @param {string} color - Color hexadecimal
 * @param {number} radius - Radio de la esfera
 * @returns {THREE.Mesh|null}
 */
const createSphericalFill = (polygonPoints, color, radius = 2.03) => {
    if (polygonPoints.length < 3) return null;

    // Convertimos puntos a vectores 3D
    const vectors = polygonPoints.map(p => latLonToVector3(p.lat, p.lon, radius));
    
    // Calculamos el centro
    const center = new THREE.Vector3();
    vectors.forEach(v => center.add(v));
    center.divideScalar(vectors.length);
    center.normalize().multiplyScalar(radius);

    const vertices = [];
    const subdivisions = 20; // Más = más suave

    // Para cada lado del polígono
    for (let i = 0; i < vectors.length; i++) {
        const v1 = vectors[i];
        const v2 = vectors[(i + 1) % vectors.length];

        // Subdividimos el triángulo centro-v1-v2
        for (let row = 0; row < subdivisions; row++) {
            for (let col = 0; col <= row; col++) {
                const t1 = row / subdivisions;
                const t2 = (row + 1) / subdivisions;
                const s1 = row > 0 ? col / row : 0;
                const s2 = col / (row + 1);
                const s3 = (col + 1) / (row + 1);

                // Función de interpolación
                const lerp3 = (a, b, c, u, v) => {
                    const w = 1 - u - v;
                    return new THREE.Vector3(
                        a.x * w + b.x * u + c.x * v,
                        a.y * w + b.y * u + c.y * v,
                        a.z * w + b.z * u + c.z * v
                    ).normalize().multiplyScalar(radius);
                };

                // Triángulo superior
                const p1 = lerp3(center, v1, v2, t1 * s1, t1 * (1 - s1));
                const p2 = lerp3(center, v1, v2, t2 * s2, t2 * (1 - s2));
                const p3 = lerp3(center, v1, v2, t2 * s3, t2 * (1 - s3));

                vertices.push(p1.x, p1.y, p1.z);
                vertices.push(p2.x, p2.y, p2.z);
                vertices.push(p3.x, p3.y, p3.z);

                // Triángulo inferior
                if (row > 0 && col < row) {
                    const p4 = lerp3(center, v1, v2, t1 * ((col + 1) / row), t1 * (1 - (col + 1) / row));
                    vertices.push(p1.x, p1.y, p1.z);
                    vertices.push(p3.x, p3.y, p3.z);
                    vertices.push(p4.x, p4.y, p4.z);
                }
            }
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    return new THREE.Mesh(geometry, material);
};

/**
 * CREAR LÍNEAS ESFÉRICAS
 * 
 * Crea líneas que siguen la curvatura de la esfera (geodésicas).
 * 
 * @param {Array} polygonPoints - Puntos del polígono
 * @param {string} color - Color hexadecimal
 * @param {number} radius - Radio
 * @param {boolean} close - Si cierra el polígono
 * @returns {THREE.Line|null}
 */
const createSphericalLines = (polygonPoints, color, radius = 2.04, close = true) => {
    if (polygonPoints.length < 2) return null;

    const allPoints = close ? [...polygonPoints, polygonPoints[0]] : polygonPoints;
    const curvePoints = [];

    for (let i = 0; i < allPoints.length - 1; i++) {
        const start = latLonToVector3(allPoints[i].lat, allPoints[i].lon, radius);
        const end = latLonToVector3(allPoints[i + 1].lat, allPoints[i + 1].lon, radius);
        
        const segments = 50;
        for (let t = 0; t <= 1; t += 1/segments) {
            const point = new THREE.Vector3().lerpVectors(start, end, t).normalize().multiplyScalar(radius);
            curvePoints.push(point);
        }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const material = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
    return new THREE.Line(geometry, material);
};


/* ============================================
   SECCIÓN 5: COMPONENTE PRINCIPAL REACT
   
   Integra toda la funcionalidad en una
   interfaz de usuario interactiva.
============================================ */

const PolygonDrawer = () => {
    const { useState, useRef, useEffect, useCallback } = React;

    // ===== ESTADO =====
    const [points, setPoints] = useState([]);
    const [inputLat, setInputLat] = useState('');
    const [inputLon, setInputLon] = useState('');
    const [polygons, setPolygons] = useState([]);
    const [currentColor, setCurrentColor] = useState('#00f5ff');
    const [isDrawing, setIsDrawing] = useState(false);
    const [mousePos, setMousePos] = useState(null);
    const [mouseCoords, setMouseCoords] = useState(null);
    const [activeTab, setActiveTab] = useState('control');
    const [selectedProjection, setSelectedProjection] = useState('equirectangular');
    const [coordFormat, setCoordFormat] = useState('decimal');
    const [inputDeg, setInputDeg] = useState('');
    const [inputMin, setInputMin] = useState('');
    const [inputSec, setInputSec] = useState('');
    const [inputNS, setInputNS] = useState('N');
    const [inputDegLon, setInputDegLon] = useState('');
    const [inputMinLon, setInputMinLon] = useState('');
    const [inputSecLon, setInputSecLon] = useState('');
    const [inputEW, setInputEW] = useState('W');
    
    // ===== REFERENCIAS =====
    const sphereContainerRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const sphereGroupRef = useRef(null);
    const polygonMeshesRef = useRef([]);
    const currentPolygonRef = useRef(null);
    const currentPolygonFillRef = useRef(null);
    const pointSpheresRef = useRef([]);
    const animationRef = useRef(null);

    // ===== INICIALIZACIÓN THREE.JS =====
    useEffect(() => {
        if (!sphereContainerRef.current) return;

        const container = sphereContainerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Escena
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Cámara
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.z = 4.5;
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Grupo de la esfera
        const sphereGroup = new THREE.Group();
        scene.add(sphereGroup);
        sphereGroupRef.current = sphereGroup;

        // Estrellas de fondo
        const starsGeometry = new THREE.BufferGeometry();
        const starPositions = [];
        for (let i = 0; i < 1500; i++) {
            starPositions.push((Math.random() - 0.5) * 150, (Math.random() - 0.5) * 150, (Math.random() - 0.5) * 150);
        }
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
        const stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, opacity: 0.8, transparent: true }));
        scene.add(stars);

        // Esfera principal
        const sphereGeometry = new THREE.SphereGeometry(2, 128, 128);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: 0x0a1628, transparent: true, opacity: 0.92, shininess: 80, specular: 0x00f5ff,
        });
        sphereGroup.add(new THREE.Mesh(sphereGeometry, sphereMaterial));

        // Brillo exterior
        const glowGeometry = new THREE.SphereGeometry(2.1, 64, 64);
        const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.05, side: THREE.BackSide });
        const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
        sphereGroup.add(glowSphere);

        // Líneas de latitud
        for (let lat = -80; lat <= 80; lat += 10) {
            const radius = 2.01 * Math.cos(lat * Math.PI / 180);
            const y = 2.01 * Math.sin(lat * Math.PI / 180);
            const latGeometry = new THREE.RingGeometry(radius - 0.002, radius + 0.002, 128);
            const isSpecial = lat === 0 || Math.abs(lat) === 23 || Math.abs(lat) === 66;
            const color = lat === 0 ? 0x00ff88 : (Math.abs(lat) === 23 ? 0xffbe0b : (Math.abs(lat) === 66 ? 0x8b5cf6 : 0x00f5ff));
            const opacity = isSpecial ? 0.6 : (lat % 30 === 0 ? 0.35 : 0.12);
            const latMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide });
            const latRing = new THREE.Mesh(latGeometry, latMaterial);
            latRing.position.y = y;
            latRing.rotation.x = Math.PI / 2;
            sphereGroup.add(latRing);
        }

        // Líneas de longitud
        for (let lon = 0; lon < 360; lon += 10) {
            const curve = new THREE.EllipseCurve(0, 0, 2.01, 2.01, 0, Math.PI * 2);
            const curvePoints = curve.getPoints(128);
            const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints.map(p => new THREE.Vector3(p.x, p.y, 0)));
            const color = lon === 0 ? 0xff006e : 0x00f5ff;
            const opacity = lon === 0 ? 0.6 : (lon % 30 === 0 ? 0.3 : 0.1);
            const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
            const line = new THREE.Line(geometry, material);
            line.rotation.y = (lon * Math.PI) / 180;
            sphereGroup.add(line);
        }

        // Luces
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const light1 = new THREE.PointLight(0x00f5ff, 1.5, 25);
        light1.position.set(6, 6, 6);
        scene.add(light1);
        const light2 = new THREE.PointLight(0xff006e, 0.8, 25);
        light2.position.set(-6, -6, 6);
        scene.add(light2);

        // Variables de control
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let autoRotate = true;
        let time = 0;

        // Animación
        const animate = () => {
            animationRef.current = requestAnimationFrame(animate);
            time += 0.01;
            if (autoRotate && !isDragging) sphereGroup.rotation.y += 0.001;
            stars.rotation.y += 0.0001;
            glowSphere.material.opacity = 0.04 + Math.sin(time * 2) * 0.02;
            renderer.render(scene, camera);
        };
        animate();

        // Eventos del mouse
        const handleMouseDown = (e) => { isDragging = true; autoRotate = false; previousMousePosition = { x: e.clientX, y: e.clientY }; };
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            sphereGroup.rotation.y += (e.clientX - previousMousePosition.x) * 0.005;
            sphereGroup.rotation.x += (e.clientY - previousMousePosition.y) * 0.005;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        };
        const handleMouseUp = () => { isDragging = false; setTimeout(() => { autoRotate = true; }, 4000); };
        const handleWheel = (e) => { e.preventDefault(); camera.position.z = Math.max(3, Math.min(10, camera.position.z + e.deltaY * 0.003)); };

        renderer.domElement.addEventListener('mousedown', handleMouseDown);
        renderer.domElement.addEventListener('mousemove', handleMouseMove);
        renderer.domElement.addEventListener('mouseup', handleMouseUp);
        renderer.domElement.addEventListener('mouseleave', handleMouseUp);
        renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });

        // Redimensionamiento
        const handleResize = () => {
            const w = container.clientWidth, h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        // Limpieza
        return () => {
            cancelAnimationFrame(animationRef.current);
            renderer.dispose();
            if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // ===== ACTUALIZACIÓN DE LA ESFERA =====
    const updateSphereVisualization = useCallback(() => {
        if (!sphereGroupRef.current) return;
        const group = sphereGroupRef.current;

        if (currentPolygonRef.current) { group.remove(currentPolygonRef.current); currentPolygonRef.current = null; }
        if (currentPolygonFillRef.current) { group.remove(currentPolygonFillRef.current); currentPolygonFillRef.current = null; }
        pointSpheresRef.current.forEach(ps => group.remove(ps));
        pointSpheresRef.current = [];

        if (points.length === 0) return;

        points.forEach(point => {
            const position = latLonToVector3(point.lat, point.lon, 2.06);
            
            const glowMesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 16, 16),
                new THREE.MeshBasicMaterial({ color: currentColor, transparent: true, opacity: 0.4 })
            );
            glowMesh.position.copy(position);
            group.add(glowMesh);
            pointSpheresRef.current.push(glowMesh);

            const pointMesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 16, 16),
                new THREE.MeshBasicMaterial({ color: currentColor })
            );
            pointMesh.position.copy(position);
            group.add(pointMesh);
            pointSpheresRef.current.push(pointMesh);
        });

        if (points.length >= 2) {
            const line = createSphericalLines(points, currentColor, 2.04, points.length >= 3);
            if (line) { group.add(line); currentPolygonRef.current = line; }

            if (points.length >= 3) {
                const fill = createSphericalFill(points, currentColor, 2.025);
                if (fill) { group.add(fill); currentPolygonFillRef.current = fill; }
            }
        }
    }, [points, currentColor]);

    useEffect(() => { updateSphereVisualization(); }, [points, updateSphereVisualization]);

    // ===== FUNCIONES DE CONTROL =====
    const addPoint = () => {
        let lat, lon;
        if (coordFormat === 'decimal') {
            lat = parseFloat(inputLat);
            lon = parseFloat(inputLon);
        } else {
            lat = dmsToDecimal(inputDeg, inputMin, inputSec, inputNS);
            lon = dmsToDecimal(inputDegLon, inputMinLon, inputSecLon, inputEW);
        }
        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return;
        setPoints([...points, { lat, lon }]);
        if (coordFormat === 'decimal') { setInputLat(''); setInputLon(''); }
        else { setInputDeg(''); setInputMin(''); setInputSec(''); setInputDegLon(''); setInputMinLon(''); setInputSecLon(''); }
        setIsDrawing(true);
    };

    const completePolygon = () => {
        if (points.length < 3) return;
        const newPolygon = { id: Date.now(), points: [...points], color: currentColor };
        setPolygons([...polygons, newPolygon]);

        if (sphereGroupRef.current) {
            const group = sphereGroupRef.current;
            const line = createSphericalLines(points, currentColor, 2.04, true);
            if (line) { group.add(line); polygonMeshesRef.current.push(line); }
            const fill = createSphericalFill(points, currentColor, 2.025);
            if (fill) { group.add(fill); polygonMeshesRef.current.push(fill); }
        }
        setPoints([]);
        setIsDrawing(false);
    };

    const clearCurrent = () => { setPoints([]); setIsDrawing(false); };
    const clearAll = () => {
        setPoints([]); setPolygons([]); setIsDrawing(false);
        polygonMeshesRef.current.forEach(m => sphereGroupRef.current?.remove(m));
        polygonMeshesRef.current = [];
    };

    const handlePlaneClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const nx = x / rect.width, ny = y / rect.height;
        let lat, lon;
        if (selectedProjection === 'mercator') {
            lon = nx * 360 - 180;
            lat = toDegrees(2 * Math.atan(Math.exp((0.5 - ny) * 2 * Math.PI)) - Math.PI / 2);
            lat = Math.max(-85, Math.min(85, lat));
        } else {
            lon = nx * 360 - 180;
            lat = 90 - ny * 180;
        }
        setPoints([...points, { lat: Math.round(lat * 1000) / 1000, lon: Math.round(lon * 1000) / 1000 }]);
        setIsDrawing(true);
    };

    const handlePlaneMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const nx = x / rect.width, ny = y / rect.height;
        let lat, lon;
        if (selectedProjection === 'mercator') {
            lon = nx * 360 - 180;
            lat = toDegrees(2 * Math.atan(Math.exp((0.5 - ny) * 2 * Math.PI)) - Math.PI / 2);
            lat = Math.max(-85, Math.min(85, lat));
        } else {
            lon = nx * 360 - 180;
            lat = 90 - ny * 180;
        }
        setMousePos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
        setMouseCoords({ lat: lat.toFixed(4), lon: lon.toFixed(4) });
    };

    // ===== CÁLCULOS =====
    const geodesicArea = calculateGeodesicArea(points);
    const perimeter = calculatePerimeter(points);
    const centroid = calculateCentroid(points);
    const currentProjectionInfo = PROJECTIONS.find(p => p.id === selectedProjection);
    const azimuths = points.length >= 2 ? points.slice(0, -1).map((p, i) => ({
        from: i + 1, to: i + 2,
        azimuth: calculateAzimuth(p.lat, p.lon, points[i + 1].lat, points[i + 1].lon),
        distance: vincentyDistance(p.lat, p.lon, points[i + 1].lat, points[i + 1].lon)
    })) : [];
    const utmCentroid = points.length > 0 ? latLonToUTM(centroid.lat, centroid.lon) : null;

    // ===== RENDERIZADO JSX =====
    return (
        <div style={{
            minHeight: '100vh',
            background: 'radial-gradient(ellipse at 50% 0%, #0d1a2d 0%, #050a12 50%, #000 100%)',
            fontFamily: "'Rajdhani', sans-serif",
            color: '#e0e8f0',
        }}>
            {/* Partículas de fondo */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                {[...Array(15)].map((_, i) => (
                    <div key={i} style={{
                        position: 'absolute', width: '2px', height: '2px', background: '#00f5ff', borderRadius: '50%',
                        left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                        animation: `float ${3 + Math.random() * 3}s ease-in-out infinite`,
                        animationDelay: `${Math.random() * 2}s`, opacity: 0.4, boxShadow: '0 0 8px #00f5ff',
                    }} />
                ))}
            </div>

            <div style={{ position: 'relative', zIndex: 1, padding: '10px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                {/* HEADER */}
                <header style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <h1 style={{ fontFamily: "'Orbitron'", fontSize: 'clamp(18px, 2.5vw, 32px)', fontWeight: 900, color: '#00f5ff', letterSpacing: '4px', margin: 0 }} className="neon-text">
                        SISTEMA DE PROYECCIONES CARTOGRÁFICAS
                    </h1>
                    <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #00f5ff, #ff006e, transparent)', marginTop: '4px', maxWidth: '700px', margin: '4px auto 0' }} />
                    <p style={{ color: 'rgba(0,245,255,0.7)', marginTop: '4px', fontSize: '10px', fontFamily: "'Share Tech Mono'", letterSpacing: '2px' }}>
                        CARTOGRAFÍA Y GEODESIA | INGENIERÍA GEOGRÁFICA
                    </p>
                    <p style={{ color: '#ff006e', marginTop: '2px', fontSize: '9px', fontFamily: "'Orbitron'", letterSpacing: '1px' }} className="neon-text">
                        ELABORADO POR: JOHN LEONARDO CABRERA ESPÍNDOLA
                    </p>
                </header>

                {/* GRID PRINCIPAL */}
                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 1fr', gap: '10px', flex: 1, minHeight: 0 }}>
                    {/* PANEL LATERAL */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                        {/* Pestañas */}
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                            {['control', 'geodesia', 'utm', 'teoria'].map(tab => (
                                <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                                    {tab.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* TAB CONTROL */}
                        {activeTab === 'control' && (
                            <div className="cyber-panel" style={{ padding: '12px', flex: 1 }}>
                                <h3 style={{ color: '#00f5ff', fontFamily: "'Orbitron'", fontSize: '11px', marginBottom: '10px', letterSpacing: '1px' }}>📍 CONTROL</h3>

                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ fontSize: '9px', color: 'rgba(0,245,255,0.6)', display: 'block', marginBottom: '4px' }}>PROYECCIÓN</label>
                                    <select className="cyber-select" value={selectedProjection} onChange={e => setSelectedProjection(e.target.value)}>
                                        {PROJECTIONS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <div style={{ fontSize: '8px', color: 'rgba(255,190,11,0.8)', marginTop: '2px' }}>{currentProjectionInfo?.type}</div>
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ fontSize: '9px', color: 'rgba(0,245,255,0.6)', display: 'block', marginBottom: '4px' }}>FORMATO</label>
                                    <select className="cyber-select" value={coordFormat} onChange={e => setCoordFormat(e.target.value)}>
                                        <option value="decimal">Grados Decimales</option>
                                        <option value="dms">Grados° Min' Seg"</option>
                                    </select>
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ fontSize: '9px', color: 'rgba(0,245,255,0.6)', display: 'block', marginBottom: '4px' }}>COLOR</label>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        {COLORS.map(c => (
                                            <button key={c.hex} className={`color-orb ${currentColor === c.hex ? 'active' : ''}`}
                                                style={{ background: `radial-gradient(circle at 30% 30%, ${c.hex}, ${c.hex}88)`, color: c.hex }}
                                                onClick={() => setCurrentColor(c.hex)} title={c.name} />
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ fontSize: '9px', color: 'rgba(0,245,255,0.6)', display: 'block', marginBottom: '4px' }}>COORDENADAS (WGS84)</label>
                                    
                                    {coordFormat === 'decimal' ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '6px' }}>
                                            <div>
                                                <div style={{ fontSize: '8px', color: 'rgba(0,245,255,0.5)', marginBottom: '2px' }}>LATITUD φ</div>
                                                <input type="number" className="cyber-input" value={inputLat} onChange={e => setInputLat(e.target.value)}
                                                    onKeyPress={e => e.key === 'Enter' && addPoint()} placeholder="-90 a 90" min="-90" max="90" step="0.0001" />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '8px', color: 'rgba(0,245,255,0.5)', marginBottom: '2px' }}>LONGITUD λ</div>
                                                <input type="number" className="cyber-input" value={inputLon} onChange={e => setInputLon(e.target.value)}
                                                    onKeyPress={e => e.key === 'Enter' && addPoint()} placeholder="-180 a 180" min="-180" max="180" step="0.0001" />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: '8px', color: 'rgba(0,245,255,0.5)', marginBottom: '2px' }}>LATITUD φ</div>
                                            <div style={{ display: 'flex', gap: '3px', marginBottom: '5px', alignItems: 'center' }}>
                                                <input type="number" className="cyber-input" value={inputDeg} onChange={e => setInputDeg(e.target.value)} placeholder="°" style={{ width: '50px' }} />
                                                <input type="number" className="cyber-input" value={inputMin} onChange={e => setInputMin(e.target.value)} placeholder="'" style={{ width: '45px' }} />
                                                <input type="number" className="cyber-input" value={inputSec} onChange={e => setInputSec(e.target.value)} placeholder='"' style={{ width: '55px' }} step="0.01" />
                                                <select className="cyber-select" value={inputNS} onChange={e => setInputNS(e.target.value)} style={{ width: '45px' }}>
                                                    <option value="N">N</option><option value="S">S</option>
                                                </select>
                                            </div>
                                            <div style={{ fontSize: '8px', color: 'rgba(0,245,255,0.5)', marginBottom: '2px' }}>LONGITUD λ</div>
                                            <div style={{ display: 'flex', gap: '3px', marginBottom: '5px', alignItems: 'center' }}>
                                                <input type="number" className="cyber-input" value={inputDegLon} onChange={e => setInputDegLon(e.target.value)} placeholder="°" style={{ width: '50px' }} />
                                                <input type="number" className="cyber-input" value={inputMinLon} onChange={e => setInputMinLon(e.target.value)} placeholder="'" style={{ width: '45px' }} />
                                                <input type="number" className="cyber-input" value={inputSecLon} onChange={e => setInputSecLon(e.target.value)} placeholder='"' style={{ width: '55px' }} step="0.01" />
                                                <select className="cyber-select" value={inputEW} onChange={e => setInputEW(e.target.value)} style={{ width: '45px' }}>
                                                    <option value="E">E</option><option value="W">W</option>
                                                </select>
                                            </div>
                                        </>
                                    )}
                                    <button className="cyber-btn cyber-btn-primary" onClick={addPoint} style={{ width: '100%' }}>⊕ AGREGAR VÉRTICE</button>
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '9px', color: 'rgba(0,245,255,0.6)' }}>VÉRTICES</span>
                                        <span style={{ color: currentColor, fontFamily: "'Orbitron'", fontSize: '13px' }}>{points.length}</span>
                                    </div>
                                    <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                                        {points.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '10px', color: 'rgba(0,245,255,0.3)', fontSize: '9px' }}>[ CLIC EN EL MAPA ]</div>
                                        ) : points.map((p, i) => (
                                            <div key={i} style={{ background: 'rgba(0,245,255,0.05)', borderLeft: `2px solid ${currentColor}`, padding: '4px 6px', marginBottom: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px' }}>
                                                <span style={{ color: currentColor, fontFamily: "'Orbitron'" }}>V{i + 1}</span>
                                                <span style={{ fontFamily: "'Share Tech Mono'" }}>{p.lat.toFixed(4)}°, {p.lon.toFixed(4)}°</span>
                                                <button onClick={() => setPoints(points.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#ff006e', cursor: 'pointer', fontSize: '12px' }}>×</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <button className="cyber-btn cyber-btn-primary" onClick={completePolygon} disabled={points.length < 3} style={{ opacity: points.length < 3 ? 0.4 : 1 }}>✓ COMPLETAR</button>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <button className="cyber-btn cyber-btn-danger" onClick={clearCurrent} style={{ flex: 1 }}>LIMPIAR</button>
                                        <button className="cyber-btn cyber-btn-danger" onClick={clearAll} style={{ flex: 1 }}>RESET</button>
                                    </div>
                                </div>

                                {polygons.length > 0 && (
                                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(0,245,255,0.2)' }}>
                                        <div style={{ fontSize: '9px', color: 'rgba(0,245,255,0.6)', marginBottom: '5px' }}>POLÍGONOS: {polygons.length}</div>
                                        {polygons.map((poly, i) => (
                                            <div key={poly.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 0', fontSize: '9px' }}>
                                                <div style={{ width: '8px', height: '8px', background: poly.color, borderRadius: '2px' }} />
                                                <span>POL-{String(i + 1).padStart(3, '0')}</span>
                                                <span style={{ marginLeft: 'auto', color: 'rgba(0,245,255,0.5)' }}>{poly.points.length} pts</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB GEODESIA */}
                        {activeTab === 'geodesia' && (
                            <div className="cyber-panel" style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
                                <h3 style={{ color: '#00ff88', fontFamily: "'Orbitron'", fontSize: '11px', marginBottom: '10px' }}>📐 GEODESIA</h3>

                                <div className="info-card">
                                    <h4>ELIPSOIDE WGS84</h4>
                                    <div className="data-row"><span className="data-label">Semieje Mayor (a)</span><span className="data-value">{WGS84.a.toLocaleString()} m</span></div>
                                    <div className="data-row"><span className="data-label">Semieje Menor (b)</span><span className="data-value">{WGS84.b.toFixed(3)} m</span></div>
                                    <div className="data-row"><span className="data-label">Achatamiento (f)</span><span className="data-value">1/{(1/WGS84.f).toFixed(6)}</span></div>
                                    <div className="data-row"><span className="data-label">Excentricidad (e)</span><span className="data-value">{WGS84.e.toFixed(10)}</span></div>
                                </div>

                                {points.length >= 3 && (
                                    <div className="info-card">
                                        <h4>MÉTRICAS DEL POLÍGONO</h4>
                                        <div className="data-row"><span className="data-label">Área Geodésica</span><span className="data-value">{formatNumber(geodesicArea)}</span></div>
                                        <div className="data-row"><span className="data-label">Perímetro</span><span className="data-value">{formatDistance(perimeter)}</span></div>
                                        <div className="data-row"><span className="data-label">Centroide φ</span><span className="data-value">{centroid.lat.toFixed(5)}°</span></div>
                                        <div className="data-row"><span className="data-label">Centroide λ</span><span className="data-value">{centroid.lon.toFixed(5)}°</span></div>
                                    </div>
                                )}

                                {points.length > 0 && (
                                    <div className="info-card">
                                        <h4>RADIOS DE CURVATURA</h4>
                                        <div className="data-row"><span className="data-label">R. Meridiano (M)</span><span className="data-value">{(radiusMeridian(centroid.lat)/1000).toFixed(3)} km</span></div>
                                        <div className="data-row"><span className="data-label">R. Primer Vertical (N)</span><span className="data-value">{(radiusPrimeVertical(centroid.lat)/1000).toFixed(3)} km</span></div>
                                    </div>
                                )}

                                {azimuths.length > 0 && (
                                    <div className="info-card">
                                        <h4>AZIMUTS Y RUMBOS</h4>
                                        {azimuths.map((a, i) => {
                                            const rumbo = azimuthToRumbo(a.azimuth);
                                            return (
                                                <div key={i} style={{ marginBottom: '6px', padding: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '2px' }}>
                                                    <div style={{ fontSize: '9px', color: '#00f5ff' }}>V{a.from} → V{a.to}</div>
                                                    <div className="data-row"><span className="data-label">Azimut</span><span className="data-value">{a.azimuth.toFixed(4)}°</span></div>
                                                    <div className="data-row"><span className="data-label">Rumbo</span><span className="data-value">{rumbo.quadrant} {rumbo.angle}°</span></div>
                                                    <div className="data-row"><span className="data-label">Distancia</span><span className="data-value">{formatDistance(a.distance)}</span></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB UTM */}
                        {activeTab === 'utm' && (
                            <div className="cyber-panel" style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
                                <h3 style={{ color: '#ffbe0b', fontFamily: "'Orbitron'", fontSize: '11px', marginBottom: '10px' }}>🗺️ COORDENADAS UTM</h3>

                                {utmCentroid && (
                                    <div className="info-card">
                                        <h4>UTM DEL CENTROIDE</h4>
                                        <div className="data-row"><span className="data-label">Zona</span><span className="data-value">{utmCentroid.zone}{utmCentroid.hemisphere}</span></div>
                                        <div className="data-row"><span className="data-label">Este (X)</span><span className="data-value">{utmCentroid.easting} m</span></div>
                                        <div className="data-row"><span className="data-label">Norte (Y)</span><span className="data-value">{utmCentroid.northing} m</span></div>
                                    </div>
                                )}

                                {points.length > 0 && (
                                    <div className="info-card">
                                        <h4>VÉRTICES EN UTM</h4>
                                        {points.map((p, i) => {
                                            const utm = latLonToUTM(p.lat, p.lon);
                                            return (
                                                <div key={i} style={{ marginBottom: '6px', padding: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '2px' }}>
                                                    <div style={{ fontSize: '9px', color: currentColor, marginBottom: '2px' }}>V{i + 1} - Zona {utm.zone}{utm.hemisphere}</div>
                                                    <div style={{ fontSize: '9px', fontFamily: "'Share Tech Mono'" }}>E: {utm.easting} m<br/>N: {utm.northing} m</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="info-card">
                                    <h4>SISTEMA UTM</h4>
                                    <p>Universal Transverse Mercator divide la Tierra en <span className="highlight">60 husos</span> de 6° cada uno.</p>
                                    <ul><li>Factor de escala: 0.9996</li><li>Falso Este: 500,000 m</li><li>Falso Norte (S): 10,000,000 m</li></ul>
                                </div>
                            </div>
                        )}

                        {/* TAB TEORÍA */}
                        {activeTab === 'teoria' && (
                            <div className="cyber-panel" style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
                                <h3 style={{ color: '#8b5cf6', fontFamily: "'Orbitron'", fontSize: '11px', marginBottom: '10px' }}>📚 TEORÍA</h3>

                                <div className="info-card">
                                    <h4>PROYECCIONES</h4>
                                    <p>Transformación de la superficie curva de la Tierra a un plano. <span className="warning">Toda proyección distorsiona</span>.</p>
                                </div>

                                <div className="info-card">
                                    <h4>PROPIEDADES</h4>
                                    <ul>
                                        <li><span className="success">Conformes:</span> Preservan ángulos</li>
                                        <li><span className="success">Equivalentes:</span> Preservan áreas</li>
                                        <li><span className="success">Equidistantes:</span> Preservan distancias</li>
                                    </ul>
                                </div>

                                <div className="info-card">
                                    <h4>LÍNEAS DE REFERENCIA</h4>
                                    <ul>
                                        <li><span style={{color: '#00ff88'}}>━</span> Ecuador (0°)</li>
                                        <li><span style={{color: '#ff006e'}}>━</span> Greenwich (0°)</li>
                                        <li><span style={{color: '#ffbe0b'}}>━</span> Trópicos (±23.5°)</li>
                                        <li><span style={{color: '#8b5cf6'}}>━</span> Polares (±66.5°)</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PLANO 2D */}
                    <div className="cyber-panel" style={{ padding: '10px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>🗺️</span>
                                <h2 style={{ fontFamily: "'Orbitron'", fontSize: '11px', color: '#00ff88', letterSpacing: '1px', margin: 0 }}>PROYECCIÓN 2D</h2>
                            </div>
                            <span style={{ fontSize: '8px', color: 'rgba(255,190,11,0.8)' }}>{currentProjectionInfo?.type}</span>
                        </div>
                        
                        <div className="plane-container" onClick={handlePlaneClick} onMouseMove={handlePlaneMouseMove} onMouseLeave={() => { setMousePos(null); setMouseCoords(null); }} style={{ flex: 1 }}>
                            <div style={{ position: 'absolute', top: '3px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', color: 'rgba(0,245,255,0.6)', fontFamily: "'Share Tech Mono'" }}>90°N</div>
                            <div style={{ position: 'absolute', bottom: '3px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', color: 'rgba(0,245,255,0.6)', fontFamily: "'Share Tech Mono'" }}>90°S</div>
                            <div style={{ position: 'absolute', left: '3px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', color: 'rgba(0,245,255,0.6)', fontFamily: "'Share Tech Mono'" }}>180°W</div>
                            <div style={{ position: 'absolute', right: '3px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', color: 'rgba(0,245,255,0.6)', fontFamily: "'Share Tech Mono'" }}>180°E</div>

                            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '2px', background: 'rgba(0,255,136,0.4)', pointerEvents: 'none' }} />
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '2px', background: 'rgba(255,0,110,0.3)', pointerEvents: 'none' }} />

                            {mousePos && (
                                <>
                                    <div className="crosshair" style={{ left: `${mousePos.x}%`, top: `${mousePos.y}%` }} />
                                    {mouseCoords && (
                                        <div className="coord-display" style={{ left: `calc(${mousePos.x}% + 15px)`, top: `calc(${mousePos.y}% - 8px)` }}>
                                            φ:{mouseCoords.lat}° λ:{mouseCoords.lon}°
                                        </div>
                                    )}
                                </>
                            )}

                            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                                <defs>
                                    {COLORS.map(c => (
                                        <filter key={c.hex} id={`glow-${c.hex.slice(1)}`}>
                                            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                                        </filter>
                                    ))}
                                </defs>
                                
                                {polygons.map(poly => (
                                    <polygon key={poly.id}
                                        points={poly.points.map(p => { const pos = projectPoint(p.lat, p.lon, selectedProjection, 100, 100); return `${pos.x}%,${pos.y}%`; }).join(' ')}
                                        fill={poly.color + '35'} stroke={poly.color} strokeWidth="2" filter={`url(#glow-${poly.color.slice(1)})`} />
                                ))}
                                
                                {points.length >= 2 && (
                                    <polygon
                                        points={points.map(p => { const pos = projectPoint(p.lat, p.lon, selectedProjection, 100, 100); return `${pos.x}%,${pos.y}%`; }).join(' ')}
                                        fill={points.length >= 3 ? currentColor + '28' : 'none'} stroke={currentColor} strokeWidth="2"
                                        strokeDasharray={points.length < 3 ? "6,3" : "0"} filter={`url(#glow-${currentColor.slice(1)})`} />
                                )}
                                
                                {points.map((p, i) => {
                                    const pos = projectPoint(p.lat, p.lon, selectedProjection, 100, 100);
                                    return (
                                        <g key={i}>
                                            <circle cx={`${pos.x}%`} cy={`${pos.y}%`} r="10" fill={currentColor} opacity="0.2" />
                                            <circle cx={`${pos.x}%`} cy={`${pos.y}%`} r="6" fill={currentColor} filter={`url(#glow-${currentColor.slice(1)})`} />
                                            <circle cx={`${pos.x}%`} cy={`${pos.y}%`} r="3" fill="#fff" />
                                            <text x={`${pos.x}%`} y={`${pos.y - 2}%`} fill={currentColor} fontSize="9" textAnchor="middle" fontFamily="Orbitron" fontWeight="bold">{i + 1}</text>
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '9px', color: 'rgba(0,245,255,0.5)', textAlign: 'center', fontFamily: "'Share Tech Mono'" }}>[ CLIC PARA AGREGAR VÉRTICES ]</div>
                    </div>

                    {/* ESFERA 3D */}
                    <div className="cyber-panel" style={{ padding: '10px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <span>🌐</span>
                            <h2 style={{ fontFamily: "'Orbitron'", fontSize: '11px', color: '#8b5cf6', letterSpacing: '1px', margin: 0 }}>ELIPSOIDE WGS84</h2>
                        </div>
                        
                        <div ref={sphereContainerRef} style={{ flex: 1, minHeight: '350px', borderRadius: '3px', overflow: 'hidden', background: 'radial-gradient(ellipse at center, #0a1628 0%, #000 100%)', border: '1px solid rgba(139,92,246,0.3)' }} />
                        
                        <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '8px', flexWrap: 'wrap' }}>
                            <span><span style={{color: '#00ff88'}}>━</span> Ecuador</span>
                            <span><span style={{color: '#ff006e'}}>━</span> Greenwich</span>
                            <span><span style={{color: '#ffbe0b'}}>━</span> Trópicos</span>
                            <span><span style={{color: '#8b5cf6'}}>━</span> Polares</span>
                        </div>
                        <div style={{ marginTop: '3px', fontSize: '9px', color: 'rgba(139,92,246,0.6)', textAlign: 'center', fontFamily: "'Share Tech Mono'" }}>[ ARRASTRAR: ROTAR | SCROLL: ZOOM ]</div>
                    </div>
                </div>

                {/* BARRA DE ESTADO */}
                <div className="cyber-panel" style={{ marginTop: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '9px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '5px', height: '5px', background: '#00ff88', borderRadius: '50%', boxShadow: '0 0 6px #00ff88', animation: 'pulse 2s infinite' }} />
                            <span style={{ color: 'rgba(0,245,255,0.6)' }}>ACTIVO</span>
                        </div>
                        <span style={{ color: '#00f5ff', fontFamily: "'Share Tech Mono'" }}>{new Date().toLocaleString('es-ES')}</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px', fontSize: '9px', fontFamily: "'Share Tech Mono'" }}>
                        <span style={{ color: 'rgba(0,245,255,0.6)' }}>PROY: <span style={{ color: '#00ff88' }}>{selectedProjection.toUpperCase()}</span></span>
                        <span style={{ color: 'rgba(0,245,255,0.6)' }}>V: <span style={{ color: currentColor }}>{points.length}</span></span>
                        <span style={{ color: 'rgba(0,245,255,0.6)' }}>POL: <span style={{ color: '#00ff88' }}>{polygons.length}</span></span>
                        {points.length >= 3 && <span style={{ color: 'rgba(0,245,255,0.6)' }}>ÁREA: <span style={{ color: '#ffbe0b' }}>{formatNumber(geodesicArea)}</span></span>}
                    </div>

                    <div style={{ fontSize: '8px', color: 'rgba(255,0,110,0.7)', fontFamily: "'Orbitron'" }}>
                        © 2024 JOHN LEONARDO CABRERA ESPÍNDOLA | ING. GEOGRÁFICA
                    </div>
                </div>
            </div>
        </div>
    );
};

// ===== INICIALIZACIÓN =====
ReactDOM.createRoot(document.getElementById('root')).render(<PolygonDrawer />);
