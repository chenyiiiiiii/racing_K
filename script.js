// 等待DOM和Three.js庫完全加載
window.addEventListener('DOMContentLoaded', (event) => {
    // 確保Three.js已經載入
    if (typeof THREE === 'undefined') {
        console.error('Three.js not loaded!');
        return;
    }

    // 1. 創建 Three.js 場景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // 天空藍色背景
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    const gameContainer = document.getElementById("gameContainer");
    if (!gameContainer) {
        console.error("gameContainer not found!");
        return;
    }
    gameContainer.appendChild(renderer.domElement);

    // 2. 加入光線
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5).normalize();
    scene.add(light);

    // 添加環境光，使車模型更加明顯
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);

    // 創建簡易地面
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // 水平放置
    ground.position.y = -0.5;
    scene.add(ground);

    // 設定賽道標記
    function createRoadMarking(x, z) {
        const markingGeometry = new THREE.PlaneGeometry(0.5, 2);
        const markingMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const marking = new THREE.Mesh(markingGeometry, markingMaterial);
        marking.rotation.x = -Math.PI / 2;
        marking.position.set(x, -0.49, z);
        return marking;
    }

    // 添加幾個道路標記
    for (let i = -20; i < 20; i += 5) {
        scene.add(createRoadMarking(0, i));
    }

    // 3. 載入 .glb 模型
    let car;
    if (typeof THREE.GLTFLoader === 'function') {
        const loader = new THREE.GLTFLoader();
        
        // 顯示載入消息
        console.log('Attempting to load car model...');
        
        // 暫時加入一個臨時車輛(紅色立方體)
        const tempCarGeometry = new THREE.BoxGeometry(1, 0.5, 2);
        const tempCarMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        car = new THREE.Mesh(tempCarGeometry, tempCarMaterial);
        car.position.y = 0;
        scene.add(car);
        
        // 嘗試載入真實車輛模型
        try {
            loader.load(
                './models/car.glb', // 確保路徑正確
                function(gltf) {
                    scene.remove(car); // 移除臨時車輛
                    car = gltf.scene;
                    car.scale.set(1, 1, 1);
                    car.position.set(0, 0, 0);
                    scene.add(car);
                    console.log('Car model loaded successfully!');
                },
                function(xhr) {
                    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                },
                function(error) {
                    console.error('載入模型失敗:', error);
                    // 保留臨時車輛作為備用
                }
            );
        } catch (error) {
            console.error('GLTFLoader error:', error);
        }
    } else {
        console.error('GLTFLoader not available');
        
        // 創建簡單的立方體車輛作為備用
        const carGeometry = new THREE.BoxGeometry(1, 0.5, 2);
        const carMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        car = new THREE.Mesh(carGeometry, carMaterial);
        car.position.y = 0;
        scene.add(car);
    }

    // 4. 設定攝影機位置
    camera.position.set(0, 3, 8); // 將攝影機移到車後面上方
    camera.lookAt(0, 0, 0);

    // 5. 創建軌道控制器
    let controls;
    if (typeof THREE.OrbitControls === 'function') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
    } else {
        console.warn('OrbitControls not available, using default camera');
    }

    // 處理窗口大小變化
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 6. 建立動畫迴圈
    function animate() {
        requestAnimationFrame(animate);
        
        if (controls) controls.update();
        
        renderer.render(scene, camera);
    }

    // 監聽鍵盤事件
    window.addEventListener("keydown", (event) => {
        if (!car) return;
        
        const moveSpeed = 0.2;
        
        if (event.key === "ArrowLeft") {
            car.position.x -= moveSpeed;
        } else if (event.key === "ArrowRight") {
            car.position.x += moveSpeed;
        }
        
        if (event.key === "ArrowUp") {
            car.position.z -= moveSpeed;
            // 可以添加車輛旋轉效果
            // car.rotation.y = 0;
        } else if (event.key === "ArrowDown") {
            car.position.z += moveSpeed;
            // car.rotation.y = Math.PI;
        }
    });

    // 啟動動畫
    animate();
    
    console.log("Game initialized successfully!");
});