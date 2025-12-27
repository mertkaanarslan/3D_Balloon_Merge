// Game Configuration
const CONFIG = {
    boardSize: 7,
    maxLevel: 6,
    balloonTypes: 6,
    traySize: 7,
    colors: [
        0xe74c3c, // Bright Red (more distinct from orange)
        0x00d2d3, // Bright Cyan
        0x3498db, // Sky Blue
        0xff6b35, // Vibrant Orange (clearly different from red)
        0x2ecc71, // Emerald Green
        0xf1c40f, // Bright Yellow
    ],
    colorNames: ['Red', 'Cyan', 'Blue', 'Salmon', 'Mint', 'Yellow'],
    totalLevels: 100, // Total number of levels
    levelsPerRow: 5 // Levels per row in the map
};

// Level Difficulty Configuration
function getLevelConfig(level) {
    // Progressive difficulty
    const baseBalloons = 15;
    const balloonsPerLevel = Math.floor(level / 5) + 1;
    const totalBalloons = Math.min(baseBalloons + balloonsPerLevel * 3, 50);
    
    const baseTraySize = 7;
    const traySize = Math.min(baseTraySize + Math.floor(level / 10), 10);
    
    return {
        balloonCount: totalBalloons,
        traySize: traySize,
        balloonTypes: Math.min(3 + Math.floor(level / 15), 6) // More types as level increases
    };
}

// Game State
let gameState = {
    currentLevel: 1, // Currently playing level
    stars: 0,
    moves: 0,
    board: [],
    tray: [],
    history: [],
    isGameOver: false,
    isWon: false
};

// Level Progress (stored in localStorage)
let levelProgress = {
    unlockedLevel: 1, // Highest unlocked level
    levelStars: {} // Stars earned per level: {1: 3, 2: 2, ...}
};

// Three.js Setup
let scene, camera, renderer, raycaster, mouse;
let balloons = [];
let selectedBalloon = null;
let animating = false;
let giftBox = null;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraAngle = { horizontal: 0, vertical: Math.PI / 6 };
let cameraDistance = 15;
let dragStartPosition = { x: 0, y: 0 };
let hasDragged = false;

// Initialize
function init() {
    setupThreeJS();
    setupEventListeners();
    generateBoard();
    updateUI();
    animate();
}

function setupThreeJS() {
    const container = document.getElementById('canvasContainer');
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene - cleaner background
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e); // Slightly lighter for cleaner look
    scene.fog = new THREE.Fog(0x1a1a2e, 15, 40); // Softer fog

    // Camera - initial angle similar to reference images (front view)
    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    cameraAngle.horizontal = 0; // Front view
    cameraAngle.vertical = Math.PI / 5; // Looking up more to see balloons clearly
    cameraDistance = 18; // Further back for better view
    updateCameraPosition();

    // Renderer - improved quality settings
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: false,
        powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    renderer.sortObjects = true; // Proper rendering order
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 12, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Add point lights for better illumination
    const pointLight1 = new THREE.PointLight(0xffffff, 0.5, 20);
    pointLight1.position.set(-5, 8, -5);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xffffff, 0.5, 20);
    pointLight2.position.set(5, 8, -5);
    scene.add(pointLight2);

    // Raycaster for selection
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Create gift box
    createGiftBox();
}

function createGiftBox() {
    // Remove existing gift box if any
    if (giftBox) {
        scene.remove(giftBox);
    }
    
    const giftBoxGroup = new THREE.Group();
    
    // Main box - smaller, light blue like in reference images
    const boxGeometry = new THREE.BoxGeometry(1.8, 1.5, 1.8);
    const boxMaterial = new THREE.MeshPhongMaterial({
        color: 0x87ceeb, // Light blue / Sky blue
        shininess: 100,
        specular: new THREE.Color(0xffffff)
    });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.y = 0.75;
    box.castShadow = true;
    box.receiveShadow = true;
    giftBoxGroup.add(box);
    
    // Ribbon around box - pink like in reference
    const ribbonGeometry1 = new THREE.BoxGeometry(1.9, 0.2, 1.9);
    const ribbonMaterial = new THREE.MeshPhongMaterial({
        color: 0xff69b4, // Pink
        shininess: 200,
        specular: new THREE.Color(0xffffff)
    });
    const ribbon1 = new THREE.Mesh(ribbonGeometry1, ribbonMaterial);
    ribbon1.position.y = 0.75;
    giftBoxGroup.add(ribbon1);
    
    const ribbonGeometry2 = new THREE.BoxGeometry(0.2, 1.5, 1.9);
    const ribbon2 = new THREE.Mesh(ribbonGeometry2, ribbonMaterial);
    ribbon2.position.y = 0.75;
    giftBoxGroup.add(ribbon2);
    
    // Bow on top - smaller
    const bowGroup = new THREE.Group();
    
    // Bow center
    const bowCenterGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.4);
    const bowCenter = new THREE.Mesh(bowCenterGeometry, ribbonMaterial);
    bowCenter.position.y = 1.65;
    bowGroup.add(bowCenter);
    
    // Bow loops - smaller
    for (let i = 0; i < 2; i++) {
        const loopGeometry = new THREE.TorusGeometry(0.3, 0.1, 12, 24);
        const loop = new THREE.Mesh(loopGeometry, ribbonMaterial);
        loop.rotation.x = Math.PI / 2;
        loop.rotation.z = i * Math.PI;
        loop.position.y = 1.65;
        loop.position.x = i === 0 ? -0.3 : 0.3;
        bowGroup.add(loop);
    }
    
    // Bow tails - shorter
    const tailGeometry = new THREE.BoxGeometry(0.15, 0.9, 0.15);
    for (let i = 0; i < 4; i++) {
        const tail = new THREE.Mesh(tailGeometry, ribbonMaterial);
        tail.position.y = 1.2;
        tail.position.x = (i % 2 === 0 ? -0.3 : 0.3);
        tail.position.z = (i < 2 ? -0.3 : 0.3);
        tail.rotation.x = Math.PI / 5;
        tail.rotation.z = (i % 2 === 0 ? -0.2 : 0.2);
        bowGroup.add(tail);
    }
    
    giftBoxGroup.add(bowGroup);
    
    // Position gift box lower (like in reference image)
    giftBoxGroup.position.set(0, -1, 0);
    
    giftBox = giftBoxGroup;
    scene.add(giftBox);
}

