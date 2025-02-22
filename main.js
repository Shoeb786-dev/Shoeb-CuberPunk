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
import { debounce } from 'lodash-es'

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

// Cache DOM selections
const domElements = {
    canvas: document.querySelector("#canvas"),
    loadingScreen: document.getElementById('loading-screen'),
    mainContent: document.getElementById('main-content'),
    loadingBar: document.getElementById('loading-bar'),
    scrambleText: document.querySelector("#scramble-text"),
    starsContainer: document.getElementById('stars-container'),
    starsToggle: document.getElementById('stars-toggle')
};

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

// Optimize mousemove handler with debounce
window.addEventListener('mousemove', debounce((e) => {
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

    if (starsEnabled) {
        requestAnimationFrame(() => {
            const mouseX = (e.clientX / window.innerWidth) - 0.5;
            const mouseY = (e.clientY / window.innerHeight) - 0.5;

            stars.forEach(star => {
                const depth = parseFloat(star.style.opacity) * 20;
                const originalX = parseFloat(star.dataset.originalX);
                const originalY = parseFloat(star.dataset.originalY);
                
                gsap.to(star, {
                    left: `${originalX - (mouseX * depth)}%`,
                    top: `${originalY - (mouseY * depth)}%`,
                    duration: 1,
                    ease: 'power2.out'
                });
            });
        });
    }
}, 16)); // Approximately 60fps

function adjustCameraForMobile() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        camera.position.z = 5; // Move camera further back on mobile
    } else {
        camera.position.z = 3.5; // Original position for desktop
    }
    camera.updateProjectionMatrix();
}

// Optimize resize handler
window.addEventListener('resize', debounce(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    adjustCameraForMobile();
}, 250));

// Call this initially
adjustCameraForMobile();

// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;

// Use intersection observer for lazy loading
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
});

// Optimize star creation
const createStarFragment = () => {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 100; i++) {
        fragment.appendChild(createStar());
    }
    return fragment;
};

// Optimize animation loop
let lastTime = 0;
const targetFPS = 60;
const frameInterval = 1000 / targetFPS;

function animate(currentTime) {
    window.requestAnimationFrame(animate);
    
    const deltaTime = currentTime - lastTime;
    if (deltaTime < frameInterval) return;
    
    lastTime = currentTime - (deltaTime % frameInterval);
    composer.render();
}

// Initialize stars only when needed
const initializeStars = () => {
    if (!domElements.starsContainer.children.length) {
        domElements.starsContainer.appendChild(createStarFragment());
    }
};

// Optimize model loading
const loadModel = async () => {
    try {
        const gltf = await loader.loadAsync('./DamagedHelmet.gltf');
        model = gltf.scene;
        scene.add(model);
    } catch (error) {
        console.error('Error loading model:', error);
    }
};

// Start animation
animate(0);

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
    star.dataset.originalX = star.style.left;
    star.dataset.originalY = star.style.top;
    return star;
}

const starsContainer = document.getElementById('stars-container');
const starsToggle = document.getElementById('stars-toggle');
let starsEnabled = false;
let isGlowing = false;

const stars = Array(100).fill(null).map(createStar);

// Add these helper functions at the top of your file
function disableScroll() {
    // Store the current scroll position
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    // Add styles to prevent scrolling
    document.body.style.cssText = `
        overflow: hidden !important;
        position: fixed !important;
        top: -${scrollPosition}px !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        height: 100vh !important;
    `;
    
    // Also prevent touch scrolling
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('wheel', preventScroll, { passive: false });
}

function enableScroll() {
    // Get the scroll position from the body's top position
    const scrollPosition = Math.abs(parseInt(document.body.style.top || '0'));
    
    // Remove all the styles we added
    document.body.style.cssText = '';
    
    // Remove event listeners
    document.removeEventListener('touchmove', preventScroll);
    document.removeEventListener('wheel', preventScroll);
    
    // Restore scroll position
    window.scrollTo(0, scrollPosition);
}

// Prevent default scroll behavior
function preventScroll(e) {
    e.preventDefault();
}

starsToggle.addEventListener('click', () => {
    starsEnabled = !starsEnabled;
    isGlowing = !isGlowing;
    
    if (starsEnabled) {
        disableScroll();
        starsContainer.classList.remove('hidden');
        if (starsContainer.children.length === 0) {
            stars.forEach(star => starsContainer.appendChild(star));
        }
        // Add glow and blinking effect to stars
        stars.forEach(star => {
            // Random delay for natural effect
            const delay = Math.random() * 2;
            const duration = 1 + Math.random() * 2;
            
            gsap.to(star, {
                boxShadow: '0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px rgba(255, 255, 255, 0.7), 0 0 45px rgba(255, 255, 255, 0.5)',
                scale: 1.5,
                duration: duration,
                repeat: -1,
                yoyo: true,
                delay: delay,
                ease: "power1.inOut",
                opacity: gsap.utils.random(0.2, 1),
            });
        });
    } else {
        enableScroll();
        // Immediately hide the container
        starsContainer.classList.add('hidden');
        // Clear any existing GSAP animations
        stars.forEach(star => {
            gsap.killTweensOf(star);
            gsap.set(star, {
                boxShadow: 'none',
                scale: 1,
                opacity: 0
            });
        });
    }
});
