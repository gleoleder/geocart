/* ============================================
   PROYECCIONES CARTOGRÁFICAS
   Archivo: js/projections.js
   
   Este archivo contiene las funciones para
   transformar coordenadas geográficas (lat/lon)
   a coordenadas en el plano (x/y) según
   diferentes proyecciones cartográficas.
   
   Las proyecciones implementadas son:
   - Equirectangular (Plate Carrée)
   - Mercator
   - Mollweide
   - Sinusoidal
   - Robinson
   - Lambert Cilíndrica
   
   Elaborado por: John Leonardo Cabrera Espíndola
============================================ */

/**
 * Proyecta un punto geográfico al plano según la proyección seleccionada
 * 
 * Esta es la función principal de proyección. Recibe coordenadas
 * geográficas (latitud y longitud) y las transforma a coordenadas
 * cartesianas (x, y) en porcentaje del área de visualización.
 * 
 * @param {number} lat - Latitud en grados (-90 a 90)
 * @param {number} lon - Longitud en grados (-180 a 180)
 * @param {string} projection - ID de la proyección a usar
 * @param {number} width - Ancho del área de proyección (normalmente 100 para porcentaje)
 * @param {number} height - Alto del área de proyección (normalmente 100 para porcentaje)
 * @returns {object} - Coordenadas proyectadas { x, y } en porcentaje
 */
