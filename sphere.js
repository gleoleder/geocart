/* ============================================
   RENDERIZADO 3D DE LA ESFERA
   Archivo: js/sphere.js
   
   Este archivo contiene todas las funciones
   para renderizar la esfera 3D usando Three.js:
   - Conversión de coordenadas a vectores 3D
   - Creación del relleno esférico
   - Creación de líneas geodésicas
   - Inicialización de la escena 3D
   
   Elaborado por: John Leonardo Cabrera Espíndola
============================================ */

/* ============================================
   CONVERSIÓN DE COORDENADAS A 3D
============================================ */

/**
 * Convierte coordenadas geográficas (lat/lon) a un vector 3D
 * 
 * Esta función transforma coordenadas esféricas (latitud y longitud)
 * a coordenadas cartesianas 3D (x, y, z) que pueden ser usadas
 * por Three.js para posicionar objetos en la esfera.
 * 
 * El sistema de coordenadas usado:
 * - Y apunta hacia arriba (polos)
 * - X apunta hacia la derecha
 * - Z apunta hacia el observador
 * 
 * Fórmulas de conversión (coordenadas esféricas a cartesianas):
 * x = r × sin(φ) × cos(θ)
 * y = r × cos(φ)
 * z = r × sin(φ) × sin(θ)
 * 
 * Donde:
 * - r = radio
 * - φ (phi) = ángulo polar (desde el polo norte)
 * - θ (theta) = ángulo azimutal (desde el meridiano 0)
 * 
 * @param {number} lat - Latitud en grados (-90 a 90)
 * @param {number} lon - Longitud en grados (-180 a 180)
 * @param {number} radius - Radio de la esfera (default: 2)
 * @returns {THREE.Vector3} - Vector 3D con la posición
 */
const latLonToVector3 = (lat, lon, radius = 2) => {
    // Convertimos latitud a ángulo polar (phi)
    // En coordenadas esféricas, phi se mide desde el eje Y (polo norte)
    // phi = 0 en el polo norte, phi = π en el polo sur
    const phi = (90 - lat) * (Math.PI / 180);
    
    // Convertimos longitud a ángulo azimutal (theta)
    // theta = 0 en el meridiano de Greenwich, aumenta hacia el Este
    // Sumamos 180 para ajustar el origen
    const theta = (lon + 180) * (Math.PI / 180);
    
    // Aplicamos las fórmulas de conversión
    // El signo negativo en X es para ajustar la orientación visual
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    // Retornamos un vector de Three.js
    return new THREE.Vector3(x, y, z);
};

/* ============================================
   CREACIÓN DEL RELLENO ESFÉRICO
============================================ */

/**
 * Crea una malla 3D que representa el relleno de un polígono
 * sobre la superficie de la esfera
 * 
 * Esta función utiliza TESELACIÓN para crear un relleno que
 * sigue la curvatura de la esfera. El polígono se divide en
 * triángulos pequeños, y cada vértice de estos triángulos
 * se proyecta sobre la superficie esférica.
 * 
 * El algoritmo:
 * 1. Calcula el centro del polígono
 * 2. Para cada lado del polígono, crea un "abanico" de triángulos
 *    desde el centro hasta ese lado
 * 3. Cada triángulo se subdivide en triángulos más pequeños
 * 4. Todos los vértices se normalizan al radio de la esfera
 * 
 * @param {Array} polygonPoints - Array de puntos [{lat, lon}, ...]
 * @param {string} color - Color en formato hexadecimal
 * @param {number} radius - Radio de la esfera (ligeramente mayor que la esfera base)
 * @returns {THREE.Mesh|null} - Malla 3D del relleno o null si hay menos de 3 puntos
 */