function setupEventListeners() {
    // Control buttons
    document.getElementById('menuBackBtn').addEventListener('click', backToMenu);
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('shuffleBtn').addEventListener('click', shuffle);
    document.getElementById('hintBtn').addEventListener('click', showHint);

    // Modal buttons
    document.getElementById('nextBtn').addEventListener('click', nextLevel);
    document.getElementById('retryBtn').addEventListener('click', retry);
    document.getElementById('menuBtn').addEventListener('click', backToMenu);

    // Camera control events (must be before click events)
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseUp);
    
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false });
    renderer.domElement.addEventListener('touchend', onTouchEnd);
    
    // Mouse/Touch events for selection (after camera controls)
    renderer.domElement.addEventListener('click', onPointerClick);
    
    // Wheel for zoom
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // Window resize
    window.addEventListener('resize', onWindowResize);
}

function generateBoard() {
    // Clear existing balloons
    balloons.forEach(balloon => {
        scene.remove(balloon.mesh);
        if (balloon.string) {
            scene.remove(balloon.string);
        }
    });
    balloons = [];
    gameState.board = [];

    // Get level configuration
    const levelConfig = getLevelConfig(gameState.currentLevel);
    
    // Update tray size for this level
    CONFIG.traySize = levelConfig.traySize;
    updateTrayUI();
    
    // Generate balloons in multiples of 3 for solvability
    const balloonCounts = {};
    const totalBalloons = levelConfig.balloonCount; // Dynamic based on level
    const availableTypes = levelConfig.balloonTypes;
    
    for (let i = 0; i < totalBalloons; i++) {
        const type = Math.floor(Math.random() * availableTypes);
        const level = 1; // Start with level 1
        const key = `${type}-${level}`;
        balloonCounts[key] = (balloonCounts[key] || 0) + 1;
    }

    // Ensure multiples of 3
    Object.keys(balloonCounts).forEach(key => {
        const count = balloonCounts[key];
        const remainder = count % 3;
        if (remainder !== 0) {
            balloonCounts[key] = count - remainder;
        }
    });

    // Create balloons in a tight cluster above gift box
    let balloonIndex = 0;
    const clusterCenter = { x: 0, y: 4.5, z: 0 }; // Higher position - well above gift box
    const clusterRadius = 2.0; // Larger cluster for cleaner spacing
    const minDistance = 1.0; // Increased minimum distance for cleaner appearance
    const existingPositions = []; // Track positions to avoid overlap
    
    Object.keys(balloonCounts).forEach(key => {
        const [type, level] = key.split('-').map(Number);
        const count = balloonCounts[key];
        
        for (let i = 0; i < count; i++) {
            let attempts = 0;
            let validPosition = false;
            let x, y, z;
            
            // Try to find a position that doesn't overlap with existing balloons
            while (!validPosition && attempts < 100) { // More attempts
                // Spherical distribution for tight cluster
                const phi = Math.acos(2 * Math.random() - 1);
                const theta = Math.random() * Math.PI * 2;
                const radius = Math.random() * clusterRadius;
                const height = Math.random() * 1.5;
                
                x = clusterCenter.x + Math.sin(phi) * Math.cos(theta) * radius;
                y = clusterCenter.y + height + Math.cos(phi) * radius;
                z = clusterCenter.z + Math.sin(phi) * Math.sin(theta) * radius;
                
                // Check collision with existing balloons (with safety margin)
                validPosition = true;
                for (const pos of existingPositions) {
                    const dx = x - pos.x;
                    const dy = y - pos.y;
                    const dz = z - pos.z;
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (distance < minDistance) {
                        validPosition = false;
                        break;
                    }
                }
                
                attempts++;
            }
            
            // If we couldn't find a valid position, use the last attempt anyway
            // (this should rarely happen)
            existingPositions.push({ x, y, z });
            createFloatingBalloon(x, y, z, type, parseInt(level));
            balloonIndex++;
        }
    });
}

