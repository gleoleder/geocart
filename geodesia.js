/* ============================================
   FUNCIONES GEODÉSICAS
   Archivo: js/geodesia.js
   
   Este archivo contiene todas las funciones
   para realizar cálculos geodésicos:
   - Conversión de coordenadas
   - Distancia geodésica (Vincenty)
   - Área geodésica
   - Azimut y rumbo
   - Radios de curvatura
   - Conversión a UTM
   
   Elaborado por: John Leonardo Cabrera Espíndola
============================================ */

/* ============================================
   FUNCIONES DE CONVERSIÓN DE ÁNGULOS
============================================ */

/**
 * Convierte grados a radianes
 * 
 * Los cálculos trigonométricos en JavaScript requieren
 * ángulos en radianes, no en grados.
 * 
 * Fórmula: radianes = grados × (π / 180)
 * 
 * @param {number} deg - Ángulo en grados
 * @returns {number} - Ángulo en radianes
 * 
 * @example
 * toRadians(180) // Devuelve π (3.14159...)
 * toRadians(90)  // Devuelve π/2 (1.5708...)
 */
const toRadians = (deg) => deg * Math.PI / 180;

/**
 * Convierte radianes a grados
 * 
 * Función inversa de toRadians.
 * 
 * Fórmula: grados = radianes × (180 / π)
 * 
 * @param {number} rad - Ángulo en radianes
 * @returns {number} - Ángulo en grados
 * 
 * @example
 * toDegrees(Math.PI)   // Devuelve 180
 * toDegrees(Math.PI/2) // Devuelve 90
 */
const toDegrees = (rad) => rad * 180 / Math.PI;

/* ============================================
   CONVERSIÓN DMS ↔ DECIMAL
============================================ */

/**
 * Convierte coordenadas en formato DMS a decimal
 * 
 * DMS = Degrees, Minutes, Seconds (Grados, Minutos, Segundos)
 * Formato común en cartografía: 41° 24' 12.2" N
 * 
 * Fórmula: decimal = grados + (minutos / 60) + (segundos / 3600)
 * 
 * @param {number} deg - Grados (parte entera)
 * @param {number} min - Minutos (0-60)
 * @param {number} sec - Segundos (0-60, puede tener decimales)
 * @param {string} direction - Dirección: 'N', 'S', 'E' o 'W'
 * @returns {number} - Coordenada en grados decimales
 * 
 * @example
 * dmsToDecimal(41, 24, 12.2, 'N') // Devuelve 41.40339
 * dmsToDecimal(41, 24, 12.2, 'S') // Devuelve -41.40339
 */
const dmsToDecimal = (deg, min, sec, direction) => {
    // Calculamos el valor absoluto de los grados decimales
    let decimal = Math.abs(parseFloat(deg) || 0) + 
                  (parseFloat(min) || 0) / 60 + 
                  (parseFloat(sec) || 0) / 3600;
    
    // Si la dirección es Sur o Oeste, el valor es negativo
    // Por convención: Norte y Este son positivos, Sur y Oeste son negativos
    if (direction === 'S' || direction === 'W') {
        decimal = -decimal;
    }
    
    return decimal;
};

/**
 * Convierte coordenadas decimales a formato DMS
 * 
 * Función inversa de dmsToDecimal.
 * 
 * @param {number} decimal - Coordenada en grados decimales
 * @returns {object} - Objeto con { deg, min, sec }
 * 
 * @example
 * decimalToDMS(41.40339) // Devuelve { deg: 41, min: 24, sec: '12.20' }
 */
const decimalToDMS = (decimal) => {
    // Trabajamos con el valor absoluto
    const abs = Math.abs(decimal);
    
    // Los grados son la parte entera
    const deg = Math.floor(abs);
    
    // Los minutos son la parte decimal convertida a minutos
    const minFloat = (abs - deg) * 60;
    const min = Math.floor(minFloat);
    
    // Los segundos son la parte decimal de los minutos convertida a segundos
    const sec = (minFloat - min) * 60;
    
    return { 
        deg, 
        min, 
        sec: sec.toFixed(2)  // Limitamos a 2 decimales
    };
};