const createSphericalFill = (polygonPoints, color, radius = 2.03) => {
    // Necesitamos al menos 3 puntos para formar un polígono
    if (polygonPoints.length < 3) return null;

    // Convertimos todos los puntos del polígono a vectores 3D
    const vectors = polygonPoints.map(p => latLonToVector3(p.lat, p.lon, radius));
    
    // Calculamos el centro del polígono (promedio de todos los vértices)
    const center = new THREE.Vector3();
    vectors.forEach(v => center.add(v));
    center.divideScalar(vectors.length);
    
    // Normalizamos el centro a la superficie de la esfera
    // (lo proyectamos radialmente hacia afuera)
    center.normalize().multiplyScalar(radius);

    // Array para almacenar todos los vértices de los triángulos
    const vertices = [];
    
    // Número de subdivisiones por lado
    // Más subdivisiones = relleno más suave pero más costoso
    const subdivisions = 20;

    // Para cada lado del polígono, creamos un abanico de triángulos
    for (let i = 0; i < vectors.length; i++) {
        // Vértices del lado actual
        const v1 = vectors[i];
        const v2 = vectors[(i + 1) % vectors.length];  // Siguiente (circular)

        // Subdividimos el triángulo centro-v1-v2
        for (let row = 0; row < subdivisions; row++) {
            for (let col = 0; col <= row; col++) {
                // Calculamos las coordenadas baricéntricas
                // Estas nos permiten interpolar posiciones dentro del triángulo
                const t1 = row / subdivisions;
                const t2 = (row + 1) / subdivisions;
                const s1 = row > 0 ? col / row : 0;
                const s2 = col / (row + 1);
                const s3 = (col + 1) / (row + 1);

                /**
                 * Función auxiliar para interpolar y proyectar a la esfera
                 * 
                 * Interpola entre tres puntos usando coordenadas baricéntricas
                 * y luego normaliza el resultado a la superficie de la esfera.
                 * 
                 * @param {THREE.Vector3} a - Primer vértice (centro)
                 * @param {THREE.Vector3} b - Segundo vértice
                 * @param {THREE.Vector3} c - Tercer vértice
                 * @param {number} u - Peso del segundo vértice
                 * @param {number} v - Peso del tercer vértice
                 * @returns {THREE.Vector3} - Punto interpolado en la esfera
                 */
                const lerp3 = (a, b, c, u, v) => {
                    const w = 1 - u - v;  // Peso del primer vértice
                    return new THREE.Vector3(
                        a.x * w + b.x * u + c.x * v,
                        a.y * w + b.y * u + c.y * v,
                        a.z * w + b.z * u + c.z * v
                    ).normalize().multiplyScalar(radius);  // Proyectar a la esfera
                };

                // Creamos el triángulo superior de esta subdivisión
                const p1 = lerp3(center, v1, v2, t1 * s1, t1 * (1 - s1));
                const p2 = lerp3(center, v1, v2, t2 * s2, t2 * (1 - s2));
                const p3 = lerp3(center, v1, v2, t2 * s3, t2 * (1 - s3));

                // Añadimos los vértices del triángulo
                vertices.push(p1.x, p1.y, p1.z);
                vertices.push(p2.x, p2.y, p2.z);
                vertices.push(p3.x, p3.y, p3.z);

                // Creamos el triángulo inferior (si no es la primera fila)
                if (row > 0 && col < row) {
                    const p4 = lerp3(center, v1, v2, t1 * ((col + 1) / row), t1 * (1 - (col + 1) / row));
                    vertices.push(p1.x, p1.y, p1.z);
                    vertices.push(p3.x, p3.y, p3.z);
                    vertices.push(p4.x, p4.y, p4.z);
                }
            }
        }
    }

    // Creamos la geometría a partir de los vértices
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    // Calculamos las normales para la iluminación
    geometry.computeVertexNormals();

    // Creamos el material semi-transparente
    const material = new THREE.MeshBasicMaterial({
        color: color,           // Color del relleno
        transparent: true,      // Permitir transparencia
        opacity: 0.4,          // 40% de opacidad
        side: THREE.DoubleSide, // Visible desde ambos lados
        depthWrite: false,      // No escribir en el buffer de profundidad
    });

    // Retornamos la malla
    return new THREE.Mesh(geometry, material);
};

/* ============================================
   CREACIÓN DE LÍNEAS GEODÉSICAS
============================================ */

/**
 * Crea líneas que siguen la superficie de la esfera (geodésicas)
 * 
 * Las líneas no son rectas en 3D, sino que siguen el camino
 * más corto sobre la superficie de la esfera (gran círculo).
 * 
 * Para lograr esto, interpolamos muchos puntos entre cada
 * par de vértices y normalizamos cada punto a la esfera.
 * 
 * @param {Array} polygonPoints - Array de puntos [{lat, lon}, ...]
 * @param {string} color - Color en formato hexadecimal
 * @param {number} radius - Radio de la esfera
 * @param {boolean} close - Si true, cierra el polígono conectando el último con el primer punto
 * @returns {THREE.Line|null} - Línea 3D o null si hay menos de 2 puntos
 */