function createPolkaDotTexture(color, size = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Base color
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, size, size);
    
    // Add white polka dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const dotSize = size / 8;
    const spacing = size / 4;
    
    for (let y = spacing; y < size; y += spacing) {
        for (let x = spacing; x < size; x += spacing) {
            // Vary dot sizes slightly for more natural look
            const variation = (Math.random() - 0.5) * 0.3;
            const currentDotSize = dotSize * (1 + variation);
            ctx.beginPath();
            ctx.arc(x, y, currentDotSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

function createFloatingBalloon(x, y, z, type, level) {
    const baseSize = 0.4 + level * 0.06;
    
    // Create more realistic balloon shape (slightly elongated, like real balloons)
    // Use sphere but scale it to be more balloon-like (taller than wide)
    const geometry = new THREE.SphereGeometry(baseSize, 32, 32);
    const color = CONFIG.colors[type % CONFIG.colors.length];
    
    // Create polka dot texture
    const texture = createPolkaDotTexture(color);
    
    // Metallic material with polka dots - cleaner appearance
    const material = new THREE.MeshPhongMaterial({
        map: texture,
        shininess: 350,
        specular: new THREE.Color(0xffffff),
        transparent: true,
        opacity: 0.99,
        emissive: new THREE.Color(color).multiplyScalar(0.12),
        reflectivity: 0.85,
        side: THREE.FrontSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.renderOrder = 0; // Render balloons after strings
    
    // Make balloon more realistic - slightly elongated vertically (like real balloons)
    mesh.scale.set(1, 1.15, 1); // 15% taller than wide

    // Position in air
    mesh.position.set(x, y, z);
    
    // Add floating animation
    const floatingSpeed = 0.3 + Math.random() * 0.2;
    const floatingAmplitude = 0.15;
    mesh.userData.floatingSpeed = floatingSpeed;
    mesh.userData.floatingAmplitude = floatingAmplitude;
    mesh.userData.baseY = y;

    // Add level indicator (ring for higher levels)
    if (level > 1) {
        const ringGeometry = new THREE.TorusGeometry(baseSize + 0.05, 0.04, 12, 24);
        const ringMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffffff,
            emissive: new THREE.Color(0xffffff).multiplyScalar(0.3)
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        mesh.add(ring);
        
        // Add second ring for higher levels
        if (level >= 4) {
            const ring2 = new THREE.Mesh(ringGeometry, ringMaterial);
            ring2.rotation.x = Math.PI / 2;
            ring2.rotation.z = Math.PI / 3;
            mesh.add(ring2);
        }
    }
    
    // Add subtle glow - reduced for cleaner look
    const glowGeometry = new THREE.SphereGeometry(baseSize + 0.08, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.15, // Reduced opacity for cleaner look
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.scale.set(1, 1.15, 1); // Match balloon shape
    mesh.add(glow);

    // Create string from balloon to gift box
    let string = null;
    try {
        if (giftBox) {
            string = createBalloonString(mesh.position, giftBox.position);
        }
    } catch (e) {
        console.warn('Could not create balloon string:', e);
    }

    // Store balloon data (no grid position needed)
    const balloon = {
        mesh: mesh,
        string: string,
        type: type,
        level: level,
        isSelectable: true, // All floating balloons are selectable
        isTrayBalloon: false
    };

    balloons.push(balloon);
    scene.add(mesh);
    if (string) scene.add(string);
}

function createBalloonString(balloonPos, boxPos) {
    if (!giftBox) return null;
    
    // Get gift box bow position
    const boxWorldPos = new THREE.Vector3();
    giftBox.getWorldPosition(boxWorldPos);
    boxWorldPos.y += 1.65; // Bow position on top (smaller box)
    
    // Calculate string attachment point at bottom of balloon (more realistic)
    const balloonBottom = new THREE.Vector3(
        balloonPos.x,
        balloonPos.y - 0.5, // Bottom of balloon (considering 1.15 scale)
        balloonPos.z
    );
    
    // Create STRAIGHT line from balloon bottom to gift box (like in reference image)
    const points = [
        balloonBottom,
        new THREE.Vector3(boxWorldPos.x, boxWorldPos.y, boxWorldPos.z)
    ];
    
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, 30, 0.012, 12, false); // Thinner, smoother
    
    // Golden/metallic ribbon material - cleaner appearance
    const material = new THREE.MeshPhongMaterial({
        color: 0xffd700, // Gold
        emissive: new THREE.Color(0xffd700).multiplyScalar(0.2),
        shininess: 500,
        specular: new THREE.Color(0xffffff),
        reflectivity: 0.95,
        transparent: true,
        opacity: 0.9
    });
    
    const string = new THREE.Mesh(geometry, material);
    string.userData.balloonPos = balloonPos;
    string.renderOrder = -1; // Render strings before balloons for cleaner look
    
    return string;
}

function updateTopBalloons() {
    // For floating balloons, all are selectable
    balloons.forEach(balloon => {
        if (!balloon.isTrayBalloon) {
            balloon.isSelectable = true;
            // Visual indicator (slight glow/outline)
            if (balloon.mesh && balloon.mesh.material) {
                balloon.mesh.material.emissive = new THREE.Color(0x222222);
            }
        }
    });
}

function updateBalloonStrings() {
    balloons.forEach(balloon => {
        if (balloon.string && balloon.mesh && !balloon.isTrayBalloon && giftBox) {
            // Update string - keep it STRAIGHT, attach to bottom of balloon
            const boxWorldPos = new THREE.Vector3();
            giftBox.getWorldPosition(boxWorldPos);
            boxWorldPos.y += 1.65; // Bow position
            
            const balloonPos = balloon.mesh.position;
            // Calculate bottom of balloon (considering scale)
            const balloonBottom = new THREE.Vector3(
                balloonPos.x,
                balloonPos.y - 0.5, // Bottom of balloon
                balloonPos.z
            );
            
            const points = [
                balloonBottom,
                new THREE.Vector3(boxWorldPos.x, boxWorldPos.y, boxWorldPos.z)
            ];
            
            const curve = new THREE.CatmullRomCurve3(points);
            const geometry = new THREE.TubeGeometry(curve, 30, 0.012, 12, false);
            balloon.string.geometry.dispose();
            balloon.string.geometry = geometry;
        }
    });
}

function updateCameraPosition() {
    const x = Math.sin(cameraAngle.horizontal) * Math.cos(cameraAngle.vertical) * cameraDistance;
    const y = Math.sin(cameraAngle.vertical) * cameraDistance + 3; // Higher look point
    const z = Math.cos(cameraAngle.horizontal) * Math.cos(cameraAngle.vertical) * cameraDistance;
    
    camera.position.set(x, y, z);
    camera.lookAt(0, 2.5, 0); // Look at center between gift box and balloons
}

function onMouseDown(event) {
    if (event.button !== 0) return; // Only left mouse button
    isDragging = true;
    hasDragged = false;
    previousMousePosition = { x: event.clientX, y: event.clientY };
    dragStartPosition = { x: event.clientX, y: event.clientY };
}

function onMouseMove(event) {
    if (!isDragging) return;
    
    const deltaX = event.clientX - previousMousePosition.x;
    const deltaY = event.clientY - previousMousePosition.y;
    
    // Check if we've actually dragged (moved more than a few pixels)
    const totalDeltaX = event.clientX - dragStartPosition.x;
    const totalDeltaY = event.clientY - dragStartPosition.y;
    const dragDistance = Math.sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY);
    
    if (dragDistance > 5) { // 5 pixels threshold
        hasDragged = true;
    }
    
    cameraAngle.horizontal -= deltaX * 0.01;
    cameraAngle.vertical += deltaY * 0.01; // Fixed: reversed direction
    
    // Limit vertical angle
    cameraAngle.vertical = Math.max(0.1, Math.min(Math.PI / 2, cameraAngle.vertical));
    
    updateCameraPosition();
    previousMousePosition = { x: event.clientX, y: event.clientY };
}

function onMouseUp(event) {
    isDragging = false;
    // Reset after a short delay to allow click event to check hasDragged
    setTimeout(() => {
        hasDragged = false;
    }, 100);
}

function onTouchStart(event) {
    if (event.touches.length === 1) {
        isDragging = true;
        hasDragged = false;
        previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        touchStartPos = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        dragStartPosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    } else if (event.touches.length === 2) {
        // Two finger touch - could be used for zoom
        isDragging = false;
    }
}

function onTouchMove(event) {
    if (event.touches.length === 1 && isDragging) {
        const deltaX = event.touches[0].clientX - previousMousePosition.x;
        const deltaY = event.touches[0].clientY - previousMousePosition.y;
        
        // Check if we've actually dragged
        const totalDeltaX = event.touches[0].clientX - dragStartPosition.x;
        const totalDeltaY = event.touches[0].clientY - dragStartPosition.y;
        const dragDistance = Math.sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY);
        
        if (dragDistance > 5) { // 5 pixels threshold
            hasDragged = true;
        }
        
        cameraAngle.horizontal -= deltaX * 0.01;
        cameraAngle.vertical += deltaY * 0.01; // Fixed: reversed direction
        
        cameraAngle.vertical = Math.max(0.1, Math.min(Math.PI / 2, cameraAngle.vertical));
        
        updateCameraPosition();
        previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
}

function onTouchEnd(event) {
    if (event.touches.length === 0) {
        isDragging = false;
        lastTouchEnd = Date.now();
        // Small delay then check for tap
        setTimeout(() => {
            if (!isDragging && touchStartPos && !hasDragged) {
                const deltaX = Math.abs(event.changedTouches[0].clientX - touchStartPos.x);
                const deltaY = Math.abs(event.changedTouches[0].clientY - touchStartPos.y);
                if (deltaX < 10 && deltaY < 10) {
                    // It was a tap, trigger click
                    const clickEvent = new MouseEvent('click', {
                        clientX: event.changedTouches[0].clientX,
                        clientY: event.changedTouches[0].clientY,
                        changedTouches: event.changedTouches
                    });
                    onPointerClick(clickEvent);
                }
            }
            touchStartPos = null;
            setTimeout(() => {
                hasDragged = false;
            }, 100);
        }, 100);
    }
}

function onWheel(event) {
    event.preventDefault();
    cameraDistance += event.deltaY * 0.01;
    cameraDistance = Math.max(8, Math.min(25, cameraDistance));
    updateCameraPosition();
}

let lastTouchEnd = 0;
let touchStartPos = null;

function onPointerClick(event) {
    // Only handle clicks if not dragging (to distinguish from camera rotation)
    if (animating || gameState.isGameOver) return;
    
    // Don't select if we just finished dragging the camera
    if (hasDragged) {
        return;
    }
    
    // For touch, check if it was a tap (not a drag)
    const now = Date.now();
    if (now - lastTouchEnd < 300 && touchStartPos) {
        const deltaX = Math.abs(event.clientX - touchStartPos.x);
        const deltaY = Math.abs(event.clientY - touchStartPos.y);
        if (deltaX > 10 || deltaY > 10) {
            // It was a drag, not a tap
            return;
        }
    }
    
    // Get mouse/touch position
    const rect = renderer.domElement.getBoundingClientRect();
    let clientX, clientY;
    
    if (event.changedTouches) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }
    
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(balloons.map(b => b.mesh));

    if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const balloon = balloons.find(b => b.mesh === clickedMesh || b.mesh.children.includes(clickedMesh));
        
        if (balloon && balloon.isSelectable) {
            selectBalloon(balloon);
        }
    }
}

function selectBalloon(balloon) {
    if (gameState.tray.length >= CONFIG.traySize) {
        // Tray is full - game over
        loseGame();
        return;
    }

    // Save state for undo
    saveState();

    // Remove from balloons array
    const index = balloons.indexOf(balloon);
    if (index > -1) {
        balloons.splice(index, 1);
    }
    
    // Remove string
    if (balloon.string) {
        scene.remove(balloon.string);
    }

    // Animate to tray
    animateToTray(balloon, () => {
        // Add to tray
        gameState.tray.push(balloon);
        updateTrayUI();
        updateTopBalloons();
        gameState.moves++;
        updateUI();

        // Check for matches immediately (merge game mechanic)
        setTimeout(() => {
            const hasMatches = checkMatches();
            if (!hasMatches) {
                // No matches, check win condition
                const boardBalloons = balloons.filter(b => !b.isTrayBalloon);
                if (boardBalloons.length === 0 && gameState.tray.length === 0) {
                    setTimeout(() => winGame(), 500);
                }
            }
        }, 100);
    });
}

function animateToTray(balloon, callback) {
    animating = true;
    const traySlotIndex = gameState.tray.length;
    const traySlot = document.querySelectorAll('.tray-slot')[traySlotIndex];
    const rect = traySlot.getBoundingClientRect();
    const centerX = (rect.left + rect.right) / 2;
    const centerY = (rect.top + rect.bottom) / 2;

    // Convert screen position to world position
    const vector = new THREE.Vector3();
    vector.set(
        (centerX / window.innerWidth) * 2 - 1,
        -(centerY / window.innerHeight) * 2 + 1,
        0.5
    );
    vector.unproject(camera);

    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.y / dir.y;
    const targetPos = camera.position.clone().add(dir.multiplyScalar(distance));
    targetPos.y = 0.3;

    const startPos = balloon.mesh.position.clone();
    const startScale = balloon.mesh.scale.clone();
    let progress = 0;
    const duration = 600; // ms
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        progress = Math.min(elapsed / duration, 1);
        
        // Smooth easing with bounce
        const ease = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        // Arc motion
        const midPoint = new THREE.Vector3().lerpVectors(startPos, targetPos, 0.5);
        midPoint.y += 2; // Arc height
        
        if (progress < 0.5) {
            balloon.mesh.position.lerpVectors(startPos, midPoint, progress * 2);
        } else {
            balloon.mesh.position.lerpVectors(midPoint, targetPos, (progress - 0.5) * 2);
        }
        
        balloon.mesh.scale.setScalar(0.3 + (1 - ease) * 0.7);
        balloon.mesh.rotation.y += 0.1;
        balloon.mesh.rotation.x += 0.05;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            balloon.mesh.visible = false;
            animating = false;
            if (callback) callback();
        }
    }
    
    animate();
}