/* ============================================
   DISTANCIA GEODÉSICA (FÓRMULA DE VINCENTY)
============================================ */

/**
 * Calcula la distancia geodésica entre dos puntos usando la fórmula de Vincenty
 * 
 * La fórmula de Vincenty es uno de los métodos más precisos para calcular
 * distancias sobre un elipsoide. Fue desarrollada por Thaddeus Vincenty en 1975.
 * 
 * A diferencia de la fórmula de Haversine (que asume una Tierra esférica),
 * Vincenty considera el achatamiento de la Tierra, dando resultados más precisos.
 * 
 * Precisión: ~0.5mm en cualquier distancia
 * 
 * @param {number} lat1 - Latitud del punto 1 (grados)
 * @param {number} lon1 - Longitud del punto 1 (grados)
 * @param {number} lat2 - Latitud del punto 2 (grados)
 * @param {number} lon2 - Longitud del punto 2 (grados)
 * @returns {number} - Distancia en metros
 * 
 * @example
 * // Distancia entre Madrid y Barcelona
 * vincentyDistance(40.4168, -3.7038, 41.3851, 2.1734) // ≈ 504,645 metros
 */
const vincentyDistance = (lat1, lon1, lat2, lon2) => {
    // Convertimos las latitudes a radianes
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    
    // Diferencia de longitud en radianes
    const L = toRadians(lon2 - lon1);
    
    // Calculamos las latitudes reducidas (parametric latitude)
    // Esto transforma las latitudes geodésicas en latitudes que
    // funcionan mejor con la geometría del elipsoide
    const tanU1 = (1 - WGS84.f) * Math.tan(φ1);
    const cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1);
    const sinU1 = tanU1 * cosU1;
    
    const tanU2 = (1 - WGS84.f) * Math.tan(φ2);
    const cosU2 = 1 / Math.sqrt(1 + tanU2 * tanU2);
    const sinU2 = tanU2 * cosU2;
    
    // Iniciamos la iteración
    // λ es la diferencia de longitud en el elipsoide auxiliar
    let λ = L;
    let λʹ;  // Valor anterior de λ
    let iterLimit = 100;  // Límite de iteraciones para evitar bucles infinitos
    
    // Variables que se calcularán en cada iteración
    let sinσ, cosσ, σ, sinα, cos2α, cos2σm;
    
    // Proceso iterativo para resolver las ecuaciones de Vincenty
    // Este bucle converge muy rápidamente (típicamente 2-4 iteraciones)
    do {
        const sinλ = Math.sin(λ);
        const cosλ = Math.cos(λ);
        
        // Calculamos el seno del ángulo σ (distancia angular)
        sinσ = Math.sqrt(
            (cosU2 * sinλ) ** 2 + 
            (cosU1 * sinU2 - sinU1 * cosU2 * cosλ) ** 2
        );
        
        // Si los puntos son coincidentes, la distancia es 0
        if (sinσ === 0) return 0;
        
        // Calculamos el coseno del ángulo σ
        cosσ = sinU1 * sinU2 + cosU1 * cosU2 * cosλ;
        
        // El ángulo σ es la distancia angular entre los puntos
        σ = Math.atan2(sinσ, cosσ);
        
        // Azimut del punto medio al Ecuador
        sinα = cosU1 * cosU2 * sinλ / sinσ;
        
        // Coseno al cuadrado del azimut
        cos2α = 1 - sinα ** 2;
        
        // Punto medio del arco geodésico
        cos2σm = cos2α !== 0 ? cosσ - 2 * sinU1 * sinU2 / cos2α : 0;
        
        // Factor de corrección
        const C = WGS84.f / 16 * cos2α * (4 + WGS84.f * (4 - 3 * cos2α));
        
        // Guardamos el valor anterior
        λʹ = λ;
        
        // Nueva aproximación de λ
        λ = L + (1 - C) * WGS84.f * sinα * (
            σ + C * sinσ * (
                cos2σm + C * cosσ * (-1 + 2 * cos2σm ** 2)
            )
        );
        
    // Continuamos hasta que la diferencia sea muy pequeña (convergencia)
    } while (Math.abs(λ - λʹ) > 1e-12 && --iterLimit > 0);
    
    // Calculamos la distancia usando las fórmulas finales de Vincenty
    const u2 = cos2α * (WGS84.a ** 2 - WGS84.b ** 2) / (WGS84.b ** 2);
    
    // Coeficiente A (factor de escala)
    const A = 1 + u2 / 16384 * (4096 + u2 * (-768 + u2 * (320 - 175 * u2)));
    
    // Coeficiente B (corrección de la distancia)
    const B = u2 / 1024 * (256 + u2 * (-128 + u2 * (74 - 47 * u2)));
    
    // Corrección Δσ
    const Δσ = B * sinσ * (
        cos2σm + B / 4 * (
            cosσ * (-1 + 2 * cos2σm ** 2) - 
            B / 6 * cos2σm * (-3 + 4 * sinσ ** 2) * (-3 + 4 * cos2σm ** 2)
        )
    );
    
    // Distancia final en metros
    // s = b × A × (σ - Δσ)
    return WGS84.b * A * (σ - Δσ);
};

