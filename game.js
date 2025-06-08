// Debug info - log script loading
console.log("Game.js - Loading started");

// Immediately create global keyboard state object for debugging
window.gameKeys = {w: false, a: false, s: false, d: false, arrows: false, shift: false};

// Initialize keyboard control early
document.addEventListener("keydown", function(event) {
  console.log("Key pressed:", event.key);

  switch(event.key.toLowerCase()) {
    case 'w': window.gameKeys.w = true; break;
    case 'a': window.gameKeys.a = true; break;
    case 's': window.gameKeys.s = true; break;
    case 'd': window.gameKeys.d = true; break;
    case 'arrowup': window.gameKeys.arrows = true; break;
    case 'arrowdown': window.gameKeys.arrows = true; break;
    case 'arrowleft': window.gameKeys.arrows = true; break;
    case 'arrowright': window.gameKeys.arrows = true; break;
    case 'shift': window.gameKeys.shift = true; break;
  }
  
  // Create cyberpunk fog effect
  function createCyberpunkFog() {
    const fogCount = 100;
    const fogGeometry = new THREE.PlaneGeometry(5, 5);

    for (let i = 0; i < fogCount; i++) {
      const fogMaterial = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0x00f3ff : 0xff003c,
        transparent: true,
        opacity: 0.1 + Math.random() * 0.1,
        side: THREE.DoubleSide
      });

      const fog = new THREE.Mesh(fogGeometry, fogMaterial);

      // Random positions on track sides
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = (25 + Math.random() * 15) * side;
      const y = Math.random() * 3;
      const z = -100 + Math.random() * 200 - 50;

      fog.position.set(x, y, z);
      fog.rotation.y = Math.random() * Math.PI * 2;

      scene.add(fog);

      // Add animation
      const fogAnimation = {
        mesh: fog,
        speed: 0.01 + Math.random() * 0.02,
        rotSpeed: 0.005 + Math.random() * 0.01,
        fadeSpeed: 0.001 + Math.random() * 0.002,
        fadingIn: true
      };

      // Update function
      const updateFog = () => {
        // Slow floating
        fogAnimation.mesh.position.y += Math.sin(elapsedTime) * 0.001;
        
        // Slow rotation
        fogAnimation.mesh.rotation.y += fogAnimation.rotSpeed;
        
        // Fade in/out effect
        if (fogAnimation.fadingIn) {
          fogAnimation.mesh.material.opacity += fogAnimation.fadeSpeed;
          if (fogAnimation.mesh.material.opacity >= 0.2) {
            fogAnimation.fadingIn = false;
          }
        } else {
          fogAnimation.mesh.material.opacity -= fogAnimation.fadeSpeed;
          if (fogAnimation.mesh.material.opacity <= 0.05) {
            fogAnimation.fadingIn = true;
          }
        }
        
        return true; // Continue updating
      };

      particleEffects.push(updateFog);
    }
  }
  
  // Update AI vehicles
  function updateAICars(delta, elapsedTime) {
    const currentTime = Date.now();

    gameState.aiCars.forEach((ai, index) => {
      if (!ai.mesh) return;

      // Use CatmullRomCurve path
      if (aiPath) {
        // Update AI position on path
        ai.pathT += ai.pathSpeed;
        if (ai.pathT > 1) {
          ai.pathT = 0;
          ai.laps++;
        }
        
        // Get current position and look-ahead position
        const currentPoint = aiPath.getPoint(ai.pathT);
        const lookAheadT = (ai.pathT + 0.01) % 1;
        const lookAheadPoint = aiPath.getPoint(lookAheadT);
        
        // Position AI vehicle on path
        ai.mesh.position.set(currentPoint.x, 0, currentPoint.z);
        
        // Calculate direction - look towards path ahead
        const direction = new THREE.Vector3().subVectors(lookAheadPoint, currentPoint).normalize();
        const angle = Math.atan2(direction.x, direction.z);
        ai.mesh.rotation.y = angle;
        
        // Increase AI speed over time
        if (elapsedTime > 30 && ai.pathSpeed < 0.001) {
          ai.pathSpeed += 0.00001;
        }
        
        // When player passes AI, slightly increase speed (catch-up effect)
        if (playerCar.position.z < ai.mesh.position.z - 15) {
          ai.pathSpeed *= 1.001;
        }
      } else {
        // Use simple AI movement when no path available
        // AI forward speed
        const aiZ = ai.mesh.position.z - ai.speed;
        
        // If AI vehicle reaches track end, return to start
        if (aiZ < -95) {
          ai.mesh.position.z = 10;
          // Increase AI lap count
          ai.laps++;
        } else {
          ai.mesh.position.z = aiZ;
        }
        
        // Random lane changes
        if (currentTime > ai.changeLaneTime) {
          // Choose new target lane position within track bounds
          ai.targetX = Math.random() * 40 - 20;
          ai.changeLaneTime = currentTime + 3000 + Math.random() * 5000; // 3-8 seconds until next lane change
        }
        
        // Smooth steering towards target lane
        const diffX = ai.targetX - ai.mesh.position.x;
        if (Math.abs(diffX) > 0.2) {
          // Gradually turn AI vehicle towards target direction
          const turnSpeed = 0.02;
          const direction = diffX > 0 ? 1 : -1;
          
          // Use SIN function for smoother steering
          ai.mesh.rotation.y = Math.sin(direction * turnSpeed) * 0.3;
          
          // Move towards target direction
          ai.mesh.position.x += diffX * 0.02;
        } else {
          // Return to forward orientation
          ai.mesh.rotation.y = 0;
        }
        
        // Track boundary limits
        const boundaryX = 24;
        ai.mesh.position.x = Math.max(-boundaryX, Math.min(boundaryX, ai.mesh.position.x));
        
        // Gradually increase AI vehicle speed over time - increase challenge
        if (elapsedTime > 30 && ai.speed < 0.25) {
          ai.speed += 0.0001;
        }
      }

      // Add neon glow effect to AI vehicles
      ai.mesh.traverse((node) => {
        if (node.isMesh && node.material && node.material.emissive) {
          node.material.emissiveIntensity = 0.3 + Math.sin(elapsedTime * 2 + index) * 0.2;
        }
      });
    });
  }
  
  // Update camera position
  function updateCamera() {
    // Calculate ideal camera position: above and behind vehicle
    const idealOffset = new THREE.Vector3(0, 3 + Math.abs(gameState.speed) * 5, 7 - Math.abs(gameState.speed) * 10);
    const idealLookAt = new THREE.Vector3(0, 0, -10);

    // Convert ideal position to vehicle coordinate system
    const offset = idealOffset.clone();
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerCar.rotation.y);

    const lookAt = idealLookAt.clone();
    lookAt.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerCar.rotation.y);

    // Smooth transition to new position
    const targetPosition = playerCar.position.clone().add(offset);

    // Smooth interpolation
    camera.position.x += (targetPosition.x - camera.position.x) * 0.1;
    camera.position.y += (targetPosition.y - camera.position.y) * 0.1;
    camera.position.z += (targetPosition.z - camera.position.z) * 0.1;

    // Smooth look towards target
    const targetLookAt = playerCar.position.clone().add(lookAt);
    camera.lookAt(targetLookAt);

    // Cyberpunk-style camera tilt effect
    if (gameState.turboDrift) {
      // Tilt camera during drift
      const tiltAmount = 0.05 * (keys.a || keys.arrowLeft ? 1 : -1);
      camera.rotation.z = tiltAmount;
    } else {
      // Smooth recovery
      camera.rotation.z *= 0.9;
    }
  }
  
  // Create drift effect
  function createDriftEffect(direction) {
    if (frameCount % 3 !== 0 || Math.abs(gameState.speed) < 0.15) return;

    const particleCount = 2;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    // Get rear wheel position
    const wheelOffset = direction > 0 ? 1 : -1; // Select wheel based on drift direction
    const wheelPos = new THREE.Vector3(wheelOffset, 0, -1.3);
    wheelPos.applyQuaternion(playerCar.quaternion);
    wheelPos.add(playerCar.position);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      particlePositions[i3] = wheelPos.x + (Math.random() - 0.5) * 0.1;
      particlePositions[i3 + 1] = 0.05; // Close to ground
      particlePositions[i3 + 2] = wheelPos.z + (Math.random() - 0.5) * 0.1;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    // Tire friction mark color
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.1,
      color: 0x333333,
      transparent: true,
      opacity: 0.7
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Longer particle lifetime for marks to remain
    const particleLife = {
      age: 0,
      maxAge: 40
    };

    const updateParticles = () => {
      if (particleLife.age >= particleLife.maxAge) {
        scene.remove(particles);
        particles.geometry.dispose();
        particles.material.dispose();
        return false;
      }

      // Fade marks over time
      particles.material.opacity = 0.7 * (1 - (particleLife.age / particleLife.maxAge));
      particleLife.age++;

      return true;
    };

    particleEffects.push(updateParticles);
  }
  
  // Create nitro boost effect
  function createNitroEffect() {
    if (frameCount % 2 !== 0) return; // Control creation frequency

    const particleCount = 5;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    // Get vehicle rear position
    const carBack = new THREE.Vector3(0, 0.3, -1.5);
    carBack.applyQuaternion(playerCar.quaternion);
    carBack.add(playerCar.position);

    // Get vehicle direction vector
    const carDirection = new THREE.Vector3(0, 0, -1);
    carDirection.applyQuaternion(playerCar.quaternion);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Start from random position at vehicle rear
      particlePositions[i3] = carBack.x + (Math.random() - 0.5) * 0.5;
      particlePositions[i3 + 1] = carBack.y + (Math.random() - 0.5) * 0.2;
      particlePositions[i3 + 2] = carBack.z + (Math.random() - 0.5) * 0.5;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    // Nitro flame effect - blue and purple
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.2,
      color: Math.random() > 0.5 ? 0x00f3ff : 0xff00ff,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Particle animation
    const particleLife = {
      velocities: [],
      age: 0,
      maxAge: 20 // Short lifetime
    };

    // Backward-shooting velocity
    for (let i = 0; i < particleCount; i++) {
      particleLife.velocities.push({
        x: carDirection.x * -0.2 + (Math.random() - 0.5) * 0.05,
        y: 0.01 + Math.random() * 0.05,
        z: carDirection.z * -0.2 + (Math.random() - 0.5) * 0.05
      });
    }

    // Particle animation function
    const updateParticles = () => {
      if (particleLife.age >= particleLife.maxAge) {
        scene.remove(particles);
        particles.geometry.dispose();
        particles.material.dispose();
        return false;
      }

      const positions = particles.geometry.attributes.position.array;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const velocity = particleLife.velocities[i];
        
        positions[i3] += velocity.x;
        positions[i3 + 1] += velocity.y;
        positions[i3 + 2] += velocity.z;
      }

      particles.geometry.attributes.position.needsUpdate = true;
      particles.material.opacity = 1 - (particleLife.age / particleLife.maxAge);
      particleLife.age++;

      return true;
    };

    particleEffects.push(updateParticles);
  }
  
  // Update player vehicle position and rotation
  function updatePlayerCar(delta) {
    if (!playerCar) {
      return;
    }

    // Accelerate/decelerate using WASD or arrow keys
    const baseAcceleration = 0.01;
    const baseDeceleration = 0.005;

    // Nitro boost effect
    const boostMultiplier = keys.shift && gameState.speed > 0.1 ? 1.5 : 1;

    // Forward/backward
    if (keys.w || keys.arrowUp) {
      gameState.speed = Math.min(gameState.maxSpeed * boostMultiplier, gameState.speed + baseAcceleration * boostMultiplier);

      // Nitro effect
      if (keys.shift && gameState.speed > 0.1) {
        createNitroEffect();
      }
    } else if (keys.s || keys.arrowDown) {
      gameState.speed = Math.max(-gameState.maxSpeed/2, gameState.speed - baseAcceleration);
    } else {
      // Natural deceleration
      if (gameState.speed > 0) {
        gameState.speed = Math.max(0, gameState.speed - baseDeceleration);
      } else if (gameState.speed < 0) {
        gameState.speed = Math.min(0, gameState.speed + baseDeceleration);
      }
    }

    // Debug output
    if (frameCount % 60 === 0 && (keys.w || keys.arrowUp || keys.s || keys.arrowDown)) {
      console.log(`Speed: ${gameState.speed.toFixed(3)}, Keys:`, keys);
    }

    // Turning - faster speed makes steering more responsive but less range
    let turnSpeed = 0.05 * (1 - Math.abs(gameState.speed) / gameState.maxSpeed * 0.3);

    if ((keys.a || keys.arrowLeft) && gameState.speed !== 0) {
      playerCar.rotation.y += turnSpeed;

      // Cyberpunk-style drift effect
      if (Math.abs(gameState.speed) > 0.15) {
        gameState.turboDrift = true;
        createDriftEffect(-1); // Left side drift
      }
    } else if ((keys.d || keys.arrowRight) && gameState.speed !== 0) {
      playerCar.rotation.y -= turnSpeed;

      // Cyberpunk-style drift effect
      if (Math.abs(gameState.speed) > 0.15) {
        gameState.turboDrift = true;
        createDriftEffect(1); // Right side drift
      }
    } else {
      gameState.turboDrift = false;
    }

    // Move based on vehicle direction
    playerCar.position.x += Math.sin(playerCar.rotation.y) * gameState.speed;
    playerCar.position.z -= Math.cos(playerCar.rotation.y) * gameState.speed;

    // Keep vehicle within track bounds
    const boundaryX = 24;
    playerCar.position.x = Math.max(-boundaryX, Math.min(boundaryX, playerCar.position.x));

    // Limit track front/back boundaries
    const frontBoundary = 10;
    const backBoundary = -95;
    playerCar.position.z = Math.max(backBoundary, Math.min(frontBoundary, playerCar.position.z));

    // Simulate vehicle tilt effect
    if (keys.a || keys.arrowLeft) {
      // Left turn tilts vehicle to the right
      playerCar.rotation.z = Math.min(0.1, playerCar.rotation.z + 0.01);
    } else if (keys.d || keys.arrowRight) {
      // Right turn tilts vehicle to the left
      playerCar.rotation.z = Math.max(-0.1, playerCar.rotation.z - 0.01);
    } else {
      // Return to balance when not turning
      playerCar.rotation.z *= 0.9;
    }

    // Update camera position to follow vehicle
    updateCamera();
  }
  
  // Update environment effects
  function updateEnvironmentEffects(time) {
    // Neon light pulse effect
    neonLights.forEach((light, index) => {
      light.intensity = 1.5 + Math.sin(time * 2 + index * 0.5) * 0.5;
    });

    // Add animation to finish line
    finishLine.position.y = -0.48 + Math.sin(time * 3) * 0.02;

    // Make neon barriers pulse
    leftBarriers.forEach((barrier, index) => {
      if (barrier.material) {
        barrier.material.emissiveIntensity = 0.3 + Math.sin(time * 2 + index * 0.1) * 0.2;
      }
    });

    rightBarriers.forEach((barrier, index) => {
      if (barrier.material) {
        barrier.material.emissiveIntensity = 0.3 + Math.sin(time * 2 + index * 0.1 + Math.PI) * 0.2;
      }
    });
  }
  
  // Handle window resizing
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Time management
  let clock = new THREE.Clock();
  let elapsedTime = 0;
  let frameCount = 0;

  // Build animation loop
  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    elapsedTime += delta;
    frameCount++;

    // Debug info every 60 frames
    if (frameCount % 60 === 0) {
      console.log("Keys state:", keys);
      console.log("Global keys state:", window.gameKeys);
      console.log(`Speed: ${gameState.speed.toFixed(3)}, Frame: ${frameCount}`);
    }

    // Check if global window keys are working - backup for keyboard controls
    if (window.gameKeys.w || window.gameKeys.arrows) {
      keys.w = true;
    }
    if (window.gameKeys.s) {
      keys.s = true;
    }
    if (window.gameKeys.a) {
      keys.a = true;
    }
    if (window.gameKeys.d) {
      keys.d = true;
    }
    if (window.gameKeys.shift) {
      keys.shift = true;
    }

    // Update vehicle position
    updatePlayerCar(delta);

    // Update AI vehicles
    updateAICars(delta, elapsedTime);

    // Collision detection
    checkCollisions();

    // Check for finish line crossing
    checkLapCompletion();

    // Update particle effects
    for (let i = particleEffects.length - 1; i >= 0; i--) {
      if (!particleEffects[i]()) {
        particleEffects.splice(i, 1);
      }
    }

    // Update UI
    updateUI();

    // Update neon lights and environment effects
    updateEnvironmentEffects(elapsedTime);

    renderer.render(scene, camera);
  }
  
  // Create finish line effect
  function createFinishLineEffect() {
    // Create finish line crossing effect
    const particleCount = 100;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Random positions along finish line
      particlePositions[i3] = Math.random() * 50 - 25;
      particlePositions[i3 + 1] = Math.random() * 3;
      particlePositions[i3 + 2] = -90 + (Math.random() - 0.5) * 3;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.2,
      color: 0xfd0,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Particle animation and auto-removal
    const particleLife = {
      velocities: [],
      age: 0,
      maxAge: 60 // Particle lifetime in frames
    };

    // Set initial velocity for each particle - shooting upward
    for (let i = 0; i < particleCount; i++) {
      particleLife.velocities.push({
        x: (Math.random() - 0.5) * 0.1,
        y: 0.1 + Math.random() * 0.2,
        z: (Math.random() - 0.5) * 0.1
      });
    }

    // Add to update queue
    const updateParticles = () => {
      if (particleLife.age >= particleLife.maxAge) {
        scene.remove(particles);
        particles.geometry.dispose();
        particles.material.dispose();
        return false; // No more updates
      }

      const positions = particles.geometry.attributes.position.array;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const velocity = particleLife.velocities[i];
        
        // Update position
        positions[i3] += velocity.x;
        positions[i3 + 1] += velocity.y;
        positions[i3 + 2] += velocity.z;
        
        // Simulate gravity
        velocity.y -= 0.005;
      }

      particles.geometry.attributes.position.needsUpdate = true;

      // Decrease opacity with time
      particles.material.opacity = 1 - (particleLife.age / particleLife.maxAge);

      particleLife.age++;
      return true; // Continue updating
    };

    particleEffects.push(updateParticles);
  }
  
  // Check for finish line crossing
  function checkLapCompletion() {
    // If player crosses finish line (z < -90) and is moving in the negative z direction
    if (playerCar.position.z < -90 && Math.cos(playerCar.rotation.y) > 0) {
      if (!gameState.crossedFinishLine) {
        gameState.laps++;
        gameState.score += 100;
        gameState.crossedFinishLine = true;
        console.log(`Completed lap ${gameState.laps}!`);
        
        // Create finish line particle effect
        createFinishLineEffect();
      }
    } 
    // Reset finish line state when vehicle returns to start area
    else if (playerCar.position.z > -80) {
      gameState.crossedFinishLine = false;
    }

    // Check AI vehicles crossing finish line
    for (const ai of gameState.aiCars) {
      if (ai.mesh.position.z < -90 && !ai.crossedFinishLine) {
        ai.laps++;
        ai.crossedFinishLine = true;
      } else if (ai.mesh.position.z > -80) {
        ai.crossedFinishLine = false;
      }
    }
  }
});