function updateTrayUI() {
    const traySlots = document.getElementById('traySlots');
    if (!traySlots) return;
    
    traySlots.innerHTML = '';

    for (let i = 0; i < CONFIG.traySize; i++) {
        const slot = document.createElement('div');
        slot.className = 'tray-slot';
        
        if (i < gameState.tray.length) {
            slot.className += ' filled';
            const balloon = gameState.tray[i];
            const emoji = '🎈';
            slot.textContent = emoji;
            const colorHex = CONFIG.colors[balloon.type % CONFIG.colors.length].toString(16).padStart(6, '0');
            slot.style.backgroundColor = `#${colorHex}60`;
            slot.style.borderColor = `#${colorHex}`;
            slot.style.boxShadow = `0 0 15px rgba(${parseInt(colorHex.substr(0,2), 16)}, ${parseInt(colorHex.substr(2,2), 16)}, ${parseInt(colorHex.substr(4,2), 16)}, 0.5)`;
            
            // Add entrance animation
            slot.style.animation = 'slotAppear 0.3s ease-out';
            
            // Show level indicator
            if (balloon.level > 1) {
                const levelBadge = document.createElement('div');
                levelBadge.textContent = balloon.level;
                levelBadge.style.position = 'absolute';
                levelBadge.style.top = '2px';
                levelBadge.style.right = '2px';
                levelBadge.style.fontSize = '0.7rem';
                levelBadge.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.8))';
                levelBadge.style.borderRadius = '50%';
                levelBadge.style.width = '18px';
                levelBadge.style.height = '18px';
                levelBadge.style.display = 'flex';
                levelBadge.style.alignItems = 'center';
                levelBadge.style.justifyContent = 'center';
                levelBadge.style.fontWeight = 'bold';
                levelBadge.style.color = '#333';
                levelBadge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                slot.appendChild(levelBadge);
            }
        }
        
        if (i === gameState.tray.length && gameState.tray.length >= CONFIG.traySize) {
            slot.className += ' full';
        }
        
        traySlots.appendChild(slot);
    }
}

