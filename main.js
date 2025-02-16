import './style.css'
import * as THREE from 'three'
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import gsap from 'gsap'
import { LoadingManager } from 'three'

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~`";
const scrambleText = document.querySelector("#scramble-text");
let interval = null;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 3.5;

const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector("#canvas"),
    antialias: true,
    alpha: true,
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputEncoding = THREE.sRGBEncoding;

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const rgbShiftPass = new ShaderPass(RGBShiftShader);
rgbShiftPass.uniforms['amount'].value = 0.0030;
composer.addPass(rgbShiftPass);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

let model;

const loadingManager = new LoadingManager();
const loadingScreen = document.getElementById('loading-screen');
const mainContent = document.getElementById('main-content');
const loadingBar = document.getElementById('loading-bar');

function startScramble() {
    let iteration = 0;
    const originalText = scrambleText.innerText;
    
    clearInterval(interval);
    
    interval = setInterval(() => {
        scrambleText.innerText = scrambleText.innerText
            .split("")
            .map((letter, index) => {
                if(index < iteration) {
                    return originalText[index];
                }
                return letters[Math.floor(Math.random() * letters.length)]
            })
            .join("");
        
        if(iteration >= originalText.length) {
            clearInterval(interval);
            setTimeout(() => startScramble(), 1000);
        }
        
        iteration += 1/3;
    }, 30);
}

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    const progress = (itemsLoaded / itemsTotal) * 100;
    loadingBar.style.width = progress + '%';
    scrambleText.innerText = `INITIALIZING`;
    startScramble();
};

loadingManager.onLoad = () => {
    loadingBar.style.width = '100%';
    scrambleText.innerText = "WELCOME";
    startScramble();
    
    // More cinematic transition sequence
    setTimeout(() => {
        // First, scale and fade the loading bar
        gsap.to(loadingBar, {
            scaleX: 1.2,
            duration: 0.5,
            ease: "power2.in"
        });
        gsap.to(loadingBar, {
            opacity: 0,
            duration: 0.5,
            delay: 0.2,
            ease: "power2.in"
        });
        
        // Scale and fade the scramble text
        gsap.to(scrambleText, {
            scale: 1.2,
            opacity: 0,
            duration: 0.5,
            delay: 0.3,
            ease: "power2.in"
        });

        // Transition the loading screen with a scale effect
        gsap.to(loadingScreen, {
            opacity: 0,
            scale: 1.1,
            duration: 1,
            delay: 0.5,
            ease: "power2.inOut",
            onComplete: () => {
                loadingScreen.style.display = 'none';
                clearInterval(interval);
            }
        });

        // Fade in main content with a slight scale up
        gsap.fromTo(mainContent, 
            {
                opacity: 0,
                scale: 0.95
            },
            {
                opacity: 1,
                scale: 1,
                duration: 1.5,
                delay: 0.8,
                ease: "power2.out"
            }
        );
        
    }, 3000);
};

const loader = new GLTFLoader(loadingManager);
const rgbeLoader = new RGBELoader(loadingManager);

rgbeLoader.load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/pond_bridge_night_1k.hdr', function(texture) {
    const envmap = pmremGenerator.fromEquirectangular(texture).texture;
    // scene.background = envmap;
    scene.environment = envmap;
    texture.dispose();
    pmremGenerator.dispose();

    const loader = new GLTFLoader();
    loader.load('./DamagedHelmet.gltf', (gltf) => {
        model = gltf.scene;
        scene.add(model);
    }, undefined, (error) => {
        console.error(error);
    });
});

window.addEventListener('mousemove', (e) => {
    if (model) {
        const rotationX = (e.clientX / window.innerHeight - 0.5) * (Math.PI * 0.1);
        const rotationY = (e.clientY / window.innerWidth - 0.5) * (Math.PI * 0.1);
        gsap.to(model.rotation, {
            x: rotationY,
            y: rotationX,
            duration: 0.8,
            ease: 'power2.Out'
        });
    }

    // Add parallax effect to stars
    if (starsEnabled) {
        const mouseX = (e.clientX / window.innerWidth) - 0.5;
        const mouseY = (e.clientY / window.innerHeight) - 0.5;

        stars.forEach(star => {
            const depth = parseFloat(star.style.opacity) * 20; // Use opacity as depth factor
            const originalX = parseFloat(star.dataset.originalX);
            const originalY = parseFloat(star.dataset.originalY);
            
            gsap.to(star, {
                left: `${originalX - (mouseX * depth)}%`,
                top: `${originalY - (mouseY * depth)}%`,
                duration: 1,
                ease: 'power2.out'
            });
        });
    }
});

function adjustCameraForMobile() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        camera.position.z = 5; // Move camera further back on mobile
    } else {
        camera.position.z = 3.5; // Original position for desktop
    }
    camera.updateProjectionMatrix();
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    adjustCameraForMobile();
});

// Call this initially
adjustCameraForMobile();

// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;

function animate(){
    window.requestAnimationFrame(animate);
    // controls.update();
    // scene.rotateY(0.001);
    composer.render();
}
animate()

// Add these styles at the start of the file after imports
document.querySelector("#loading-screen > div").style.transform = "translateZ(0)";
scrambleText.style.transform = "translateZ(0)";
loadingBar.style.transform = "translateZ(0)";

function createStar() {
    const star = document.createElement('div');
    star.className = 'star absolute w-1 h-1 bg-white rounded-full';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.opacity = Math.random();
    // Store original position for parallax effect
    star.dataset.originalX = star.style.left;
    star.dataset.originalY = star.style.top;
    star.style.animation = `twinkle ${4 + Math.random() * 3}s infinite ${Math.random() * 2}s`;
    return star;
}

const starsContainer = document.getElementById('stars-container');
const starsToggle = document.getElementById('stars-toggle');
const starsIndicator = document.getElementById('stars-indicator');
let starsEnabled = false;

const stars = Array(300).fill(null).map(createStar);

starsToggle.addEventListener('click', () => {
    starsEnabled = !starsEnabled;
    starsIndicator.classList.toggle('bg-red-500');
    starsIndicator.classList.toggle('bg-green-500');
    
    if (starsEnabled) {
        starsContainer.classList.remove('hidden');
        if (starsContainer.children.length === 0) {
            stars.forEach(star => starsContainer.appendChild(star));
        }
    } else {
        starsContainer.classList.add('hidden');
    }
});
