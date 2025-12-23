/* ============================================
   APLICACIÓN PRINCIPAL
   Archivo: js/app.js
   
   Este archivo contiene el componente principal
   de React que integra toda la funcionalidad:
   - Interfaz de usuario
   - Panel de control
   - Visualización 2D
   - Visualización 3D
   - Paneles informativos
   
   Elaborado por: John Leonardo Cabrera Espíndola
============================================ */

/**
 * COMPONENTE PRINCIPAL: PolygonDrawer
 * 
 * Este es el componente raíz de la aplicación.
 * Maneja todo el estado y renderiza la interfaz completa.
 */
const PolygonDrawer = () => {
    /* ============================================
       HOOKS DE REACT
       
       Extraemos los hooks que vamos a usar.
       Los hooks permiten usar estado y efectos
       en componentes funcionales.
    ============================================ */
    const { useState, useRef, useEffect, useCallback } = React;

    /* ============================================
       ESTADO DE LA APLICACIÓN
       
       useState crea variables de estado que, cuando
       cambian, hacen que el componente se re-renderice.
    ============================================ */
    
    // Array de puntos del polígono actual [{lat, lon}, ...]
    const [points, setPoints] = useState([]);
    
    // Valores de los inputs de coordenadas (formato decimal)
    const [inputLat, setInputLat] = useState('');
    const [inputLon, setInputLon] = useState('');
    
    // Array de polígonos completados
    const [polygons, setPolygons] = useState([]);
    
    // Color actual para dibujar
    const [currentColor, setCurrentColor] = useState('#00f5ff');
    
    // ¿El usuario está dibujando un polígono?
    const [isDrawing, setIsDrawing] = useState(false);
    
    // Posición del mouse en el plano 2D (para el crosshair)
    const [mousePos, setMousePos] = useState(null);
    
    // Coordenadas geográficas del cursor
    const [mouseCoords, setMouseCoords] = useState(null);
    
    // Pestaña activa en el panel lateral
    const [activeTab, setActiveTab] = useState('control');
    
    // Proyección seleccionada
    const [selectedProjection, setSelectedProjection] = useState('equirectangular');
    
    // Formato de coordenadas ('decimal' o 'dms')
    const [coordFormat, setCoordFormat] = useState('decimal');
    
    // Valores para formato DMS (Grados, Minutos, Segundos)
    const [inputDeg, setInputDeg] = useState('');
    const [inputMin, setInputMin] = useState('');
    const [inputSec, setInputSec] = useState('');
    const [inputNS, setInputNS] = useState('N');   // Norte o Sur
    const [inputDegLon, setInputDegLon] = useState('');
    const [inputMinLon, setInputMinLon] = useState('');
    const [inputSecLon, setInputSecLon] = useState('');
    const [inputEW, setInputEW] = useState('W');   // Este u Oeste

    /* ============================================
       REFERENCIAS (useRef)
       
       Las referencias permiten acceder a elementos
       del DOM y mantener valores que persisten
       entre renderizados sin causar re-renderizado.
    ============================================ */
    
    // Referencia al contenedor del renderizado 3D
    const sphereContainerRef = useRef(null);
    
    // Referencias a objetos de Three.js
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const sphereGroupRef = useRef(null);
    
    // Arrays de meshes para el polígono
    const polygonMeshesRef = useRef([]);        // Polígonos guardados
    const currentPolygonRef = useRef(null);     // Líneas del polígono actual
    const currentPolygonFillRef = useRef(null); // Relleno del polígono actual
    const pointSpheresRef = useRef([]);         // Esferas de los puntos
    
    // ID de la animación para poder cancelarla
    const animationRef = useRef(null);

    /* ============================================
       INICIALIZACIÓN DE THREE.JS
       
       useEffect se ejecuta después del renderizado.
       Este efecto inicializa la escena 3D cuando
       el componente se monta.
    ============================================ */
    useEffect(() => {
        // Verificamos que el contenedor existe
        if (!sphereContainerRef.current) return;

        const container = sphereContainerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Creamos la escena
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Creamos la cámara
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.z = 4.5;
        cameraRef.current = camera;

        // Creamos el renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Grupo para la esfera
        const sphereGroup = new THREE.Group();
        scene.add(sphereGroup);
        sphereGroupRef.current = sphereGroup;

        // --- ESTRELLAS ---
        const starsGeometry = new THREE.BufferGeometry();
        const starPositions = [];
        for (let i = 0; i < 1500; i++) {
            starPositions.push(
                (Math.random() - 0.5) * 150,
                (Math.random() - 0.5) * 150,
                (Math.random() - 0.5) * 150
            );
        }
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
        const stars = new THREE.Points(
            starsGeometry,
            new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, opacity: 0.8, transparent: true })
        );
        scene.add(stars);

        // --- ESFERA PRINCIPAL ---
        const sphereGeometry = new THREE.SphereGeometry(2, 128, 128);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: 0x0a1628,
            transparent: true,
            opacity: 0.92,
            shininess: 80,
            specular: 0x00f5ff,
        });
        sphereGroup.add(new THREE.Mesh(sphereGeometry, sphereMaterial));

        // --- BRILLO EXTERIOR ---
        const glowGeometry = new THREE.SphereGeometry(2.1, 64, 64);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00f5ff,
            transparent: true,
            opacity: 0.05,
            side: THREE.BackSide
        });
        const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
        sphereGroup.add(glowSphere);

        // --- LÍNEAS DE LATITUD ---
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

        // --- LÍNEAS DE LONGITUD ---
        for (let lon = 0; lon < 360; lon += 10) {
            const curve = new THREE.EllipseCurve(0, 0, 2.01, 2.01, 0, Math.PI * 2);
            const curvePoints = curve.getPoints(128);
            const geometry = new THREE.BufferGeometry().setFromPoints(
                curvePoints.map(p => new THREE.Vector3(p.x, p.y, 0))
            );
            const color = lon === 0 ? 0xff006e : 0x00f5ff;
            const opacity = lon === 0 ? 0.6 : (lon % 30 === 0 ? 0.3 : 0.1);
            const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
            const line = new THREE.Line(geometry, material);
            line.rotation.y = (lon * Math.PI) / 180;
            sphereGroup.add(line);
        }

        // --- LUCES ---
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const light1 = new THREE.PointLight(0x00f5ff, 1.5, 25);
        light1.position.set(6, 6, 6);
        scene.add(light1);
        const light2 = new THREE.PointLight(0xff006e, 0.8, 25);
        light2.position.set(-6, -6, 6);
        scene.add(light2);

        // --- VARIABLES DE CONTROL ---
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let autoRotate = true;
        let time = 0;

        // --- ANIMACIÓN ---
        const animate = () => {
            animationRef.current = requestAnimationFrame(animate);
            time += 0.01;
            if (autoRotate && !isDragging) sphereGroup.rotation.y += 0.001;
            stars.rotation.y += 0.0001;
            glowSphere.material.opacity = 0.04 + Math.sin(time * 2) * 0.02;
            renderer.render(scene, camera);
        };
        animate();

        // --- EVENTOS ---
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

        const handleResize = () => {
            const w = container.clientWidth, h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        // --- LIMPIEZA ---
        return () => {
            cancelAnimationFrame(animationRef.current);
            renderer.dispose();
            if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    /* ============================================
       ACTUALIZACIÓN DE LA ESFERA
       
       Esta función se llama cada vez que cambian
       los puntos o el color. Actualiza la visualización
       3D del polígono.
    ============================================ */
    const updateSphereVisualization = useCallback(() => {
        if (!sphereGroupRef.current) return;
        const group = sphereGroupRef.current;

        // Limpiamos el polígono actual
        if (currentPolygonRef.current) {
            group.remove(currentPolygonRef.current);
            currentPolygonRef.current = null;
        }
        if (currentPolygonFillRef.current) {
            group.remove(currentPolygonFillRef.current);
            currentPolygonFillRef.current = null;
        }
        pointSpheresRef.current.forEach(ps => group.remove(ps));
        pointSpheresRef.current = [];

        if (points.length === 0) return;

        // Dibujamos los puntos
        points.forEach(point => {
            const position = latLonToVector3(point.lat, point.lon, 2.06);

            // Esfera de brillo
            const glowMesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 16, 16),
                new THREE.MeshBasicMaterial({ color: currentColor, transparent: true, opacity: 0.4 })
            );
            glowMesh.position.copy(position);
            group.add(glowMesh);
            pointSpheresRef.current.push(glowMesh);

            // Punto central
            const pointMesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 16, 16),
                new THREE.MeshBasicMaterial({ color: currentColor })
            );
            pointMesh.position.copy(position);
            group.add(pointMesh);
            pointSpheresRef.current.push(pointMesh);
        });

        // Dibujamos las líneas y el relleno
        if (points.length >= 2) {
            const line = createSphericalLines(points, currentColor, 2.04, points.length >= 3);
            if (line) { group.add(line); currentPolygonRef.current = line; }

            if (points.length >= 3) {
                const fill = createSphericalFill(points, currentColor, 2.025);
                if (fill) { group.add(fill); currentPolygonFillRef.current = fill; }
            }
        }
    }, [points, currentColor]);

    // Ejecutar la actualización cuando cambien los puntos o el color
    useEffect(() => { updateSphereVisualization(); }, [points, updateSphereVisualization]);

    /* ============================================
       FUNCIONES DE MANEJO DE EVENTOS
    ============================================ */

    /**
     * Añade un punto al polígono
     */
    const addPoint = () => {
        let lat, lon;
        
        // Parseamos las coordenadas según el formato
        if (coordFormat === 'decimal') {
            lat = parseFloat(inputLat);
            lon = parseFloat(inputLon);
        } else {
            // Formato DMS
            lat = dmsToDecimal(inputDeg, inputMin, inputSec, inputNS);
            lon = dmsToDecimal(inputDegLon, inputMinLon, inputSecLon, inputEW);
        }
        
        // Validamos las coordenadas
        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return;
        
        // Añadimos el punto
        setPoints([...points, { lat, lon }]);
        
        // Limpiamos los inputs
        if (coordFormat === 'decimal') {
            setInputLat('');
            setInputLon('');
        } else {
            setInputDeg(''); setInputMin(''); setInputSec('');
            setInputDegLon(''); setInputMinLon(''); setInputSecLon('');
        }
        setIsDrawing(true);
    };

    /**
     * Completa el polígono y lo guarda
     */
    const completePolygon = () => {
        if (points.length < 3) return;
        
        // Creamos el objeto del polígono
        const newPolygon = { id: Date.now(), points: [...points], color: currentColor };
        setPolygons([...polygons, newPolygon]);

        // Añadimos las geometrías permanentes a la esfera
        if (sphereGroupRef.current) {
            const group = sphereGroupRef.current;
            const line = createSphericalLines(points, currentColor, 2.04, true);
            if (line) { group.add(line); polygonMeshesRef.current.push(line); }
            const fill = createSphericalFill(points, currentColor, 2.025);
            if (fill) { group.add(fill); polygonMeshesRef.current.push(fill); }
        }
        
        // Limpiamos los puntos actuales
        setPoints([]);
        setIsDrawing(false);
    };

    /**
     * Limpia el polígono actual
     */
    const clearCurrent = () => {
        setPoints([]);
        setIsDrawing(false);
    };

    /**
     * Limpia todo (polígono actual y guardados)
     */
    const clearAll = () => {
        setPoints([]);
        setPolygons([]);
        setIsDrawing(false);
        
        // Eliminamos las geometrías de la esfera
        polygonMeshesRef.current.forEach(m => sphereGroupRef.current?.remove(m));
        polygonMeshesRef.current = [];
    };

    /**
     * Maneja el clic en el plano 2D
     */
    const handlePlaneClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const nx = x / rect.width;
        const ny = y / rect.height;
        
        // Calculamos las coordenadas geográficas según la proyección
        let lat, lon;
        if (selectedProjection === 'mercator') {
            lon = nx * 360 - 180;
            lat = toDegrees(2 * Math.atan(Math.exp((0.5 - ny) * 2 * Math.PI)) - Math.PI / 2);
            lat = Math.max(-85, Math.min(85, lat));
        } else {
            lon = nx * 360 - 180;
            lat = 90 - ny * 180;
        }
        
        // Añadimos el punto
        setPoints([...points, { lat: Math.round(lat * 1000) / 1000, lon: Math.round(lon * 1000) / 1000 }]);
        setIsDrawing(true);
    };

    /**
     * Maneja el movimiento del mouse en el plano 2D
     */
    const handlePlaneMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const nx = x / rect.width;
        const ny = y / rect.height;
        
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

    /* ============================================
       CÁLCULOS GEODÉSICOS
    ============================================ */
    const geodesicArea = calculateGeodesicArea(points);
    const perimeter = calculatePerimeter(points);
    const centroid = calculateCentroid(points);
    const currentProjectionInfo = PROJECTIONS.find(p => p.id === selectedProjection);

    // Azimuts entre puntos consecutivos
    const azimuths = points.length >= 2 ? points.slice(0, -1).map((p, i) => ({
        from: i + 1,
        to: i + 2,
        azimuth: calculateAzimuth(p.lat, p.lon, points[i + 1].lat, points[i + 1].lon),
        distance: vincentyDistance(p.lat, p.lon, points[i + 1].lat, points[i + 1].lon)
    })) : [];

    // UTM del centroide
    const utmCentroid = points.length > 0 ? latLonToUTM(centroid.lat, centroid.lon) : null;

    /* ============================================
       RENDERIZADO JSX
       
       Aquí construimos la interfaz de usuario
       usando JSX, una extensión de JavaScript
       que permite escribir HTML dentro del código.
    ============================================ */
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
                {/* ENCABEZADO */}
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

                        {/* CONTENIDO DE LAS PESTAÑAS */}
                        {/* Se renderiza condicionalmente según la pestaña activa */}
                        
                        {activeTab === 'control' && (
                            <div className="cyber-panel" style={{ padding: '12px', flex: 1 }}>
                                <h3 style={{ color: '#00f5ff', fontFamily: "'Orbitron'", fontSize: '11px', marginBottom: '10px', letterSpacing: '1px' }}>📍 CONTROL</h3>

                                {/* Selector de proyección */}
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ fontSize: '9px', color: 'rgba(0,245,255,0.6)', display: 'block', marginBottom: '4px' }}>PROYECCIÓN</label>
                                    <select className="cyber-select" value={selectedProjection} onChange={e => setSelectedProjection(e.target.value)}>
                                        {PROJECTIONS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <div style={{ fontSize: '8px', color: 'rgba(255,190,11,0.8)', marginTop: '2px' }}>{currentProjectionInfo?.type}</div>
                                </div>

                                {/* Formato de coordenadas */}
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ fontSize: '9px', color: 'rgba(0,245,255,0.6)', display: 'block', marginBottom: '4px' }}>FORMATO</label>
                                    <select className="cyber-select" value={coordFormat} onChange={e => setCoordFormat(e.target.value)}>
                                        <option value="decimal">Grados Decimales</option>
                                        <option value="dms">Grados° Min' Seg"</option>
                                    </select>
                                </div>

                                {/* Selector de color */}
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

                                {/* Entrada de coordenadas */}
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
                                                    <option value="N">N</option>
                                                    <option value="S">S</option>
                                                </select>
                                            </div>
                                            <div style={{ fontSize: '8px', color: 'rgba(0,245,255,0.5)', marginBottom: '2px' }}>LONGITUD λ</div>
                                            <div style={{ display: 'flex', gap: '3px', marginBottom: '5px', alignItems: 'center' }}>
                                                <input type="number" className="cyber-input" value={inputDegLon} onChange={e => setInputDegLon(e.target.value)} placeholder="°" style={{ width: '50px' }} />
                                                <input type="number" className="cyber-input" value={inputMinLon} onChange={e => setInputMinLon(e.target.value)} placeholder="'" style={{ width: '45px' }} />
                                                <input type="number" className="cyber-input" value={inputSecLon} onChange={e => setInputSecLon(e.target.value)} placeholder='"' style={{ width: '55px' }} step="0.01" />
                                                <select className="cyber-select" value={inputEW} onChange={e => setInputEW(e.target.value)} style={{ width: '45px' }}>
                                                    <option value="E">E</option>
                                                    <option value="W">W</option>
                                                </select>
                                            </div>
                                        </>
                                    )}
                                    <button className="cyber-btn cyber-btn-primary" onClick={addPoint} style={{ width: '100%' }}>⊕ AGREGAR VÉRTICE</button>
                                </div>

                                {/* Lista de puntos */}
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

                                {/* Botones de acción */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <button className="cyber-btn cyber-btn-primary" onClick={completePolygon} disabled={points.length < 3} style={{ opacity: points.length < 3 ? 0.4 : 1 }}>✓ COMPLETAR</button>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <button className="cyber-btn cyber-btn-danger" onClick={clearCurrent} style={{ flex: 1 }}>LIMPIAR</button>
                                        <button className="cyber-btn cyber-btn-danger" onClick={clearAll} style={{ flex: 1 }}>RESET</button>
                                    </div>
                                </div>

                                {/* Polígonos guardados */}
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

                        {/* Pestaña GEODESIA */}
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

                        {/* Pestaña UTM */}
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
                                                    <div style={{ fontSize: '9px', fontFamily: "'Share Tech Mono'" }}>
                                                        E: {utm.easting} m<br/>
                                                        N: {utm.northing} m
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="info-card">
                                    <h4>SISTEMA UTM</h4>
                                    <p>Universal Transverse Mercator divide la Tierra en <span className="highlight">60 husos</span> de 6° cada uno.</p>
                                    <ul>
                                        <li>Factor de escala: 0.9996</li>
                                        <li>Falso Este: 500,000 m</li>
                                        <li>Falso Norte (S): 10,000,000 m</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Pestaña TEORÍA */}
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
                            {/* Etiquetas */}
                            <div style={{ position: 'absolute', top: '3px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', color: 'rgba(0,245,255,0.6)', fontFamily: "'Share Tech Mono'" }}>90°N</div>
                            <div style={{ position: 'absolute', bottom: '3px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', color: 'rgba(0,245,255,0.6)', fontFamily: "'Share Tech Mono'" }}>90°S</div>
                            <div style={{ position: 'absolute', left: '3px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', color: 'rgba(0,245,255,0.6)', fontFamily: "'Share Tech Mono'" }}>180°W</div>
                            <div style={{ position: 'absolute', right: '3px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', color: 'rgba(0,245,255,0.6)', fontFamily: "'Share Tech Mono'" }}>180°E</div>

                            {/* Líneas de referencia */}
                            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '2px', background: 'rgba(0,255,136,0.4)', pointerEvents: 'none' }} />
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '2px', background: 'rgba(255,0,110,0.3)', pointerEvents: 'none' }} />

                            {/* Crosshair */}
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

                            {/* SVG para dibujar polígonos */}
                            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                                <defs>
                                    {COLORS.map(c => (
                                        <filter key={c.hex} id={`glow-${c.hex.slice(1)}`}>
                                            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                                        </filter>
                                    ))}
                                </defs>
                                
                                {/* Polígonos guardados */}
                                {polygons.map(poly => (
                                    <polygon key={poly.id}
                                        points={poly.points.map(p => { const pos = projectPoint(p.lat, p.lon, selectedProjection, 100, 100); return `${pos.x}%,${pos.y}%`; }).join(' ')}
                                        fill={poly.color + '35'} stroke={poly.color} strokeWidth="2" filter={`url(#glow-${poly.color.slice(1)})`} />
                                ))}
                                
                                {/* Polígono actual */}
                                {points.length >= 2 && (
                                    <polygon
                                        points={points.map(p => { const pos = projectPoint(p.lat, p.lon, selectedProjection, 100, 100); return `${pos.x}%,${pos.y}%`; }).join(' ')}
                                        fill={points.length >= 3 ? currentColor + '28' : 'none'} stroke={currentColor} strokeWidth="2"
                                        strokeDasharray={points.length < 3 ? "6,3" : "0"} filter={`url(#glow-${currentColor.slice(1)})`} />
                                )}
                                
                                {/* Puntos */}
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

/* ============================================
   INICIALIZACIÓN DE REACT
   
   Creamos la raíz de React y renderizamos
   el componente principal en el DOM.
============================================ */
ReactDOM.createRoot(document.getElementById('root')).render(<PolygonDrawer />);