function checkMatches() {
    if (gameState.tray.length < 3) return false;

    // Group by TYPE ONLY (not level) - simple match-3 mechanic
    const groups = {};
    gameState.tray.forEach((balloon, index) => {
        const key = balloon.type; // Only type, no level
        if (!groups[key]) groups[key] = [];
        groups[key].push({ balloon, index });
    });

    // Find first group of 3 or more (same color)
    for (const key of Object.keys(groups)) {
        const group = groups[key];
        if (group.length >= 3) {
            // Combine first 3
            const toCombine = group.slice(0, 3);
            combineBalloons(toCombine);
            return true; // Found a match
        }
    }
    
    return false; // No matches found
}

function combineBalloons(matches) {
    saveState();
    
    const firstBalloon = matches[0].balloon;
    
    // Award stars for matching (simple match-3, no merge)
    const starsAwarded = 10;
    gameState.stars += starsAwarded;
    
    // First, remove matched balloons from tray immediately (before animations)
    const matchedIndices = [];
    matches.forEach(match => {
        const index = gameState.tray.indexOf(match.balloon);
        if (index > -1) {
            matchedIndices.push(index);
        }
    });
    
    // Sort indices in descending order to remove from end to start (avoid index shifting issues)
    matchedIndices.sort((a, b) => b - a);
    matchedIndices.forEach(index => {
        gameState.tray.splice(index, 1);
    });
    
    // Update UI immediately after removal
    updateTrayUI();
    updateUI();
    
    // Animate removal of matched balloons (visual only)
    matches.forEach((match, idx) => {
        setTimeout(() => {
            if (match.balloon.mesh) {
                const startScale = match.balloon.mesh.scale.clone();
                let progress = 0;
                const duration = 300;
                const startTime = Date.now();
                
                function animateOut() {
                    const elapsed = Date.now() - startTime;
                    progress = Math.min(elapsed / duration, 1);
                    const scale = 1 - progress;
                    match.balloon.mesh.scale.setScalar(startScale.x * scale);
                    match.balloon.mesh.rotation.y += 0.2;
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateOut);
                    } else {
                        if (match.balloon.mesh && match.balloon.mesh.parent) {
                            scene.remove(match.balloon.mesh);
                        }
                        const balloonIndex = balloons.indexOf(match.balloon);
                        if (balloonIndex > -1) {
                            balloons.splice(balloonIndex, 1);
                        }
                    }
                }
                animateOut();
            }
        }, idx * 50); // Stagger animations
    });

    // Show stars gained effect
    setTimeout(() => {
        createPopEffect(new THREE.Vector3(0, 2, 0), starsAwarded);
        
        // Recursively check for more matches (chain reactions)
        setTimeout(() => {
            const hasMoreMatches = checkMatches();
            if (!hasMoreMatches) {
                // No more matches, check win condition
                const boardBalloons = balloons.filter(b => !b.isTrayBalloon);
                if (boardBalloons.length === 0 && gameState.tray.length === 0) {
                    setTimeout(() => winGame(), 500);
                }
            }
        }, 300);
    }, matches.length * 50 + 50);
}

function createTrayBalloon(trayIndex, type, level) {
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const color = CONFIG.colors[type % CONFIG.colors.length];
    const material = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 100,
        transparent: true,
        opacity: 0.9
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, -10, 0); // Start below
    mesh.scale.set(0, 0, 0);
    scene.add(mesh);

    if (level > 1) {
        const ringGeometry = new THREE.TorusGeometry(0.35, 0.02, 8, 16);
        const ringMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        mesh.add(ring);
    }

    const balloon = {
        mesh: mesh,
        type: type,
        level: level,
        isTrayBalloon: true
    };

    balloons.push(balloon);
    return balloon;
}

function animateEmergence(newBalloon) {
    const traySlotIndex = gameState.tray.length - 1;
    const traySlot = document.querySelectorAll('.tray-slot')[traySlotIndex];
    if (!traySlot) return;
    
    const rect = traySlot.getBoundingClientRect();
    const centerX = (rect.left + rect.right) / 2;
    const centerY = (rect.top + rect.bottom) / 2;

    const vector = new THREE.Vector3();
    vector.set(
        (centerX / window.innerWidth) * 2 - 1,
        -(centerY / window.innerHeight) * 2 + 1,
        0.5
    );
    vector.unproject(camera);

    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.y / dir.y;
    const targetPos = camera.position.clone().add(dir.multiplyScalar(distance));
    targetPos.y = 0.3;

    newBalloon.mesh.position.copy(targetPos);
    newBalloon.mesh.position.y = -2;
    newBalloon.mesh.visible = true;
    
    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: CONFIG.colors[newBalloon.type % CONFIG.colors.length],
        transparent: true,
        opacity: 0.5
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    newBalloon.mesh.add(glow);
    
    let progress = 0;
    const duration = 500;
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        progress = Math.min(elapsed / duration, 1);
        
        // Bounce easing
        const ease = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        newBalloon.mesh.position.y = -2 + (targetPos.y + 2) * ease;
        newBalloon.mesh.scale.setScalar(ease);
        newBalloon.mesh.rotation.y += 0.15;
        newBalloon.mesh.rotation.x = Math.sin(progress * Math.PI) * 0.3;
        
        glow.material.opacity = (1 - progress) * 0.5;
        glow.scale.setScalar(1 + progress);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            newBalloon.mesh.visible = false;
            scene.remove(glow);
        }
    }
    
    animate();
    
    // Visual feedback on slot
    if (traySlot) {
        traySlot.style.animation = 'slotAppear 0.5s ease-out';
    }
}

