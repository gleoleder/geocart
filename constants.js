/* ============================================
   CONSTANTES GEODÉSICAS
   Archivo: js/constants.js
   
   Este archivo define las constantes del 
   elipsoide de referencia WGS84 (World Geodetic
   System 1984), que es el sistema de referencia
   geodésico utilizado por GPS y la mayoría de
   sistemas de navegación modernos.
   
   Elaborado por: John Leonardo Cabrera Espíndola
============================================ */

/**
 * ELIPSOIDE WGS84
 * 
 * El elipsoide es una aproximación matemática de la forma de la Tierra.
 * La Tierra no es una esfera perfecta, sino que está achatada en los polos
 * debido a la rotación. El WGS84 define los parámetros de este elipsoide.
 * 
 * Parámetros definidos:
 * - a: Semieje mayor (radio ecuatorial)
 * - b: Semieje menor (radio polar)
 * - f: Achatamiento (flattening)
 * - e: Primera excentricidad
 * - e2: Primera excentricidad al cuadrado
 * - ep2: Segunda excentricidad al cuadrado
 */
const WGS84 = {
    /**
     * Semieje Mayor (a)
     * 
     * Es el radio de la Tierra en el ecuador.
     * Unidad: metros
     * Valor: 6,378,137 metros (aproximadamente 6,378 km)
     * 
     * Este es el radio más largo del elipsoide y representa
     * la distancia desde el centro de la Tierra hasta cualquier
     * punto en el ecuador.
     */
    a: 6378137.0,
    
    /**
     * Semieje Menor (b)
     * 
     * Es el radio de la Tierra en los polos.
     * Unidad: metros
     * Valor: 6,356,752.314245 metros (aproximadamente 6,357 km)
     * 
     * Este radio es más corto que el semieje mayor debido
     * al achatamiento polar. La diferencia es de aproximadamente
     * 21.4 km entre el radio ecuatorial y el polar.
     */
    b: 6356752.314245,
    
    /**
     * Achatamiento (f - flattening)
     * 
     * Mide cuánto difiere el elipsoide de una esfera perfecta.
     * Fórmula: f = (a - b) / a
     * Valor: 1/298.257223563 ≈ 0.00335281
     * 
     * Un valor de 0 indicaría una esfera perfecta.
     * El achatamiento de la Tierra es de aproximadamente 1/298,
     * lo que significa que el radio polar es ~21 km menor que el ecuatorial.
     */
    f: 1 / 298.257223563,
    
    /**
     * Primera Excentricidad (e)
     * 
     * Mide la desviación del elipsoide respecto a un círculo.
     * Fórmula: e = sqrt(1 - (b²/a²))
     * Valor: 0.0818191908426
     * 
     * Se usa en muchas fórmulas geodésicas para calcular
     * distancias, áreas y transformaciones de coordenadas.
     */
    e: 0.0818191908426,
    
    /**
     * Primera Excentricidad al Cuadrado (e²)
     * 
     * Es el cuadrado de la primera excentricidad.
     * Fórmula: e² = (a² - b²) / a²
     * Valor: 0.00669437999014
     * 
     * Se usa frecuentemente en cálculos porque aparece
     * elevada al cuadrado en muchas fórmulas.
     */
    e2: 0.00669437999014,
    
    /**
     * Segunda Excentricidad al Cuadrado (e'²)
     * 
     * Es otra medida de la excentricidad del elipsoide.
     * Fórmula: e'² = (a² - b²) / b²
     * Valor: 0.00673949674228
     * 
     * Se usa especialmente en la proyección UTM y otros
     * cálculos geodésicos avanzados.
     */
    ep2: 0.00673949674228,
};

/**
 * COLORES DISPONIBLES
 * 
 * Array de objetos que define los colores disponibles
 * para dibujar polígonos. Cada color tiene:
 * - hex: Código hexadecimal del color
 * - name: Nombre en español del color
 */
const COLORS = [
    { hex: '#00f5ff', name: 'Cian' },      // Azul brillante
    { hex: '#ff006e', name: 'Magenta' },   // Rosa/Fucsia
    { hex: '#8b5cf6', name: 'Púrpura' },   // Violeta
    { hex: '#00ff88', name: 'Verde' },     // Verde neón
    { hex: '#ffbe0b', name: 'Dorado' },    // Amarillo/Oro
    { hex: '#fb5607', name: 'Naranja' },   // Naranja
];

/**
 * PROYECCIONES DISPONIBLES
 * 
 * Array de objetos que define las proyecciones cartográficas
 * disponibles en la aplicación. Cada proyección tiene:
 * - id: Identificador único
 * - name: Nombre completo de la proyección
 * - type: Tipo/clasificación de la proyección
 */
const PROJECTIONS = [
    { 
        id: 'equirectangular', 
        name: 'Equirectangular (Plate Carrée)', 
        type: 'Cilíndrica Equidistante'
        /**
         * Proyección Equirectangular (Plate Carrée)
         * 
         * La proyección más simple: las coordenadas geográficas
         * se mapean directamente a coordenadas cartesianas.
         * - Latitud → Y
         * - Longitud → X
         * 
         * Ventajas: Simple de calcular
         * Desventajas: Distorsiona áreas cerca de los polos
         */
    },
    { 
        id: 'mercator', 
        name: 'Mercator', 
        type: 'Cilíndrica Conforme'
        /**
         * Proyección Mercator
         * 
         * Desarrollada por Gerardus Mercator en 1569.
         * Es CONFORME: preserva los ángulos locales.
         * 
         * Muy usada en navegación porque las líneas de rumbo
         * constante (loxodrómicas) aparecen como líneas rectas.
         * 
         * Desventaja: Distorsiona enormemente las áreas
         * cerca de los polos (Groenlandia parece más grande que África).
         */
    },
    { 
        id: 'mollweide', 
        name: 'Mollweide', 
        type: 'Pseudocilíndrica Equivalente'
        /**
         * Proyección Mollweide
         * 
         * Proyección EQUIVALENTE: preserva las áreas.
         * Desarrollada por Karl Mollweide en 1805.
         * 
         * Ideal para mapas mundiales que muestren
         * distribuciones de datos donde el área importa.
         * 
         * La Tierra aparece en forma de elipse.
         */
    },
    { 
        id: 'sinusoidal', 
        name: 'Sinusoidal', 
        type: 'Pseudocilíndrica Equivalente'
        /**
         * Proyección Sinusoidal
         * 
         * También conocida como Sanson-Flamsteed.
         * Es EQUIVALENTE: preserva las áreas.
         * 
         * Los meridianos son curvas senoidales,
         * de ahí su nombre.
         * 
         * Buena para mapas de continentes individuales.
         */
    },
    { 
        id: 'robinson', 
        name: 'Robinson', 
        type: 'Pseudocilíndrica Compromiso'
        /**
         * Proyección Robinson
         * 
         * Desarrollada por Arthur Robinson en 1963.
         * Es una proyección de COMPROMISO: no preserva
         * ni ángulos ni áreas perfectamente, pero minimiza
         * las distorsiones en ambos.
         * 
         * Muy usada en mapas mundiales educativos
         * y de National Geographic.
         */
    },
    { 
        id: 'lambert', 
        name: 'Lambert Cilíndrica', 
        type: 'Cilíndrica Equivalente'
        /**
         * Proyección Lambert Cilíndrica
         * 
         * Proyección EQUIVALENTE desarrollada por
         * Johann Heinrich Lambert en 1772.
         * 
         * Preserva las áreas pero distorsiona las formas.
         * Los paralelos se comprimen hacia los polos.
         */
    },
];