const createSphericalLines = (polygonPoints, color, radius = 2.04, close = true) => {
    // Necesitamos al menos 2 puntos para formar una línea
    if (polygonPoints.length < 2) return null;

    // Si debemos cerrar el polígono, añadimos el primer punto al final
    const allPoints = close ? [...polygonPoints, polygonPoints[0]] : polygonPoints;
    
    // Array para almacenar todos los puntos de la curva
    const curvePoints = [];

    // Para cada segmento entre puntos consecutivos
    for (let i = 0; i < allPoints.length - 1; i++) {
        // Convertimos los puntos extremos a vectores 3D
        const start = latLonToVector3(allPoints[i].lat, allPoints[i].lon, radius);
        const end = latLonToVector3(allPoints[i + 1].lat, allPoints[i + 1].lon, radius);
        
        // Número de segmentos para interpolar
        // Más segmentos = línea más suave
        const segments = 50;
        
        // Interpolamos puntos a lo largo del segmento
        for (let t = 0; t <= 1; t += 1 / segments) {
            // Interpolación lineal entre start y end
            const point = new THREE.Vector3().lerpVectors(start, end, t);
            
            // Normalizamos a la esfera (esto es lo que hace que la línea siga la curvatura)
            point.normalize().multiplyScalar(radius);
            
            curvePoints.push(point);
        }
    }

    // Creamos la geometría de la línea
    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
    
    // Material de la línea
    const material = new THREE.LineBasicMaterial({ 
        color: color, 
        linewidth: 2  // Nota: linewidth > 1 solo funciona en algunos sistemas
    });

    // Retornamos la línea
    return new THREE.Line(geometry, material);
};

/* ============================================
   INICIALIZACIÓN DE LA ESCENA 3D
   
   Esta función configura toda la escena de Three.js:
   - Cámara
   - Renderer
   - Esfera con cuadrícula
   - Luces
   - Animación
   - Controles de interacción
============================================ */

/**
 * Inicializa la escena 3D de Three.js
 * 
 * @param {HTMLElement} container - Elemento DOM donde se renderizará
 * @param {object} refs - Objeto con referencias para almacenar los elementos creados
 * @returns {function} - Función de limpieza para desmontar la escena
 */