function createPopEffect(position, stars) {
    // Visual feedback - show stars gained with animation
    const starsText = document.createElement('div');
    starsText.textContent = `+${stars} ⭐`;
    starsText.style.position = 'fixed';
    starsText.style.left = '50%';
    starsText.style.top = '40%';
    starsText.style.transform = 'translate(-50%, -50%) scale(0)';
    starsText.style.fontSize = '3rem';
    starsText.style.fontWeight = 'bold';
    starsText.style.color = '#ffd700';
    starsText.style.textShadow = '0 0 20px rgba(255, 215, 0, 0.8), 2px 2px 8px rgba(0,0,0,0.8)';
    starsText.style.pointerEvents = 'none';
    starsText.style.zIndex = '10000';
    starsText.style.transition = 'all 0.3s ease-out';
    document.body.appendChild(starsText);
    
    // Trigger animation
    setTimeout(() => {
        starsText.style.transform = 'translate(-50%, -50%) scale(1)';
        starsText.style.top = '35%';
    }, 10);
    
    // Animate out
    let opacity = 1;
    let y = 35;
    let scale = 1;
    const animate = () => {
        opacity -= 0.015;
        y -= 0.4;
        scale += 0.01;
        starsText.style.opacity = opacity;
        starsText.style.top = `${y}%`;
        starsText.style.transform = `translate(-50%, -50%) scale(${scale})`;
        
        if (opacity > 0) {
            requestAnimationFrame(animate);
        } else {
            if (document.body.contains(starsText)) {
                document.body.removeChild(starsText);
            }
        }
    };
    setTimeout(animate, 500);
    
    // Create particle effect in 3D
    createParticleExplosion(position, stars);
}

function createParticleExplosion(position, count) {
    const particles = [];
    const colors = [0xffd700, 0xffa500, 0xffff00];
    
    for (let i = 0; i < count / 2; i++) {
        const geometry = new THREE.SphereGeometry(0.05, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: colors[Math.floor(Math.random() * colors.length)],
            transparent: true,
            opacity: 1
        });
        const particle = new THREE.Mesh(geometry, material);
        
        particle.position.copy(position);
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            Math.random() * 0.3 + 0.2,
            (Math.random() - 0.5) * 0.3
        );
        particle.life = 1.0;
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Animate particles
    function animateParticles() {
        particles.forEach((particle, index) => {
            particle.position.add(particle.velocity);
            particle.velocity.y -= 0.01; // Gravity
            particle.life -= 0.02;
            particle.material.opacity = particle.life;
            particle.scale.setScalar(particle.life);
            
            if (particle.life <= 0) {
                scene.remove(particle);
                particles.splice(index, 1);
            }
        });
        
        if (particles.length > 0) {
            requestAnimationFrame(animateParticles);
        }
    }
    animateParticles();
}

function saveState() {
    gameState.history.push({
        tray: JSON.parse(JSON.stringify(gameState.tray.map(b => ({ type: b.type, level: b.level })))),
        board: JSON.parse(JSON.stringify(gameState.board.map(col => col.map(stack => stack.map(b => ({ type: b.type, level: b.level })))))),
        stars: gameState.stars,
        moves: gameState.moves
    });
    
    // Limit history
    if (gameState.history.length > 10) {
        gameState.history.shift();
    }
}

function undo() {
    if (gameState.history.length === 0 || animating) return;
    
    const state = gameState.history.pop();
    // Simplified undo - would need full state restoration
    alert('Undo feature - would restore previous state');
}

function shuffle() {
    if (animating) return;
    
    // Shuffle floating balloons - reposition them in tight cluster
    const allBalloons = [];
    balloons.forEach(balloon => {
        if (!balloon.isTrayBalloon) {
            allBalloons.push(balloon);
        }
    });
    
    // Redistribute in tight cluster above gift box
    const clusterCenter = { x: 0, y: 4.5, z: 0 }; // Higher position
    const clusterRadius = 2.0;
    const minDistance = 1.0; // Increased for better spacing
    const existingPositions = [];
    
    allBalloons.forEach((balloon, index) => {
        let attempts = 0;
        let validPosition = false;
        let x, y, z;
        
        // Try to find a position that doesn't overlap
        while (!validPosition && attempts < 50) {
            const phi = Math.acos(2 * Math.random() - 1);
            const theta = Math.random() * Math.PI * 2;
            const radius = Math.random() * clusterRadius;
            const height = Math.random() * 1.5;
            
            x = clusterCenter.x + Math.sin(phi) * Math.cos(theta) * radius;
            y = clusterCenter.y + height + Math.cos(phi) * radius;
            z = clusterCenter.z + Math.sin(phi) * Math.sin(theta) * radius;
            
            // Check collision
            validPosition = true;
            for (const pos of existingPositions) {
                const distance = Math.sqrt(
                    Math.pow(x - pos.x, 2) + 
                    Math.pow(y - pos.y, 2) + 
                    Math.pow(z - pos.z, 2)
                );
                if (distance < minDistance) {
                    validPosition = false;
                    break;
                }
            }
            
            attempts++;
        }
        
        existingPositions.push({ x, y, z });
        balloon.mesh.position.set(x, y, z);
        balloon.mesh.userData.baseY = y;
        balloon.mesh.userData.floatingSpeed = 0.3 + Math.random() * 0.2;
        balloon.mesh.userData.floatingAmplitude = 0.15;
        
        // Update string - keep it straight, attach to bottom of balloon
        if (balloon.string && giftBox) {
            const boxWorldPos = new THREE.Vector3();
            giftBox.getWorldPosition(boxWorldPos);
            boxWorldPos.y += 1.65; // Bow position
            
            const balloonPos = balloon.mesh.position;
            // Calculate bottom of balloon
            const balloonBottom = new THREE.Vector3(
                balloonPos.x,
                balloonPos.y - 0.5, // Bottom of balloon
                balloonPos.z
            );
            
            const points = [
                balloonBottom,
                new THREE.Vector3(boxWorldPos.x, boxWorldPos.y, boxWorldPos.z)
            ];
            
            const curve = new THREE.CatmullRomCurve3(points);
            const geometry = new THREE.TubeGeometry(curve, 30, 0.012, 12, false);
            balloon.string.geometry.dispose();
            balloon.string.geometry = geometry;
        }
    });
    
    updateTopBalloons();
}