const projectPoint = (lat, lon, projection, width, height) => {
    // Convertimos las coordenadas a radianes para los cálculos trigonométricos
    const latRad = toRadians(lat);
    const lonRad = toRadians(lon);
    
    // Variables para las coordenadas proyectadas
    let x, y;

    // Aplicamos la proyección correspondiente
    switch(projection) {
        
        /* ============================================
           PROYECCIÓN MERCATOR
           
           Tipo: Cilíndrica Conforme
           Propiedades: Preserva ángulos (conforme)
           Inventada por: Gerardus Mercator (1569)
           
           Es la proyección más famosa. Las líneas de rumbo
           constante (loxodrómicas) aparecen como líneas rectas,
           lo que la hace ideal para navegación.
           
           PROBLEMA: Las áreas se distorsionan enormemente
           cerca de los polos. Groenlandia parece del tamaño
           de África cuando en realidad es 14 veces menor.
           
           Fórmulas:
           x = λ (normalizado)
           y = ln(tan(π/4 + φ/2))
        ============================================ */
        case 'mercator':
            // X es proporcional a la longitud
            x = (lon + 180) / 360;
            
            // Limitamos la latitud máxima a 85° para evitar infinitos
            // (la fórmula tiende a infinito en los polos)
            const maxLat = 85;
            const clampedLat = Math.max(-maxLat, Math.min(maxLat, lat));
            
            // Y usa una transformación logarítmica
            // Esta fórmula "estira" las latitudes altas
            y = 0.5 - Math.log(
                Math.tan(Math.PI / 4 + toRadians(clampedLat) / 2)
            ) / (2 * Math.PI);
            break;
        
        /* ============================================
           PROYECCIÓN MOLLWEIDE
           
           Tipo: Pseudocilíndrica Equivalente
           Propiedades: Preserva áreas
           Inventada por: Karl Mollweide (1805)
           
           La Tierra aparece como una elipse con ejes 2:1.
           Los paralelos son líneas rectas horizontales.
           Los meridianos son curvas elípticas.
           
           Ideal para mapas mundiales que muestren
           distribución de datos donde el área importa.
           
           Fórmulas:
           x = (2√2/π) × λ × cos(θ)
           y = √2 × sin(θ)
           Donde θ se obtiene resolviendo: 2θ + sin(2θ) = π×sin(φ)
        ============================================ */
        case 'mollweide':
            // Primero resolvemos la ecuación para θ (iterativamente)
            // Usamos el método de Newton-Raphson
            let theta = latRad;  // Valor inicial
            
            // 10 iteraciones son suficientes para convergencia
            for(let i = 0; i < 10; i++) {
                // La ecuación es: 2θ + sin(2θ) = π×sin(φ)
                // Derivada: 2 + 2cos(2θ)
                theta = theta - (
                    2 * theta + Math.sin(2 * theta) - Math.PI * Math.sin(latRad)
                ) / (2 + 2 * Math.cos(2 * theta));
            }
            
            // Aplicamos las fórmulas de Mollweide
            // Normalizamos para que quede en el rango 0-1
            x = 0.5 + (lonRad / Math.PI) * Math.cos(theta) * 0.4;
            y = 0.5 - Math.sin(theta) * 0.45;
            break;
        
        /* ============================================
           PROYECCIÓN SINUSOIDAL
           
           Tipo: Pseudocilíndrica Equivalente
           Propiedades: Preserva áreas
           También conocida como: Sanson-Flamsteed
           
           Los paralelos son líneas rectas horizontales
           equiespaciadas. Los meridianos son curvas
           senoidales (de ahí el nombre).
           
           El meridiano central y el Ecuador son los
           únicos elementos lineales sin distorsión.
           
           Fórmulas:
           x = λ × cos(φ)
           y = φ
        ============================================ */
        case 'sinusoidal':
            // X se escala por el coseno de la latitud
            // Esto hace que los meridianos se curven hacia los polos
            x = 0.5 + (lonRad * Math.cos(latRad)) / Math.PI * 0.45;
            
            // Y es directamente proporcional a la latitud
            y = 0.5 - latRad / Math.PI * 0.9;
            break;
        
        /* ============================================
           PROYECCIÓN ROBINSON
           
           Tipo: Pseudocilíndrica de Compromiso
           Propiedades: Ni conforme ni equivalente
           Inventada por: Arthur Robinson (1963)
           
           Esta proyección fue diseñada para "verse bien"
           sin priorizar ninguna propiedad matemática.
           Busca un equilibrio entre distorsión de
           formas y áreas.
           
           Muy usada en mapas mundiales educativos
           y por National Geographic.
           
           Las fórmulas usan tablas de interpolación
           creadas empíricamente por Robinson.
        ============================================ */
        case 'robinson':
            // Valor absoluto de la latitud para la tabla
            const absLat = Math.abs(lat);
            
            // Tabla de Robinson con valores empíricos
            // Cada fila: [latitud, factor_longitud, factor_latitud]
            const robinsonTable = [
                [0, 1.0000, 0.0000],   // Ecuador
                [5, 0.9986, 0.0620],
                [10, 0.9954, 0.1240],
                [15, 0.9900, 0.1860],
                [20, 0.9822, 0.2480],
                [25, 0.9730, 0.3100],
                [30, 0.9600, 0.3720],
                [35, 0.9427, 0.4340],
                [40, 0.9216, 0.4958],
                [45, 0.8962, 0.5571],
                [50, 0.8679, 0.6176],
                [55, 0.8350, 0.6769],
                [60, 0.7986, 0.7346],
                [65, 0.7597, 0.7903],
                [70, 0.7186, 0.8435],
                [75, 0.6732, 0.8936],
                [80, 0.6213, 0.9394],
                [85, 0.5722, 0.9761],
                [90, 0.5322, 1.0000]   // Polo
            ];
            
            // Encontramos el índice en la tabla (cada 5°)
            let idx = Math.floor(absLat / 5);
            if (idx >= robinsonTable.length - 1) {
                idx = robinsonTable.length - 2;
            }
            
            // Interpolamos linealmente entre los valores de la tabla
            const t = (absLat - robinsonTable[idx][0]) / 5;
            
            // plen: factor de longitud (cuánto se comprime la longitud)
            const plen = robinsonTable[idx][1] * (1 - t) + 
                        robinsonTable[idx + 1][1] * t;
            
            // pdfe: factor de latitud (distancia desde el ecuador)
            const pdfe = robinsonTable[idx][2] * (1 - t) + 
                        robinsonTable[idx + 1][2] * t;
            
            // Aplicamos los factores
            x = 0.5 + (lon / 180) * plen * 0.45;
            
            // El signo depende del hemisferio
            y = 0.5 - (lat < 0 ? -1 : 1) * pdfe * 0.45;
            break;
        
        /* ============================================
           PROYECCIÓN LAMBERT CILÍNDRICA
           
           Tipo: Cilíndrica Equivalente
           Propiedades: Preserva áreas
           Inventada por: Johann Heinrich Lambert (1772)
           
           Similar a la equirectangular pero preserva áreas.
           Los paralelos se comprimen hacia los polos
           para mantener la equivalencia de áreas.
           
           Fórmulas:
           x = λ
           y = sin(φ)
        ============================================ */
        case 'lambert':
            // X es igual que en la equirectangular
            x = (lon + 180) / 360;
            
            // Y usa el seno de la latitud
            // Esto comprime los paralelos hacia los polos
            y = 0.5 - Math.sin(latRad) * 0.5;
            break;
        
        /* ============================================
           PROYECCIÓN EQUIRECTANGULAR (Plate Carrée)
           
           Tipo: Cilíndrica Equidistante
           Propiedades: Equidistante en meridianos
           
           La proyección más simple posible:
           las coordenadas geográficas se mapean
           directamente a coordenadas cartesianas.
           
           Fórmulas:
           x = λ
           y = φ
           
           Esta es la proyección por defecto.
        ============================================ */
        default:  // 'equirectangular'
            // Mapeo directo de longitud a X
            // -180° → 0, 0° → 0.5, 180° → 1
            x = (lon + 180) / 360;
            
            // Mapeo directo de latitud a Y
            // 90° → 0, 0° → 0.5, -90° → 1
            y = (90 - lat) / 180;
    }
    
    // Convertimos a porcentaje (0-100)
    return { 
        x: x * 100, 
        y: y * 100 
    };
};