document.addEventListener("keyup", function(event) {
  switch(event.key.toLowerCase()) {
    case 'w': window.gameKeys.w = false; break;
    case 'a': window.gameKeys.a = false; break;
    case 's': window.gameKeys.s = false; break;
    case 'd': window.gameKeys.d = false; break;
    case 'arrowup': window.gameKeys.arrows = false; break;
    case 'arrowdown': window.gameKeys.arrows = false; break;
    case 'arrowleft': window.gameKeys.arrows = false; break;
    case 'arrowright': window.gameKeys.arrows = false; break;
    case 'shift': window.gameKeys.shift = false; break;
  }
});

// Make sure window has focus for keyboard events
window.focus();

// Wait for DOM and Three.js libraries to fully load
window.addEventListener('DOMContentLoaded', () => {
  console.log('Game initialization started...');

  // Force focus on window to ensure keyboard events work
  window.focus();

  // Add click listener to ensure focus when user clicks
  document.addEventListener('click', function() {
    window.focus();
    console.log('Focus set on window');
  });

  // Ensure Three.js is loaded
  if (typeof THREE === 'undefined') {
    console.error('Three.js not loaded!');
    return;
  }

  // Update loading progress
  document.getElementById('loadingProgress').style.width = '20%';
  document.getElementById('loadingText').textContent = 'Initializing cyberpunk world...';

  // Game state
  const gameState = {
    speed: 0,
    score: 0,
    maxSpeed: 0.3,
    aiCars: [],
    started: true,
    laps: 0,
    crossedFinishLine: false,
    turboDrift: false,
    nitroAvailable: 3,
    health: 100
  };

  // Create Three.js scene
  const scene = new THREE.Scene();
  // Set black background
  scene.background = new THREE.Color(0x070315);
  // Add fog effect
  scene.fog = new THREE.FogExp2(0x070315, 0.02);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const gameContainer = document.getElementById("gameContainer");
  if (!gameContainer) {
    console.error("gameContainer not found!");
    return;
  }
  gameContainer.appendChild(renderer.domElement);

  // Set focus to game container for keyboard input
  gameContainer.tabIndex = 1;
  gameContainer.focus();

  // Update loading progress
  document.getElementById('loadingProgress').style.width = '30%';
  document.getElementById('loadingText').textContent = 'Generating cyberpunk lights...';

  // Add cyberpunk-style lighting
  // Main directional light - blue theme
  const mainLight = new THREE.DirectionalLight(0x00f3ff, 1.5);
  mainLight.position.set(5, 20, 5);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 500;
  mainLight.shadow.camera.left = -70;
  mainLight.shadow.camera.right = 70;
  mainLight.shadow.camera.top = 70;
  mainLight.shadow.camera.bottom = -70;
  scene.add(mainLight);

  // Red auxiliary lighting
  const secondaryLight = new THREE.DirectionalLight(0xff003c, 1);
  secondaryLight.position.set(-20, 15, -20);
  secondaryLight.castShadow = true;
  scene.add(secondaryLight);

  // Ambient light - dark blue tone
  const ambientLight = new THREE.AmbientLight(0x101025, 0.6);
  scene.add(ambientLight);

  // Add cyberpunk-style neon point lights
  function createNeonLight(x, y, z, color, intensity = 2, distance = 50) {
    const light = new THREE.PointLight(color, intensity, distance);
    light.position.set(x, y, z);
    scene.add(light);
    return light;
  }

  // Track-side neon lights
  const neonLights = [];
  for (let z = -100; z <= 100; z += 20) {
    // Blue neon lights (left side)
    neonLights.push(createNeonLight(-20, 3, z, 0x00f3ff));

    // Red neon lights (right side)
    neonLights.push(createNeonLight(20, 3, z, 0xff003c));
  }

  // Update loading progress
  document.getElementById('loadingProgress').style.width = '40%';
  document.getElementById('loadingText').textContent = 'Building cyberpunk track...';

  // Create cyberpunk-style track
  // Ground
  const groundGeometry = new THREE.PlaneGeometry(50, 200);
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x101020,
    roughness: 0.4,
    metalness: 0.7,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  ground.position.z = -50;
  ground.receiveShadow = true;
  scene.add(ground);

  // Track grid lines - cyberpunk style
  const gridHelper = new THREE.GridHelper(50, 20, 0xff003c, 0x00f3ff);
  gridHelper.position.y = -0.49;
  gridHelper.position.z = -50;
  scene.add(gridHelper);

  // Track-side neon barriers
  function createNeonBarrier(x, z, color) {
    const barrierGeometry = new THREE.BoxGeometry(0.3, 1, 2);
    const barrierMaterial = new THREE.MeshStandardMaterial({ 
      color: color,
      metalness: 0.8,
      roughness: 0.2,
      emissive: color,
      emissiveIntensity: 0.5
    });
    const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
    barrier.position.set(x, 0, z);
    barrier.castShadow = true;
    scene.add(barrier);
    return barrier;
  }

  // Track-side neon barriers
  const leftBarriers = [];
  const rightBarriers = [];
  for (let i = -100; i < 100; i += 10) {
    leftBarriers.push(createNeonBarrier(-25, i, 0x00f3ff));
    rightBarriers.push(createNeonBarrier(25, i, 0xff003c));
  }

  // Add track patterns, similar to TRON style
  function createTrackLine(x, z) {
    const lineGeometry = new THREE.PlaneGeometry(0.5, 5);
    const lineMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.7
    });
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, -0.48, z);
    return line;
  }

  // Center track lines
  for (let i = -100; i < 100; i += 10) {
    scene.add(createTrackLine(0, i));
  }

  // Create finish line - neon style
  const finishLineGeometry = new THREE.PlaneGeometry(50, 5);
  const finishLineMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });
  const finishLine = new THREE.Mesh(finishLineGeometry, finishLineMaterial);
  finishLine.rotation.x = -Math.PI / 2;
  finishLine.position.set(0, -0.48, -90);
  scene.add(finishLine);

  // Update loading progress
  document.getElementById('loadingProgress').style.width = '50%';
  document.getElementById('loadingText').textContent = 'Generating cyberpunk buildings...';

  // Create cyberpunk-style buildings
  function createBuilding(x, z, width, depth, height, color) {
    const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
    const buildingMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x111111,
      metalness: 0.7,
      roughness: 0.3
    });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.set(x, height/2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);

    // Add window textures
    const windowCount = Math.floor(height / 2);
    for (let i = 0; i < windowCount; i++) {
      const windowY = -height/2 + 1 + i * 2;

      // Front and back windows
      for (let j = 0; j < 3; j++) {
        const windowGeometry = new THREE.PlaneGeometry(0.8, 0.5);
        const windowMaterial = new THREE.MeshBasicMaterial({ color: color });
        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(0, windowY, depth/2 + 0.01);
        building.add(window1);
        
        const window2 = window1.clone();
        window2.position.z = -depth/2 - 0.01;
        window2.rotation.y = Math.PI;
        building.add(window2);
      }

      // Side windows
      for (let j = 0; j < 2; j++) {
        const windowGeometry = new THREE.PlaneGeometry(0.8, 0.5);
        const windowMaterial = new THREE.MeshBasicMaterial({ color: color });
        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(width/2 + 0.01, windowY, 0);
        window1.rotation.y = Math.PI / 2;
        building.add(window1);
        
        const window2 = window1.clone();
        window2.position.x = -width/2 - 0.01;
        window2.rotation.y = -Math.PI / 2;
        building.add(window2);
      }
    }

    return building;
  }

  // Create cyberpunk buildings outside the track
  const buildings = [];

  // Left side building cluster
  for (let z = -80; z < 40; z += 20) {
    const height = 5 + Math.random() * 15;
    const width = 5 + Math.random() * 8;
    const depth = 5 + Math.random() * 8;
    const x = -35 - Math.random() * 10;
    const color = Math.random() > 0.5 ? 0x00f3ff : 0xff003c;
    buildings.push(createBuilding(x, z, width, depth, height, color));
  }

  // Right side building cluster
  for (let z = -80; z < 40; z += 20) {
    const height = 5 + Math.random() * 15;
    const width = 5 + Math.random() * 8;
    const depth = 5 + Math.random() * 8;
    const x = 35 + Math.random() * 10;
    const color = Math.random() > 0.5 ? 0x00f3ff : 0xff003c;
    buildings.push(createBuilding(x, z, width, depth, height, color));
  }

  // Update loading progress
  document.getElementById('loadingProgress').style.width = '60%';
  document.getElementById('loadingText').textContent = 'Loading vehicle model...';

  // Player vehicle
  let playerCar;
  const playerCarPosition = new THREE.Vector3(0, 0, 0);
  const playerCarRotation = new THREE.Euler(0, Math.PI, 0); // Point towards negative Z

  // Create default cyberpunk-style vehicle
  function createCyberpunkCar() {
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
      color: 0x111111,
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
    const car = new THREE.Group();
    car.add(carBody, carRoof, wheelFL, wheelFR, wheelBL, wheelBR, neonStrip, headlightL, headlightR);

    return car;
  }

  // First create default vehicle
  playerCar = createCyberpunkCar();
  playerCar.position.copy(playerCarPosition);
  playerCar.rotation.copy(playerCarRotation);
  scene.add(playerCar);

  // Update loading progress
  document.getElementById('loadingProgress').style.width = '70%';
  document.getElementById('loadingText').textContent = 'Generating AI opponents...';

  // Create cyberpunk-style AI opponents
  function createAICar(color) {
    // Body
    const carBodyGeometry = new THREE.BoxGeometry(2, 0.6, 4);
    const carBodyMaterial = new THREE.MeshStandardMaterial({ 
      color: color,
      metalness: 0.9,
      roughness: 0.1,
      emissive: color,
      emissiveIntensity: 0.2
    });
    const carBody = new THREE.Mesh(carBodyGeometry, carBodyMaterial);
    carBody.position.y = 0.3;
    carBody.castShadow = true;

    // Roof
    const carRoofGeometry = new THREE.BoxGeometry(1.8, 0.4, 1.8);
    const carRoofMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x111111,
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
    const neonStripMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const neonStrip = new THREE.Mesh(neonStripGeometry, neonStripMaterial);
    neonStrip.position.y = 0.05;
    neonStrip.position.z = -1.9;

    // Combine all parts
    const car = new THREE.Group();
    car.add(carBody, carRoof, wheelFL, wheelFR, wheelBL, wheelBR, neonStrip);

    return car;
  }

  // Create AI racers
  function createAIRacers() {
    const carColors = [0xff003c, 0xfd0, 0x00f3ff, 0xff00ff];

    for (let i = 0; i < 4; i++) {
      const aiCar = createAICar(carColors[i]);

      // Position AI vehicles at different positions on the track
      const lanePosition = -15 + (i * 10); // Spread across different lanes
      aiCar.position.set(lanePosition, 0, -20 - i * 10);
      aiCar.rotation.y = Math.PI; // Same direction as player
      scene.add(aiCar);

      // Save AI vehicle info
      gameState.aiCars.push({
        mesh: aiCar,
        speed: 0.1 + Math.random() * 0.1, // Random speed
        targetX: lanePosition, // Target X position (lane)
        changeLaneTime: 0, // Next lane change time
        laps: 0,
        crossedFinishLine: false
      });
    }

    console.log(`Created ${gameState.aiCars.length} AI racers`);
  }

  // Generate AI opponents
  createAIRacers();

  // Update loading progress
  document.getElementById('loadingProgress').style.width = '75%';
  document.getElementById('loadingText').textContent = 'Building AI path system...';

  // Create AI path - using CatmullRomCurve3
  let aiPath = null;

  if (typeof THREE.CatmullRomCurve3 === 'function') {
    // Create track path points
    const trackPoints = [
      new THREE.Vector3(0, 0, 10),
      new THREE.Vector3(-10, 0, -10),
      new THREE.Vector3(-15, 0, -30),
      new THREE.Vector3(-5, 0, -50),
      new THREE.Vector3(5, 0, -70),
      new THREE.Vector3(15, 0, -85),
      new THREE.Vector3(0, 0, -90),
      new THREE.Vector3(-15, 0, -85),
      new THREE.Vector3(-5, 0, -70),
      new THREE.Vector3(10, 0, -50),
      new THREE.Vector3(15, 0, -30),
      new THREE.Vector3(10, 0, -10)
    ];

    // Create closed curve
    aiPath = new THREE.CatmullRomCurve3(trackPoints);
    aiPath.closed = true;

    // Visualize path (optional)
    const pathGeometry = new THREE.BufferGeometry().setFromPoints(aiPath.getPoints(100));
    const pathMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
    const pathLine = new THREE.Line(pathGeometry, pathMaterial);
    // scene.add(pathLine); // Uncomment to show path

    // Assign path parameters to each AI racer
    gameState.aiCars.forEach((ai, index) => {
      ai.pathT = index * 0.25; // Initial position along path, evenly distributed
      ai.pathSpeed = 0.0005 + Math.random() * 0.0005; // Path movement speed
    });
  } else {
    console.warn('CatmullRomCurve3 not loaded, using basic AI movement');
  }

  // Try loading GLB model
  if (typeof THREE.GLTFLoader === 'function') {
    const loader = new THREE.GLTFLoader();

    console.log('Attempting to load vehicle model...');

    // First check if model exists
    fetch('./models/car.glb', { method: 'HEAD' })
      .then(response => {
        if (!response.ok) {
          console.warn('Model file not found, using default car');
          document.getElementById('loadingProgress').style.width = '95%';
          document.getElementById('loadingText').textContent = 'Using default car';
          return;
        }
        
        // If file exists, load it
        loader.load(
          './models/car.glb',
          function(gltf) {
            console.log('Vehicle model loaded successfully!');
            scene.remove(playerCar); // Remove default vehicle
            
            playerCar = gltf.scene;
            playerCar.scale.set(1, 1, 1);
            playerCar.position.copy(playerCarPosition);
            playerCar.rotation.copy(playerCarRotation);
            
            // Add cyberpunk style to model
            playerCar.traverse((node) => {
              if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                
                // Modify material to cyberpunk style
                if (node.material) {
                  node.material.metalness = 0.8;
                  node.material.roughness = 0.2;
                  
                  // Add glow effect
                  node.material.emissive = new THREE.Color(0x00f3ff);
                  node.material.emissiveIntensity = 0.2;
                }
              }
            });
            
            scene.add(playerCar);
            console.log('Cyberpunk vehicle added to scene');
            
            document.getElementById('loadingProgress').style.width = '100%';
            document.getElementById('loadingText').textContent = 'Quantum engine downloaded';
          },
          function(xhr) {
            if (xhr.lengthComputable) {
              const percentComplete = xhr.loaded / xhr.total * 100;
              const totalProgress = 75 + percentComplete * 0.2;
              document.getElementById('loadingProgress').style.width = totalProgress + '%';
              document.getElementById('loadingText').textContent = 'Quantum engine download: ' + Math.round(percentComplete) + '%';
            }
          },
          function(error) {
            console.warn('Vehicle model failed to load:', error);
            console.log('Using default cyberpunk vehicle');
            
            document.getElementById('loadingProgress').style.width = '95%';
            document.getElementById('loadingText').textContent = 'Using backup cyber engine';
          }
        );
      })
      .catch(error => {
        console.warn('Error checking for model:', error);
        document.getElementById('loadingProgress').style.width = '95%';
        document.getElementById('loadingText').textContent = 'Using backup cyber engine';
      });
  } else {
    console.warn('GLTFLoader unavailable, using default vehicle');
    document.getElementById('loadingProgress').style.width = '95%';
    document.getElementById('loadingText').textContent = 'Using backup cyber engine';
  }

  // Set camera position
  camera.position.set(0, 3, 8); // Position camera above and behind vehicle
  camera.lookAt(0, 0, 0);

  // Update loading progress
  document.getElementById('loadingProgress').style.width = '90%';
  document.getElementById('loadingText').textContent = 'Initializing control system...';

  // Create or update UI display
  function updateUI() {
    const speedElement = document.getElementById('speedValue');
    const scoreElement = document.getElementById('scoreValue');
    const lapsElement = document.getElementById('lapsValue');

    if (speedElement && scoreElement && lapsElement) {
      speedElement.textContent = Math.floor(gameState.speed * 300); // Convert speed to km/h
      scoreElement.textContent = gameState.score;
      lapsElement.textContent = gameState.laps;
    }
  }

  // Keyboard control state - CRITICAL FIX: moved to global scope at top of file
  const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    arrowUp: false,
    arrowDown: false,
    arrowLeft: false,
    arrowRight: false,
    shift: false // New: Shift key for boost
  };

  // Update key state (key down) - CRUCIAL FIX: Use document instead of window for event listeners
  // Note: We're using two sets of key state tracking for redundancy and to ensure both work
  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    console.log("Key pressed in main handler:", key); // Debug key presses

    switch (key) {
      case "w": keys.w = true; break;
      case "a": keys.a = true; break;
      case "s": keys.s = true; break;
      case "d": keys.d = true; break;
      case "arrowup": keys.arrowUp = true; break;
      case "arrowdown": keys.arrowDown = true; break;
      case "arrowleft": keys.arrowLeft = true; break;
      case "arrowright": keys.arrowRight = true; break;
      case "shift": keys.shift = true; break;
    }
  });

  // Update key state (key up)
  document.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();

    switch (key) {
      case "w": keys.w = false; break;
      case "a": keys.a = false; break;
      case "s": keys.s = false; break;
      case "d": keys.d = false; break;
      case "arrowup": keys.arrowUp = false; break;
      case "arrowdown": keys.arrowDown = false; break;
      case "arrowleft": keys.arrowLeft = false; break;
      case "arrowright": keys.arrowRight = false; break;
      case "shift": keys.shift = false; break;
    }
  });

  // Set up touch controls
  const touchControls = {
    setupTouchControls: function() {
      // Accelerate button
      document.getElementById('accelerate').addEventListener('touchstart', () => { keys.w = true; });
      document.getElementById('accelerate').addEventListener('touchend', () => { keys.w = false; });
      document.getElementById('accelerate').addEventListener('mousedown', () => { keys.w = true; });
      document.getElementById('accelerate').addEventListener('mouseup', () => { keys.w = false; });

      // Brake button
      document.getElementById('brake').addEventListener('touchstart', () => { keys.s = true; });
      document.getElementById('brake').addEventListener('touchend', () => { keys.s = false; });
      document.getElementById('brake').addEventListener('mousedown', () => { keys.s = true; });
      document.getElementById('brake').addEventListener('mouseup', () => { keys.s = false; });

      // Left turn button
      document.getElementById('turn-left').addEventListener('touchstart', () => { keys.a = true; });
      document.getElementById('turn-left').addEventListener('touchend', () => { keys.a = false; });
      document.getElementById('turn-left').addEventListener('mousedown', () => { keys.a = true; });
      document.getElementById('turn-left').addEventListener('mouseup', () => { keys.a = false; });

      // Right turn button
      document.getElementById('turn-right').addEventListener('touchstart', () => { keys.d = true; });
      document.getElementById('turn-right').addEventListener('touchend', () => { keys.d = false; });
      document.getElementById('turn-right').addEventListener('mousedown', () => { keys.d = true; });
      document.getElementById('turn-right').addEventListener('mouseup', () => { keys.d = false; });

      console.log('Touch controls set up');
    }
  };

  // Initialize touch controls
  touchControls.setupTouchControls();

  // Store particle effect update functions
  const particleEffects = [];

  // Handle collision detection
  // Create collision particle effect
  function createCollisionParticles(x, y, z) {
    const particleCount = 50;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Random position
      particlePositions[i3] = x + (Math.random() - 0.5) * 2;
      particlePositions[i3 + 1] = y + Math.random() * 2;
      particlePositions[i3 + 2] = z + (Math.random() - 0.5) * 2;

      // Random color - blue or red
      const color = Math.random() > 0.5 ? new THREE.Color(0x00f3ff) : new THREE.Color(0xff003c);
      particleColors[i3] = color.r;
      particleColors[i3 + 1] = color.g;
      particleColors[i3 + 2] = color.b;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Particle animation and auto-removal
    const particleLife = {
      velocities: [],
      age: 0,
      maxAge: 60 // Particle lifetime in frames
    };

    // Set initial velocities for each particle
    for (let i = 0; i < particleCount; i++) {
      particleLife.velocities.push({
        x: (Math.random() - 0.5) * 0.2,
        y: Math.random() * 0.2,
        z: (Math.random() - 0.5) * 0.2
      });
    }

    // Add to update queue
    const updateParticles = () => {
      if (particleLife.age >= particleLife.maxAge) {
        scene.remove(particles);
        particles.geometry.dispose();
        particles.material.dispose();
        return false; // No more updates
      }

      const positions = particles.geometry.attributes.position.array;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const velocity = particleLife.velocities[i];
        
        // Update position
        positions[i3] += velocity.x;
        positions[i3 + 1] += velocity.y;
        positions[i3 + 2] += velocity.z;
        
        // Simulate gravity
        velocity.y -= 0.005;
      }

      particles.geometry.attributes.position.needsUpdate = true;

      // Decrease opacity with time
      particles.material.opacity = 1 - (particleLife.age / particleLife.maxAge);

      particleLife.age++;
      return true; // Continue updating
    };

    particleEffects.push(updateParticles);
  }

  function checkCollisions() {
    // Check for boundary collisions
    const boundaryX = 24;
    if (playerCar.position.x < -boundaryX || playerCar.position.x > boundaryX) {
      // Hit boundary, slow down and show particle effect
      gameState.speed *= 0.85;
      createCollisionParticles(playerCar.position.x > 0 ? boundaryX : -boundaryX, playerCar.position.y, playerCar.position.z);
      console.log('Hit boundary!');
    }

    // Check for AI vehicle collisions
    for (const ai of gameState.aiCars) {
      if (!ai.mesh) continue;

      const distance = playerCar.position.distanceTo(ai.mesh.position);
      if (distance < 3) {
        // Collision with AI vehicle, slow down
        gameState.speed *= 0.75;
        ai.speed *= 0.8;
        
        // Create collision particle effect
        createCollisionParticles(
          (playerCar.position.x + ai.mesh.position.x) / 2,
          (playerCar.position.y + ai.mesh.position.y) / 2,
          (playerCar.position.z + ai.mesh.position.z) / 2
        );
        
        // Nudge vehicle position to create collision effect
        const pushDirection = new THREE.Vector3()
          .subVectors(playerCar.position, ai.mesh.position)
          .normalize();
        playerCar.position.add(pushDirection.multiplyScalar(0.3));
        
        console.log('Hit AI vehicle!');
      }
    }
  }