/* ============================================
   ÁREA GEODÉSICA
============================================ */

/**
 * Calcula el área geodésica de un polígono esférico
 * 
 * Utiliza la fórmula de exceso esférico (spherical excess)
 * para calcular el área de un polígono sobre una esfera.
 * 
 * Esta es una aproximación que asume una esfera con el
 * radio medio de la Tierra. Para mayor precisión en
 * áreas grandes, se usarían fórmulas elipsoidales.
 * 
 * @param {Array} pts - Array de puntos [{lat, lon}, ...]
 * @returns {number} - Área en metros cuadrados
 * 
 * @example
 * const polygon = [
 *   { lat: 0, lon: 0 },
 *   { lat: 0, lon: 10 },
 *   { lat: 10, lon: 10 },
 *   { lat: 10, lon: 0 }
 * ];
 * calculateGeodesicArea(polygon) // ≈ 1,233,472,000,000 m² (≈1.23 millones km²)
 */
const calculateGeodesicArea = (pts) => {
    // Se necesitan al menos 3 puntos para formar un polígono
    if (pts.length < 3) return 0;
    
    let area = 0;
    const n = pts.length;
    
    // Aplicamos la fórmula de Shoelace adaptada para coordenadas esféricas
    // También conocida como fórmula de Girard
    for (let i = 0; i < n; i++) {
        // Índice del siguiente punto (circular)
        const j = (i + 1) % n;
        
        // Convertimos latitudes a radianes
        const lat1 = toRadians(pts[i].lat);
        const lat2 = toRadians(pts[j].lat);
        
        // Diferencia de longitud en radianes
        const dLon = toRadians(pts[j].lon - pts[i].lon);
        
        // Sumamos la contribución de este segmento
        // Esta fórmula viene de la integración del área bajo una geodésica
        area += dLon * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    
    // El área es proporcional al cuadrado del radio
    // Usamos el semieje mayor del WGS84
    // Dividimos entre 2 porque la fórmula da el doble del área
    return Math.abs(area * WGS84.a * WGS84.a / 2);
};

/**
 * Calcula el perímetro de un polígono
 * 
 * Suma las distancias geodésicas entre todos los
 * vértices consecutivos, incluyendo el cierre
 * del último al primer vértice.
 * 
 * @param {Array} pts - Array de puntos [{lat, lon}, ...]
 * @returns {number} - Perímetro en metros
 */
const calculatePerimeter = (pts) => {
    // Se necesitan al menos 2 puntos
    if (pts.length < 2) return 0;
    
    let perimeter = 0;
    
    // Sumamos las distancias entre puntos consecutivos
    for (let i = 0; i < pts.length; i++) {
        // El siguiente punto (circular: después del último viene el primero)
        const j = (i + 1) % pts.length;
        
        // Sumamos la distancia entre el punto i y el j
        perimeter += vincentyDistance(
            pts[i].lat, pts[i].lon, 
            pts[j].lat, pts[j].lon
        );
    }
    
    return perimeter;
};

/**
 * Calcula el centroide (centro geométrico) de un polígono
 * 
 * Para coordenadas geográficas, un promedio simple de las
 * coordenadas da una buena aproximación para polígonos pequeños.
 * 
 * NOTA: Para polígonos muy grandes o cerca de los polos,
 * se necesitarían métodos más sofisticados.
 * 
 * @param {Array} pts - Array de puntos [{lat, lon}, ...]
 * @returns {object} - Centroide {lat, lon}
 */
const calculateCentroid = (pts) => {
    if (pts.length === 0) return { lat: 0, lon: 0 };
    
    let sumLat = 0;
    let sumLon = 0;
    
    // Sumamos todas las coordenadas
    pts.forEach(p => {
        sumLat += p.lat;
        sumLon += p.lon;
    });
    
    // El centroide es el promedio
    return { 
        lat: sumLat / pts.length, 
        lon: sumLon / pts.length 
    };
};

/* ============================================
   RADIOS DE CURVATURA
============================================ */

/**
 * Calcula el radio de curvatura meridiana (M)
 * 
 * El radio de curvatura meridiana es el radio del círculo
 * osculador (el círculo que mejor se ajusta a la curva)
 * en la dirección Norte-Sur.
 * 
 * Fórmula: M = a(1-e²) / (1-e²sin²φ)^(3/2)
 * 
 * Este radio varía con la latitud:
 * - Es menor en el ecuador (~6,336 km)
 * - Es mayor en los polos (~6,400 km)
 * 
 * @param {number} lat - Latitud en grados
 * @returns {number} - Radio en metros
 */
const radiusMeridian = (lat) => {
    const sinLat = Math.sin(toRadians(lat));
    
    // Aplicamos la fórmula del radio de curvatura meridiana
    return WGS84.a * (1 - WGS84.e2) / Math.pow(1 - WGS84.e2 * sinLat * sinLat, 1.5);
};

/**
 * Calcula el radio de curvatura en el primer vertical (N)
 * 
 * El radio de curvatura en el primer vertical (también llamado
 * "gran normal") es el radio del círculo osculador en la
 * dirección Este-Oeste.
 * 
 * Fórmula: N = a / sqrt(1-e²sin²φ)
 * 
 * Este radio también varía con la latitud:
 * - Es el semieje mayor (a) en el ecuador
 * - Es mayor que M en cualquier latitud
 * 
 * @param {number} lat - Latitud en grados
 * @returns {number} - Radio en metros
 */
const radiusPrimeVertical = (lat) => {
    const sinLat = Math.sin(toRadians(lat));
    
    // Aplicamos la fórmula del radio de curvatura del primer vertical
    return WGS84.a / Math.sqrt(1 - WGS84.e2 * sinLat * sinLat);
};

/* ============================================
   AZIMUT Y RUMBO
============================================ */

/**
 * Calcula el azimut geodésico entre dos puntos
 * 
 * El azimut es el ángulo medido en el sentido de las agujas
 * del reloj desde el Norte hasta la dirección del punto destino.
 * 
 * Rango: 0° a 360°
 * - 0° / 360° = Norte
 * - 90° = Este
 * - 180° = Sur
 * - 270° = Oeste
 * 
 * @param {number} lat1 - Latitud del punto origen (grados)
 * @param {number} lon1 - Longitud del punto origen (grados)
 * @param {number} lat2 - Latitud del punto destino (grados)
 * @param {number} lon2 - Longitud del punto destino (grados)
 * @returns {number} - Azimut en grados (0-360)
 */
const calculateAzimuth = (lat1, lon1, lat2, lon2) => {
    // Convertimos a radianes
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δλ = toRadians(lon2 - lon1);
    
    // Calculamos los componentes del azimut
    // y: componente en dirección Este
    const y = Math.sin(Δλ) * Math.cos(φ2);
    
    // x: componente en dirección Norte
    const x = Math.cos(φ1) * Math.sin(φ2) - 
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    
    // El azimut es el ángulo entre estos componentes
    let azimuth = toDegrees(Math.atan2(y, x));
    
    // Normalizamos al rango 0-360
    if (azimuth < 0) {
        azimuth += 360;
    }
    
    return azimuth;
};

/**
 * Convierte un azimut a rumbo por cuadrantes
 * 
 * El rumbo es una forma alternativa de expresar direcciones,
 * usando los cuadrantes NE, SE, SW, NW.
 * 
 * Por ejemplo:
 * - Azimut 45° = N 45° E (o NE 45°)
 * - Azimut 135° = S 45° E (o SE 45°)
 * - Azimut 225° = S 45° W (o SW 45°)
 * - Azimut 315° = N 45° W (o NW 45°)
 * 
 * @param {number} azimuth - Azimut en grados (0-360)
 * @returns {object} - { quadrant: 'NE'|'SE'|'SW'|'NW', angle: string }
 */
const azimuthToRumbo = (azimuth) => {
    // Primer cuadrante: 0° a 90° (NE)
    if (azimuth >= 0 && azimuth < 90) {
        return { 
            quadrant: 'NE', 
            angle: azimuth.toFixed(2) 
        };
    }
    
    // Segundo cuadrante: 90° a 180° (SE)
    // El ángulo se mide desde el Sur hacia el Este
    if (azimuth >= 90 && azimuth < 180) {
        return { 
            quadrant: 'SE', 
            angle: (180 - azimuth).toFixed(2) 
        };
    }
    
    // Tercer cuadrante: 180° a 270° (SW)
    // El ángulo se mide desde el Sur hacia el Oeste
    if (azimuth >= 180 && azimuth < 270) {
        return { 
            quadrant: 'SW', 
            angle: (azimuth - 180).toFixed(2) 
        };
    }
    
    // Cuarto cuadrante: 270° a 360° (NW)
    // El ángulo se mide desde el Norte hacia el Oeste
    return { 
        quadrant: 'NW', 
        angle: (360 - azimuth).toFixed(2) 
    };
};

/* ============================================
   CONVERSIÓN A COORDENADAS UTM
============================================ */

/**
 * Convierte coordenadas geográficas (lat/lon) a UTM
 * 
 * UTM (Universal Transverse Mercator) es un sistema de
 * coordenadas proyectadas que divide la Tierra en 60 husos
 * de 6° de longitud cada uno.
 * 
 * Las coordenadas UTM se expresan en metros:
 * - Easting (E): distancia hacia el Este desde el meridiano central
 * - Northing (N): distancia hacia el Norte desde el Ecuador
 * 
 * Para evitar coordenadas negativas:
 * - Se suma un "falso easting" de 500,000 m
 * - En el hemisferio sur, se suma un "falso northing" de 10,000,000 m
 * 
 * @param {number} lat - Latitud en grados (-80° a 84°)
 * @param {number} lon - Longitud en grados (-180° a 180°)
 * @returns {object} - { zone, hemisphere, easting, northing }
 */
const latLonToUTM = (lat, lon) => {
    // Calculamos el número de zona UTM
    // Cada zona tiene 6° de ancho, empezando en -180°
    const zone = Math.floor((lon + 180) / 6) + 1;
    
    // Meridiano central de la zona
    // Es el punto medio de la zona, donde la distorsión es mínima
    const lonOrigin = (zone - 1) * 6 - 180 + 3;
    
    // Convertimos a radianes
    const latRad = toRadians(lat);
    const lonRad = toRadians(lon);
    const lonOriginRad = toRadians(lonOrigin);
    
    // Calculamos N (radio de curvatura en el primer vertical)
    const N = WGS84.a / Math.sqrt(1 - WGS84.e2 * Math.sin(latRad) ** 2);
    
    // T = tan²(latitud)
    const T = Math.tan(latRad) ** 2;
    
    // C = e'² × cos²(latitud)
    // Donde e'² es la segunda excentricidad al cuadrado
    const C = WGS84.ep2 * Math.cos(latRad) ** 2;
    
    // A = diferencia de longitud × cos(latitud)
    const A = Math.cos(latRad) * (lonRad - lonOriginRad);
    
    // M = longitud del arco del meridiano desde el Ecuador
    // Esta es la distancia a lo largo del meridiano desde el Ecuador
    // hasta la latitud dada
    const M = WGS84.a * (
        (1 - WGS84.e2/4 - 3*WGS84.e2**2/64 - 5*WGS84.e2**3/256) * latRad
        - (3*WGS84.e2/8 + 3*WGS84.e2**2/32 + 45*WGS84.e2**3/1024) * Math.sin(2*latRad)
        + (15*WGS84.e2**2/256 + 45*WGS84.e2**3/1024) * Math.sin(4*latRad)
        - (35*WGS84.e2**3/3072) * Math.sin(6*latRad)
    );
    
    // Factor de escala central (k0)
    // UTM usa 0.9996 para minimizar la distorsión en toda la zona
    const k0 = 0.9996;
    
    // Calculamos el Easting (coordenada X)
    // Se suma 500,000 m (falso easting) para evitar valores negativos
    let easting = k0 * N * (
        A + 
        (1 - T + C) * A**3 / 6 + 
        (5 - 18*T + T**2 + 72*C - 58*WGS84.ep2) * A**5 / 120
    ) + 500000;
    
    // Calculamos el Northing (coordenada Y)
    let northing = k0 * (
        M + N * Math.tan(latRad) * (
            A**2 / 2 + 
            (5 - T + 9*C + 4*C**2) * A**4 / 24 + 
            (61 - 58*T + T**2 + 600*C - 330*WGS84.ep2) * A**6 / 720
        )
    );
    
    // En el hemisferio sur, sumamos el falso northing
    // para evitar coordenadas negativas
    if (lat < 0) {
        northing += 10000000;
    }
    
    // Determinamos el hemisferio
    const hemisphere = lat >= 0 ? 'N' : 'S';
    
    return { 
        zone,                           // Número de zona (1-60)
        hemisphere,                     // 'N' o 'S'
        easting: easting.toFixed(2),   // Metros hacia el Este
        northing: northing.toFixed(2)  // Metros hacia el Norte
    };
};

/**
 * Calcula el factor de escala de una proyección en una latitud dada
 * 
 * El factor de escala indica cuánto se distorsionan las distancias
 * en la proyección comparadas con las distancias reales.
 * 
 * - k = 1: sin distorsión
 * - k > 1: las distancias están ampliadas
 * - k < 1: las distancias están reducidas
 * 
 * @param {number} lat - Latitud en grados
 * @param {string} projection - ID de la proyección
 * @returns {number} - Factor de escala
 */
const getScaleFactor = (lat, projection) => {
    const latRad = toRadians(Math.abs(lat));
    
    switch(projection) {
        case 'mercator':
            // En Mercator, el factor de escala es secante(latitud)
            // Tiende a infinito en los polos
            return 1 / Math.cos(latRad);
            
        case 'lambert':
            // Similar a Mercator para la proyección cilíndrica de Lambert
            return 1 / Math.cos(latRad);
            
        default:
            // Para proyecciones equidistantes, el factor es 1
            return 1;
    }
};

/* ============================================
   FUNCIONES DE FORMATO
============================================ */

/**
 * Formatea un número grande de área a una cadena legible
 * 
 * @param {number} num - Área en metros cuadrados
 * @returns {string} - Área formateada con unidades
 */
const formatNumber = (num) => {
    // Si es mayor que mil millones de m², mostramos en km²
    if (num >= 1e9) {
        return (num / 1e9).toFixed(3) + ' km²';
    }
    // Si es mayor que un millón de m², mostramos en km²
    if (num >= 1e6) {
        return (num / 1e6).toFixed(3) + ' km²';
    }
    // Si es menor, mostramos en m²
    return num.toFixed(2) + ' m²';
};

/**
 * Formatea una distancia a una cadena legible
 * 
 * @param {number} m - Distancia en metros
 * @returns {string} - Distancia formateada con unidades
 */
const formatDistance = (m) => {
    // Si es mayor que 1 km, mostramos en km
    if (m >= 1000) {
        return (m / 1000).toFixed(3) + ' km';
    }
    // Si es menor, mostramos en metros
    return m.toFixed(2) + ' m';
};