/* ============================================
   FUNCIONES DE PROYECCIÓN INVERSA
   
   Estas funciones convierten coordenadas del plano
   (x, y) de vuelta a coordenadas geográficas (lat, lon).
   Se usan cuando el usuario hace clic en el mapa.
============================================ */

/**
 * Convierte coordenadas del plano a geográficas (proyección inversa)
 * 
 * @param {number} nx - Coordenada X normalizada (0-1)
 * @param {number} ny - Coordenada Y normalizada (0-1)
 * @param {string} projection - ID de la proyección
 * @returns {object} - Coordenadas geográficas { lat, lon }
 */
const inverseProject = (nx, ny, projection) => {
    let lat, lon;
    
    switch(projection) {
        case 'mercator':
            // Inversión de Mercator
            lon = nx * 360 - 180;
            
            // Fórmula inversa del Mercator
            // lat = 2 × atan(e^y) - π/2
            lat = toDegrees(
                2 * Math.atan(Math.exp((0.5 - ny) * 2 * Math.PI)) - Math.PI / 2
            );
            
            // Limitamos a los rangos válidos
            lat = Math.max(-85, Math.min(85, lat));
            break;
        
        default:  // equirectangular
            // Inversión directa
            lon = nx * 360 - 180;
            lat = 90 - ny * 180;
    }
    
    return { lat, lon };
};

/* ============================================
   NOTAS SOBRE PROYECCIONES CARTOGRÁFICAS
   
   PROPIEDADES IMPOSIBLES DE PRESERVAR SIMULTÁNEAMENTE:
   
   1. CONFORMIDAD: Preserva ángulos y formas locales
      - Los meridianos y paralelos se cruzan en ángulos rectos
      - Las formas de áreas pequeñas son correctas
      - Ejemplo: Mercator
   
   2. EQUIVALENCIA: Preserva áreas
      - Las áreas en el mapa son proporcionales a las reales
      - Las formas se distorsionan para mantener el área
      - Ejemplo: Mollweide, Sinusoidal
   
   3. EQUIDISTANCIA: Preserva distancias
      - Las distancias a lo largo de ciertas líneas son correctas
      - No es posible preservar todas las distancias
      - Ejemplo: Equirectangular (en meridianos)
   
   TEOREMA FUNDAMENTAL:
   Es matemáticamente imposible crear una proyección
   que sea conforme Y equivalente al mismo tiempo.
   Por eso existen proyecciones de "compromiso" como
   Robinson que intentan minimizar todas las distorsiones.
   
   ELECCIÓN DE PROYECCIÓN:
   - Para navegación: Mercator (líneas de rumbo rectas)
   - Para áreas/distribuciones: Mollweide, Sinusoidal
   - Para mapas generales: Robinson, Equirectangular
   - Para regiones pequeñas: UTM (mínima distorsión local)
============================================ */