function showHint() {
    // Find a matchable set
    const groups = {};
    gameState.tray.forEach(balloon => {
        const key = `${balloon.type}-${balloon.level}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(balloon);
    });
    
    const matchable = Object.keys(groups).find(key => groups[key].length >= 2);
    if (matchable) {
        alert('You have 2 matching balloons! Find one more!');
    } else {
        alert('Look for balloons that can form matches of 3!');
    }
}

function winGame() {
    gameState.isGameOver = true;
    gameState.isWon = true;
    showModal('You Win!', `Congratulations! You cleared the board!`);
}

function loseGame() {
    gameState.isGameOver = true;
    gameState.isWon = false;
    showModal('Game Over', 'The tray is full! Try again!');
}

function showModal(title, message) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('modalStars').textContent = gameState.stars;
    document.getElementById('modalMoves').textContent = gameState.moves;
    document.getElementById('nextBtn').style.display = gameState.isWon ? 'block' : 'none';
    document.getElementById('retryBtn').style.display = 'block';
    document.getElementById('menuBtn').style.display = 'block';
    document.getElementById('modal').classList.remove('hidden');
}

function nextLevel() {
    // Save level progress
    const starsEarned = calculateStarsEarned();
    saveLevelProgress(gameState.currentLevel, starsEarned);
    
    // Unlock next level
    const wasUnlocked = gameState.currentLevel < levelProgress.unlockedLevel;
    const nextLevelNum = gameState.currentLevel + 1;
    
    if (gameState.currentLevel >= levelProgress.unlockedLevel && nextLevelNum <= CONFIG.totalLevels) {
        levelProgress.unlockedLevel = nextLevelNum;
        saveProgressToStorage();
        
        // Animate unlock if this is a new unlock
        if (!wasUnlocked) {
            animateLevelUnlock(nextLevelNum);
            return; // animateLevelUnlock will handle going back to menu
        }
    }
    
    // Go to next level or back to menu
    if (gameState.currentLevel < CONFIG.totalLevels) {
        gameState.currentLevel++;
        gameState.moves = 0;
        gameState.tray = [];
        gameState.history = [];
        gameState.isGameOver = false;
        gameState.isWon = false;
        gameState.stars = 0;
        
        document.getElementById('modal').classList.add('hidden');
        generateBoard();
        updateTrayUI();
        updateUI();
    } else {
        // All levels completed, go back to menu
        backToMenu();
    }
}

function collectCandy(levelNum) {
    const levelNode = document.querySelector(`.level-node[data-level="${levelNum}"]`);
    if (levelNode) {
        levelNode.classList.add('completed');
        // Trigger candy collection animation
        const event = new Event('candyCollected');
        levelNode.dispatchEvent(event);
    }
}

function animateLevelUnlock(levelNum) {
    // Go back to menu to show animation
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
    
    // Update map first
    updateLevelMap();
    
    // Move character to this level
    setTimeout(() => {
        moveCharacterToLevel(levelNum);
    }, 500);
}

function moveCharacterToLevel(levelNum) {
    if (!mapCharacter || !mapPath || mapPath.length === 0) {
        console.log('3D character not ready for movement');
        return;
    }
    
    const levelIndex = Math.min(levelNum - 1, CONFIG.totalLevels - 1);
    const pathIndex = levelIndex * 8;
    
    if (pathIndex < mapPath.length) {
        const targetPos = mapPath[pathIndex];
        mapCharacter.userData.targetZ = targetPos.z;
        console.log('Moving character to level', levelNum, 'Z:', targetPos.z);
    }
}

function calculateStarsEarned() {
    // Simple star calculation based on performance
    const boardBalloons = balloons.filter(b => !b.isTrayBalloon).length;
    if (boardBalloons === 0) {
        if (gameState.moves < 20) return 3;
        if (gameState.moves < 30) return 2;
        return 1;
    }
    return 0;
}

function retry() {
    gameState.moves = 0;
    gameState.tray = [];
    gameState.history = [];
    gameState.isGameOver = false;
    gameState.isWon = false;
    gameState.stars = 0;
    
    document.getElementById('modal').classList.add('hidden');
    generateBoard();
    updateTrayUI();
    updateUI();
}

function startGame(levelNumber = 1) {
    gameState.currentLevel = levelNumber;
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    // Initialize tray UI
    updateTrayUI();
    init();
}

function updateUI() {
    document.getElementById('levelDisplay').textContent = gameState.currentLevel;
    document.getElementById('starsDisplay').textContent = gameState.stars;
    document.getElementById('movesDisplay').textContent = gameState.moves;
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Animate balloon floating
    const floatTime = Date.now() * 0.001;
    balloons.forEach(balloon => {
        if (balloon.mesh && !balloon.isTrayBalloon && balloon.mesh.userData.baseY !== undefined) {
            const floatOffset = Math.sin(floatTime * balloon.mesh.userData.floatingSpeed) * 
                               balloon.mesh.userData.floatingAmplitude;
            balloon.mesh.position.y = balloon.mesh.userData.baseY + floatOffset;
            
            // Slight rotation
            balloon.mesh.rotation.y += 0.005;
        }
    });
    
    // Update strings
    updateBalloonStrings();
    
    renderer.render(scene, camera);
}

// Level Progress Management
function loadProgressFromStorage() {
    const saved = localStorage.getItem('balloonEmergeProgress');
    if (saved) {
        try {
            levelProgress = JSON.parse(saved);
        } catch (e) {
            console.warn('Failed to load progress:', e);
        }
    }
}

function saveProgressToStorage() {
    try {
        localStorage.setItem('balloonEmergeProgress', JSON.stringify(levelProgress));
    } catch (e) {
        console.warn('Failed to save progress:', e);
    }
}

function saveLevelProgress(level, stars) {
    if (!levelProgress.levelStars[level] || stars > levelProgress.levelStars[level]) {
        levelProgress.levelStars[level] = stars;
        saveProgressToStorage();
    }
}

function getTotalStars() {
    return Object.values(levelProgress.levelStars).reduce((sum, stars) => sum + stars, 0);
}

// 2D Level Map Generation - Simple horizontal scrolling
function generateLevelMap() {
    const levelMap = document.getElementById('levelMap');
    if (!levelMap) {
        console.error('levelMap container not found');
        return;
    }
    
    levelMap.innerHTML = '';
    
    // Create path background
    const pathContainer = document.createElement('div');
    pathContainer.className = 'map-path-container';
    levelMap.appendChild(pathContainer);
    
    // Create character element
    mapCharacterElement = document.createElement('div');
    mapCharacterElement.id = 'mapCharacter';
    mapCharacterElement.className = 'map-character';
    mapCharacterElement.textContent = '🧒';
    levelMap.appendChild(mapCharacterElement);
    
    // Generate level nodes in a horizontal scrolling path
    const levelsContainer = document.createElement('div');
    levelsContainer.className = 'levels-container';
    
    // Calculate spacing based on screen size
    const isMobile = window.innerWidth < 768;
    const spacing = isMobile ? 100 : 150;
    
    for (let i = 0; i < CONFIG.totalLevels; i++) {
        const levelNum = i + 1;
        const levelNode = createLevelNode(levelNum);
        levelNode.style.left = `${i * spacing + (isMobile ? 50 : 100)}px`; // Horizontal spacing
        levelNode.style.top = '50%';
        levelNode.style.transform = 'translate(-50%, -50%)';
        levelNode.style.position = 'absolute';
        levelsContainer.appendChild(levelNode);
    }
    
    levelMap.appendChild(levelsContainer);
    
    // Position character at current level
    setTimeout(() => {
        positionCharacterAtCurrentLevel();
        updateLevelMap();
    }, 100);
}

// 3D functions removed - using 2D map instead

function createLevelNode(levelNum) {
    const node = document.createElement('div');
    node.className = 'level-node';
    node.dataset.level = levelNum;
    
    const isUnlocked = levelNum <= levelProgress.unlockedLevel;
    const stars = levelProgress.levelStars[levelNum] || 0;
    const isCompleted = stars > 0;
    
    if (isCompleted) {
        node.classList.add('completed');
    }
    
    if (!isUnlocked) {
        node.classList.add('locked');
        node.innerHTML = `
            <div class="level-lock">🔒</div>
        `;
    } else {
        node.innerHTML = `
            <div class="level-number">${levelNum}</div>
            <div class="level-stars">
                ${stars >= 1 ? '⭐' : '☆'}${stars >= 2 ? '⭐' : '☆'}${stars >= 3 ? '⭐' : '☆'}
            </div>
        `;
        
        node.addEventListener('click', () => {
            startGame(levelNum);
        });
    }
    
    return node;
}

function updateLevelMap() {
    // Update total stars
    const totalStarsEl = document.getElementById('totalStars');
    if (totalStarsEl) {
        totalStarsEl.textContent = getTotalStars();
    }
    
    // Update level nodes
    document.querySelectorAll('.level-node').forEach(node => {
        const levelNum = parseInt(node.dataset.level);
        const isUnlocked = levelNum <= levelProgress.unlockedLevel;
        const stars = levelProgress.levelStars[levelNum] || 0;
        const isCompleted = stars > 0;
        
        if (isUnlocked && node.classList.contains('locked')) {
            // Unlock this level
            node.classList.remove('locked');
            node.classList.add('unlocking');
            
            setTimeout(() => {
                node.classList.remove('unlocking');
                const stars = levelProgress.levelStars[levelNum] || 0;
                node.innerHTML = `
                    <div class="level-number">${levelNum}</div>
                    <div class="level-stars">
                        ${stars >= 1 ? '⭐' : '☆'}${stars >= 2 ? '⭐' : '☆'}${stars >= 3 ? '⭐' : '☆'}
                    </div>
                `;
                
                node.addEventListener('click', () => {
                    startGame(levelNum);
                });
            }, 800);
        } else if (isUnlocked && !node.classList.contains('locked')) {
            const starsEl = node.querySelector('.level-stars');
            if (starsEl) {
                starsEl.innerHTML = `${stars >= 1 ? '⭐' : '☆'}${stars >= 2 ? '⭐' : '☆'}${stars >= 3 ? '⭐' : '☆'}`;
            }
            
            if (isCompleted) {
                node.classList.add('completed');
            }
        }
    });
    
    // Position character at current level (only if menu is visible)
    if (!document.getElementById('mainMenu').classList.contains('hidden')) {
        setTimeout(() => {
            positionCharacterAtCurrentLevel();
        }, 100);
    }
}

function positionCharacterAtCurrentLevel() {
    if (!mapCharacter || !mapPath || mapPath.length === 0) {
        console.log('3D character not ready yet');
        return;
    }
    
    // Find the last completed level or current unlocked level
    let targetLevel = levelProgress.unlockedLevel;
    
    // If we just completed a level, position at that level
    if (gameState.currentLevel && gameState.isWon) {
        targetLevel = gameState.currentLevel;
    }
    
    // Find level position in path
    const levelIndex = Math.min(targetLevel - 1, CONFIG.totalLevels - 1);
    const pathIndex = levelIndex * 8;
    
    if (pathIndex < mapPath.length) {
        const targetPos = mapPath[pathIndex];
        mapCharacter.userData.targetZ = targetPos.z;
        console.log('Character positioned at level', targetLevel, 'Z:', targetPos.z);
    }
}

function backToMenu() {
    // Reset game state
    gameState.moves = 0;
    gameState.tray = [];
    gameState.history = [];
    gameState.isGameOver = false;
    gameState.isWon = false;
    gameState.stars = 0;
    
    // Hide game screen, show menu
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
    
    // Update level map
    updateLevelMap();
    
    // Clean up Three.js
    if (renderer) {
        const container = document.getElementById('canvasContainer');
        if (container && renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
        }
    }
    scene = null;
    camera = null;
    renderer = null;
    balloons = [];
    giftBox = null;
}

// Initialize on page load
window.addEventListener('load', () => {
    // Load progress
    loadProgressFromStorage();
    
    // Setup start button (for old start screen)
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => startGame(1));
    }
    
    // Initialize level map (2D)
    generateLevelMap();
    
    
    // Initialize tray UI
    const traySlots = document.getElementById('traySlots');
    if (traySlots) {
        for (let i = 0; i < CONFIG.traySize; i++) {
            const slot = document.createElement('div');
            slot.className = 'tray-slot';
            traySlots.appendChild(slot);
        }
    }
    
    // Auto-start if in embed mode (check URL parameter)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autostart') === 'true') {
        setTimeout(() => {
            startGame(1);
        }, 500);
    }
    
    // Show main menu by default
    document.getElementById('mainMenu').classList.remove('hidden');
    document.getElementById('startScreen').classList.add('hidden');
});

