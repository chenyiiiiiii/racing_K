// Add debugging information to see if file is loading
console.log("Showcase.js loading... Document location: " + document.location.href);

// Wait for DOM and Three.js libraries to fully load
window.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing vehicle showcase...');
    
    // Debug message to console
    document.getElementById('loadingText').textContent = 'Script initialized...';
    
    // Ensure Three.js is loaded
    if (typeof THREE === 'undefined') {
        console.error('Three.js not loaded!');
        alert('Three.js library failed to load. Please check your internet connection and refresh the page.');
        return;
    }

    // Update loading progress
    document.getElementById('loadingProgress').style.width = '30%';
    document.getElementById('loadingText').textContent = 'Initializing 3D environment...';

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    
    // Set background color to semi-transparent deep blue
    renderer.setClearColor(0x070315, 1);
    
    const showcaseContainer = document.getElementById("showcaseContainer");
    if (!showcaseContainer) {
        console.error("Showcase container not found!");
        alert('Container element not found. Check your HTML structure.');
        return;
    }
    showcaseContainer.appendChild(renderer.domElement);
    console.log('Renderer added to container');
    
    // Update loading progress
    document.getElementById('loadingProgress').style.width = '40%';
    document.getElementById('loadingText').textContent = 'Creating neon environment...';

    // Create scene
    const scene = new THREE.Scene();
    
    // Add fog for cyberpunk atmosphere
    scene.fog = new THREE.FogExp2(0x070315, 0.05);

    // Create camera
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 3, 5);
    
    // Update loading progress
    document.getElementById('loadingProgress').style.width = '50%';
    document.getElementById('loadingText').textContent = 'Setting up lights...';

    // Add cyberpunk-style lighting
    // Main light - blue
    const mainLight = new THREE.DirectionalLight(0x00f3ff, 2);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    scene.add(mainLight);
    
    // Secondary light - red
    const secondaryLight = new THREE.DirectionalLight(0xff003c, 1.5);
    secondaryLight.position.set(-5, 8, -5);
    secondaryLight.castShadow = true;
    scene.add(secondaryLight);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x111111, 1);
    scene.add(ambientLight);
    
    // Add point lights to simulate neon
    const neonBlue = new THREE.PointLight(0x00f3ff, 2, 10);
    neonBlue.position.set(3, 1, 2);
    scene.add(neonBlue);
    
    const neonPink = new THREE.PointLight(0xff003c, 2, 10);
    neonPink.position.set(-3, 1, -2);
    scene.add(neonPink);
    
    const neonYellow = new THREE.PointLight(0xfd0, 2, 10);
    neonYellow.position.set(0, 1, -3);
    scene.add(neonYellow);
    
    // Update loading progress
    document.getElementById('loadingProgress').style.width = '60%';
    document.getElementById('loadingText').textContent = 'Creating display platform...';
    
    // Create vehicle display platform
    const platformGeometry = new THREE.CylinderGeometry(3, 3, 0.2, 32);
    const platformMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x111111,
        metalness: 0.8,
        roughness: 0.2
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -0.5;
    platform.receiveShadow = true;
    scene.add(platform);
    
    // Add neon ring
    const ringGeometry = new THREE.TorusGeometry(3.1, 0.05, 16, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const neonRing = new THREE.Mesh(ringGeometry, ringMaterial);
    neonRing.position.y = -0.4;
    neonRing.rotation.x = Math.PI / 2;
    scene.add(neonRing);
    
    // Add cyberpunk-style floor grid
    const gridSize = 20;
    const gridDivisions = 20;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0xff003c, 0x00f3ff);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);
    
    // Update loading progress
    document.getElementById('loadingProgress').style.width = '80%';
    document.getElementById('loadingText').textContent = 'Loading vehicle model...';
    
    // Set up OrbitControls
    let controls = null;
    if (typeof THREE.OrbitControls === 'function') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.minDistance = 3;
        controls.maxDistance = 10;
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI / 2;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1;
        controls.target.set(0, 0, 0);
        console.log('OrbitControls initialized');
    } else {
        console.warn('OrbitControls not available');
    }
    
    // Create a default vehicle model (if GLB can't be loaded)
    let carMesh;
    createDefaultCar();
    console.log('Default car created');
    
    // Create default vehicle model
    function createDefaultCar() {
        // Body
        const carBodyGeometry = new THREE.BoxGeometry(2, 0.6, 4);
        const carBodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00f3ff,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0x00f3ff,
            emissiveIntensity: 0.2
        });
        const carBody = new THREE.Mesh(carBodyGeometry, carBodyMaterial);
        carBody.position.y = 0.3;
        carBody.castShadow = true;
        
        // Roof
        const carRoofGeometry = new THREE.BoxGeometry(1.8, 0.4, 1.8);
        const carRoofMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            metalness: 0.7,
            roughness: 0.3
        });
        const carRoof = new THREE.Mesh(carRoofGeometry, carRoofMaterial);
        carRoof.position.y = 0.8;
        carRoof.position.z = -0.2;
        carRoof.castShadow = true;
        
        // Wheels
        function createWheel(x, z) {
            const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
            const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5, roughness: 0.7 });
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(x, 0, z);
            wheel.castShadow = true;
            return wheel;
        }
        
        const wheelFL = createWheel(1, 1.3);
        const wheelFR = createWheel(-1, 1.3);
        const wheelBL = createWheel(1, -1.3);
        const wheelBR = createWheel(-1, -1.3);
        
        // Neon strip
        const neonStripGeometry = new THREE.BoxGeometry(2.1, 0.05, 0.05);
        const neonStripMaterial = new THREE.MeshBasicMaterial({ color: 0xff003c });
        const neonStrip = new THREE.Mesh(neonStripGeometry, neonStripMaterial);
        neonStrip.position.y = 0.05;
        neonStrip.position.z = -1.9;
        
        // Headlights
        const headlightGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.1);
        const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const headlightL = new THREE.Mesh(headlightGeometry, headlightMaterial);
        headlightL.position.set(0.8, 0.3, 2);
        const headlightR = new THREE.Mesh(headlightGeometry, headlightMaterial);
        headlightR.position.set(-0.8, 0.3, 2);
        
        // Combine all parts
        carMesh = new THREE.Group();
        carMesh.add(carBody, carRoof, wheelFL, wheelFR, wheelBL, wheelBR, neonStrip, headlightL, headlightR);
        scene.add(carMesh);
    }
    
    // Add neon particle effect
    const particleCount = 1000;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    const colorChoices = [
        new THREE.Color(0x00f3ff), // Blue
        new THREE.Color(0xff003c), // Red
        new THREE.Color(0xfd0)     // Yellow
    ];
    
    for (let i = 0; i < particleCount; i++) {
        // Position
        const radius = 5 + Math.random() * 15;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 2;
        
        positions[i * 3] = radius * Math.sin(theta) * Math.cos(phi);
        positions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
        positions[i * 3 + 2] = radius * Math.cos(theta);
        
        // Color
        const color = colorChoices[Math.floor(Math.random() * colorChoices.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending
    });
    
    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Animate particle system
    function animateParticles() {
        const positions = particles.attributes.position.array;
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Slowly rotate particles
            const x = positions[i3];
            const z = positions[i3 + 2];
            
            positions[i3] = x * Math.cos(0.001) - z * Math.sin(0.001);
            positions[i3 + 2] = z * Math.cos(0.001) + x * Math.sin(0.001);
        }
        
        particles.attributes.position.needsUpdate = true;
    }
    
    // Animate neon lights
    function animateNeonLights(time) {
        // Pulse neon lights
        const pulseValue = Math.sin(time * 3) * 0.5 + 1;
        
        neonBlue.intensity = 1 + pulseValue;
        neonPink.intensity = 1 + Math.sin(time * 3 + 2) * 0.5 + 1;
        neonYellow.intensity = 1 + Math.sin(time * 3 + 4) * 0.5 + 1;
        
        // Neon ring glow effect
        neonRing.material.color.setHSL((time * 0.1) % 1, 1, 0.5);
    }
    
    // Animation loop
    let clock = new THREE.Clock();
    
    function animate() {
        requestAnimationFrame(animate);
        
        const time = clock.getElapsedTime();
        
        // Update orbit controls
        if (controls) controls.update();
        
        // Update particle system
        animateParticles();
        
        // Update neon light effects
        animateNeonLights(time);
        
        // Render scene
        renderer.render(scene, camera);
    }
    
    // Start animation loop
    animate();
    
    // Try loading GLB model
    if (typeof THREE.GLTFLoader === 'function') {
        const loader = new THREE.GLTFLoader();
        
        try {
            loader.load(
                './models/car.glb',
                function(gltf) {
                    console.log('Vehicle model loaded successfully!');
                    
                    scene.remove(carMesh); // Remove default car
                    
                    carMesh = gltf.scene;
                    carMesh.scale.set(4, 4, 4);
                    carMesh.position.set(0, 0, 0);
                    
                    // Add shadows
                    carMesh.traverse((node) => {
                        if (node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                            
                            // Try to modify materials to be more cyberpunk-styled
                            if (node.material) {
                                // Save original color
                                const originalColor = node.material.color ? node.material.color.clone() : new THREE.Color(0xffffff);
                                
                                // Copy material for modification
                                const newMaterial = new THREE.MeshStandardMaterial({
                                    color: originalColor,
                                    metalness: 0.8,
                                    roughness: 0.2,
                                    emissive: new THREE.Color(0x00f3ff),
                                    emissiveIntensity: 0.2
                                });
                                
                                node.material = newMaterial;
                            }
                        }
                    });
                    
                    scene.add(carMesh);
                    
                    // Complete loading
                    document.getElementById('loadingProgress').style.width = '100%';
                    document.getElementById('loadingText').textContent = 'Ready';
                },
                function(xhr) {
                    if (xhr.lengthComputable) {
                        const percentComplete = xhr.loaded / xhr.total * 100;
                        const totalProgress = 80 + (percentComplete * 0.2);
                        document.getElementById('loadingProgress').style.width = totalProgress + '%';
                        document.getElementById('loadingText').textContent = 'Loading vehicle: ' + Math.round(percentComplete) + '%';
                    }
                },
                function(error) {
                    console.warn('Vehicle model failed to load:', error);
                    console.log('Using default vehicle model');
                    document.getElementById('loadingProgress').style.width = '100%';
                    document.getElementById('loadingText').textContent = 'Using default vehicle';
                }
            );
        } catch (error) {
            console.error('GLTFLoader error:', error);
            document.getElementById('loadingProgress').style.width = '100%';
            document.getElementById('loadingText').textContent = 'Using default vehicle';
        }
    } else {
        console.warn('GLTFLoader unavailable, using default vehicle');
        document.getElementById('loadingProgress').style.width = '100%';
        document.getElementById('loadingText').textContent = 'Using default vehicle';
    }
    
    console.log("Vehicle showcase initialized successfully!");
});

// Force the loading screen to eventually close
window.addEventListener('load', function() {
    console.log("Window fully loaded");
    setTimeout(function() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(function() {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 3000);
});