const initThreeScene = (container, refs) => {
    // Obtenemos las dimensiones del contenedor
    const width = container.clientWidth;
    const height = container.clientHeight;

    /* ============================================
       CREACIÓN DE LA ESCENA
       
       La escena es el contenedor principal donde
       colocaremos todos los objetos 3D.
    ============================================ */
    const scene = new THREE.Scene();
    refs.scene = scene;

    /* ============================================
       CREACIÓN DE LA CÁMARA
       
       Usamos una cámara de perspectiva que simula
       cómo vemos en la vida real (objetos lejanos
       se ven más pequeños).
       
       Parámetros:
       - FOV: 45° (campo de visión)
       - Aspect ratio: ancho/alto del contenedor
       - Near plane: 0.1 (distancia mínima visible)
       - Far plane: 1000 (distancia máxima visible)
    ============================================ */
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4.5;  // Posición inicial de la cámara
    refs.camera = camera;

    /* ============================================
       CREACIÓN DEL RENDERER
       
       El renderer se encarga de dibujar la escena
       en el canvas. Usamos WebGL para aceleración
       por hardware.
    ============================================ */
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,  // Suavizado de bordes
        alpha: true       // Fondo transparente
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));  // Limitar para rendimiento
    container.appendChild(renderer.domElement);
    refs.renderer = renderer;

    /* ============================================
       GRUPO DE LA ESFERA
       
       Creamos un grupo para contener todos los
       elementos de la esfera. Así podemos rotar
       todo el conjunto junto.
    ============================================ */
    const sphereGroup = new THREE.Group();
    scene.add(sphereGroup);
    refs.sphereGroup = sphereGroup;

    /* ============================================
       CAMPO DE ESTRELLAS
       
       Creamos partículas aleatorias en el fondo
       para simular estrellas.
    ============================================ */
    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    
    // Creamos 1500 estrellas en posiciones aleatorias
    for (let i = 0; i < 1500; i++) {
        starPositions.push(
            (Math.random() - 0.5) * 150,  // X: -75 a 75
            (Math.random() - 0.5) * 150,  // Y: -75 a 75
            (Math.random() - 0.5) * 150   // Z: -75 a 75
        );
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    
    const stars = new THREE.Points(
        starsGeometry, 
        new THREE.PointsMaterial({ 
            color: 0xffffff, 
            size: 0.08, 
            opacity: 0.8, 
            transparent: true 
        })
    );
    scene.add(stars);

    /* ============================================
       ESFERA PRINCIPAL
       
       Esta es la esfera que representa la Tierra.
       Usamos un material Phong para tener reflejos.
    ============================================ */
    const sphereGeometry = new THREE.SphereGeometry(2, 128, 128);  // Radio 2, 128 segmentos
    const sphereMaterial = new THREE.MeshPhongMaterial({
        color: 0x0a1628,       // Azul muy oscuro
        transparent: true,
        opacity: 0.92,
        shininess: 80,         // Brillo especular
        specular: 0x00f5ff,    // Color del reflejo (cian)
    });
    sphereGroup.add(new THREE.Mesh(sphereGeometry, sphereMaterial));

    /* ============================================
       ESFERA DE BRILLO (GLOW)
       
       Una esfera ligeramente más grande que da
       un efecto de resplandor alrededor.
    ============================================ */
    const glowGeometry = new THREE.SphereGeometry(2.1, 64, 64);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00f5ff, 
        transparent: true, 
        opacity: 0.05, 
        side: THREE.BackSide  // Solo visible desde dentro
    });
    const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    sphereGroup.add(glowSphere);

    /* ============================================
       LÍNEAS DE LATITUD (PARALELOS)
       
       Creamos círculos horizontales para representar
       los paralelos (líneas de latitud constante).
       
       Líneas especiales:
       - Ecuador (0°): Verde
       - Trópicos (±23.5°): Amarillo
       - Círculos polares (±66.5°): Púrpura
    ============================================ */
    for (let lat = -80; lat <= 80; lat += 10) {
        // El radio del círculo depende de la latitud
        // r = R × cos(latitud)
        const radius = 2.01 * Math.cos(lat * Math.PI / 180);
        
        // La altura (Y) depende de la latitud
        // y = R × sin(latitud)
        const y = 2.01 * Math.sin(lat * Math.PI / 180);
        
        // Creamos un anillo (ring) en lugar de un círculo
        const latGeometry = new THREE.RingGeometry(radius - 0.002, radius + 0.002, 128);
        
        // Determinamos si es una línea especial
        const isSpecial = lat === 0 || Math.abs(lat) === 23 || Math.abs(lat) === 66;
        
        // Color según el tipo de línea
        let color;
        if (lat === 0) {
            color = 0x00ff88;  // Ecuador: verde
        } else if (Math.abs(lat) === 23) {
            color = 0xffbe0b;  // Trópicos: amarillo
        } else if (Math.abs(lat) === 66) {
            color = 0x8b5cf6;  // Polares: púrpura
        } else {
            color = 0x00f5ff;  // Otros: cian
        }
        
        // Opacidad según importancia
        const opacity = isSpecial ? 0.6 : (lat % 30 === 0 ? 0.35 : 0.12);
        
        const latMaterial = new THREE.MeshBasicMaterial({ 
            color, 
            transparent: true, 
            opacity, 
            side: THREE.DoubleSide 
        });
        
        const latRing = new THREE.Mesh(latGeometry, latMaterial);
        latRing.position.y = y;           // Posición vertical
        latRing.rotation.x = Math.PI / 2; // Rotar para que sea horizontal
        sphereGroup.add(latRing);
    }

    /* ============================================
       LÍNEAS DE LONGITUD (MERIDIANOS)
       
       Creamos círculos verticales para representar
       los meridianos (líneas de longitud constante).
       
       El meridiano 0° (Greenwich) es rojo/magenta.
    ============================================ */
    for (let lon = 0; lon < 360; lon += 10) {
        // Creamos una elipse (que es un círculo visto de lado)
        const curve = new THREE.EllipseCurve(0, 0, 2.01, 2.01, 0, Math.PI * 2);
        const curvePoints = curve.getPoints(128);
        
        // Convertimos los puntos 2D a 3D
        const geometry = new THREE.BufferGeometry().setFromPoints(
            curvePoints.map(p => new THREE.Vector3(p.x, p.y, 0))
        );
        
        // Color y opacidad
        const color = lon === 0 ? 0xff006e : 0x00f5ff;  // Greenwich: magenta
        const opacity = lon === 0 ? 0.6 : (lon % 30 === 0 ? 0.3 : 0.1);
        
        const material = new THREE.LineBasicMaterial({ 
            color, 
            transparent: true, 
            opacity 
        });
        
        const line = new THREE.Line(geometry, material);
        line.rotation.y = (lon * Math.PI) / 180;  // Rotar al ángulo correcto
        sphereGroup.add(line);
    }

    /* ============================================
       ILUMINACIÓN
       
       Añadimos luces para dar volumen a la esfera:
       - Luz ambiental: iluminación base uniforme
       - Luces puntuales: crean sombras y reflejos
    ============================================ */
    
    // Luz ambiental (ilumina todo por igual)
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    
    // Luz puntual 1: cian desde arriba-derecha
    const light1 = new THREE.PointLight(0x00f5ff, 1.5, 25);
    light1.position.set(6, 6, 6);
    scene.add(light1);
    
    // Luz puntual 2: magenta desde abajo-izquierda
    const light2 = new THREE.PointLight(0xff006e, 0.8, 25);
    light2.position.set(-6, -6, 6);
    scene.add(light2);

    /* ============================================
       VARIABLES DE CONTROL
       
       Variables para gestionar la interacción
       del usuario y la animación.
    ============================================ */
    let isDragging = false;                        // ¿El usuario está arrastrando?
    let previousMousePosition = { x: 0, y: 0 };    // Posición anterior del mouse
    let autoRotate = true;                         // ¿Rotar automáticamente?
    let time = 0;                                  // Tiempo para animaciones

    /* ============================================
       BUCLE DE ANIMACIÓN
       
       Esta función se ejecuta ~60 veces por segundo
       y actualiza la escena.
    ============================================ */
    const animate = () => {
        refs.animationId = requestAnimationFrame(animate);
        time += 0.01;
        
        // Rotación automática de la esfera
        if (autoRotate && !isDragging) {
            sphereGroup.rotation.y += 0.001;
        }
        
        // Rotación lenta de las estrellas
        stars.rotation.y += 0.0001;
        
        // Animación del brillo (pulsación)
        glowSphere.material.opacity = 0.04 + Math.sin(time * 2) * 0.02;
        
        // Renderizamos la escena
        renderer.render(scene, camera);
    };
    animate();

    /* ============================================
       EVENTOS DE INTERACCIÓN
       
       Manejamos los eventos del mouse para permitir
       rotar la esfera manualmente.
    ============================================ */
    
    // Cuando el usuario presiona el mouse
    const handleMouseDown = (e) => {
        isDragging = true;
        autoRotate = false;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    };
    
    // Cuando el usuario mueve el mouse (arrastrando)
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        // Calculamos cuánto se movió el mouse
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        
        // Rotamos la esfera proporcionalmente al movimiento
        sphereGroup.rotation.y += deltaX * 0.005;
        sphereGroup.rotation.x += deltaY * 0.005;
        
        previousMousePosition = { x: e.clientX, y: e.clientY };
    };
    
    // Cuando el usuario suelta el mouse
    const handleMouseUp = () => {
        isDragging = false;
        // Esperamos 4 segundos antes de reanudar la rotación automática
        setTimeout(() => { autoRotate = true; }, 4000);
    };
    
    // Zoom con la rueda del mouse
    const handleWheel = (e) => {
        e.preventDefault();
        // Acercamos o alejamos la cámara
        camera.position.z = Math.max(3, Math.min(10, camera.position.z + e.deltaY * 0.003));
    };

    // Registramos los eventos
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('mouseleave', handleMouseUp);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });

    /* ============================================
       MANEJO DE REDIMENSIONAMIENTO
       
       Cuando la ventana cambia de tamaño, debemos
       actualizar la cámara y el renderer.
    ============================================ */
    const handleResize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    /* ============================================
       FUNCIÓN DE LIMPIEZA
       
       Esta función se llama cuando el componente
       se desmonta para liberar recursos.
    ============================================ */
    return () => {
        cancelAnimationFrame(refs.animationId);
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
        }
        window.removeEventListener('resize', handleResize);
    };
};
