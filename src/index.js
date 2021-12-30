import { 
    Clock,
    PerspectiveCamera,
    Scene, 
    Geometry,
    Vector3, 
    Color, 
    Face3, 
    Mesh,
    WebGLRenderer,
    AmbientLight,
    DirectionalLight,
    MeshBasicMaterial,
    FaceColors,
    Group
} from 'three';
    
import { OrbitControls } from './OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

var clock = new Clock();
var wad;

var params = {
    map: "E1M2",
    loadMap: loadMap
};

function loadMap() {
    alert(`load map ${params.map}`);
    renderToThreeJs(wad, params.map);
}

var gui = new GUI();
    
gui.add(params, 'map').name('Map');
gui.add(params, 'loadMap').name('Load map');

var renderer;
var stats;
var scene;
var camera;
var controls;

const stickerSize = 9;
const cubeletSize = 10;


var mat = 
    new MeshBasicMaterial({
        wireframe: false,
        vertexColors: FaceColors,
        map: null,
        transparent: false,
        alphaTest: 0.01
    });

var colors = [
    new Color((128 << 24) | (128 << 16) | (24 <<  8)  | ( 24 <<  0)), // ARGB red
    new Color((128 << 24) | (192 << 16) | (192 <<  8) | (192 <<  0)), // ARGB white
    new Color((128 << 24) | (192 << 16) | (192 <<  8) | ( 24 <<  0)), // ARGB yellow
    new Color((128 << 24) | ( 24 << 16) | (192 <<  8) | ( 24 <<  0)), // ARGB green
    new Color((128 << 24) | ( 24 << 16) | ( 24 <<  8) | (192 <<  0)), // ARGB blue
    new Color((128 << 24) | (192 << 16) | ( 96 <<  8) | ( 24 <<  0))  // ARGB orange
];

function setupThreeJs() {
    renderer = new WebGLRenderer({
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    stats = new Stats();
    document.body.appendChild(stats.dom);

    function animate() {               
        stats.update();

        if (scene && camera && controls) {
            var delta = clock.getDelta();        
            controls.update(delta);
        }

        requestAnimationFrame(animate);

        if (scene && camera) {
            renderer.render(scene, camera);
        }
    }

    animate();
}

function renderToThreeJs() {
    scene = new Scene();
    camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 20000);

    camera.position.set(0, 0, 400);

    controls = new OrbitControls(camera, renderer.domElement);
    //controls.autoRotate = true;
    controls.enableDamping = true;
    controls.update();

    // Lights
    var light = new AmbientLight(0x404040);
    scene.add(light);

    // White directional light at half intensity
    var directionalLight = new DirectionalLight(0xffffff, 0.5);
    directionalLight.position.x = 1;
    directionalLight.position.y = 1;
    directionalLight.position.z = 1;

    scene.add(directionalLight);

    buildScene(scene);
}

function buildCubelet(frontColorIndex, rightColorIndex, topColorIndex, backColorIndex, leftColorIndex, bottomColorIndex) {
    var geometry = new Geometry();

    // "Front"
    geometry.vertices.push(new Vector3(-stickerSize, -stickerSize,  cubeletSize));
    geometry.vertices.push(new Vector3( stickerSize, -stickerSize,  cubeletSize));
    geometry.vertices.push(new Vector3( stickerSize,  stickerSize,  cubeletSize));
    geometry.vertices.push(new Vector3(-stickerSize,  stickerSize,  cubeletSize));

    // "Right"
    geometry.vertices.push(new Vector3( cubeletSize, -stickerSize, -stickerSize));
    geometry.vertices.push(new Vector3( cubeletSize,  stickerSize, -stickerSize));
    geometry.vertices.push(new Vector3( cubeletSize,  stickerSize,  stickerSize));
    geometry.vertices.push(new Vector3( cubeletSize, -stickerSize,  stickerSize));

    // "Top"
    geometry.vertices.push(new Vector3(-stickerSize, cubeletSize, -stickerSize));
    geometry.vertices.push(new Vector3( stickerSize, cubeletSize, -stickerSize));
    geometry.vertices.push(new Vector3( stickerSize, cubeletSize,  stickerSize));
    geometry.vertices.push(new Vector3(-stickerSize, cubeletSize,  stickerSize));

    // "Back"
    geometry.vertices.push(new Vector3(-stickerSize, -stickerSize, -cubeletSize));
    geometry.vertices.push(new Vector3( stickerSize, -stickerSize, -cubeletSize));
    geometry.vertices.push(new Vector3( stickerSize,  stickerSize, -cubeletSize));
    geometry.vertices.push(new Vector3(-stickerSize,  stickerSize, -cubeletSize));

    // "Left"
    geometry.vertices.push(new Vector3(-cubeletSize, -stickerSize, -stickerSize));
    geometry.vertices.push(new Vector3(-cubeletSize,  stickerSize, -stickerSize));
    geometry.vertices.push(new Vector3(-cubeletSize,  stickerSize,  stickerSize));
    geometry.vertices.push(new Vector3(-cubeletSize, -stickerSize,  stickerSize));

    // "Bottom"
    geometry.vertices.push(new Vector3(-stickerSize, -cubeletSize, -stickerSize));
    geometry.vertices.push(new Vector3( stickerSize, -cubeletSize, -stickerSize));
    geometry.vertices.push(new Vector3( stickerSize, -cubeletSize,  stickerSize));
    geometry.vertices.push(new Vector3(-stickerSize, -cubeletSize,  stickerSize));
    
    var normalThatIsOverriddenLater = new Vector3(0, 0, 1);

    if (frontColorIndex != null) {
        geometry.faces.push(new Face3(0, 1, 2, normalThatIsOverriddenLater, colors[frontColorIndex], 0));
        geometry.faces.push(new Face3(0, 2, 3, normalThatIsOverriddenLater, colors[frontColorIndex], 0));
    }

    if (rightColorIndex != null) {
        geometry.faces.push(new Face3(4, 5, 6, normalThatIsOverriddenLater, colors[rightColorIndex], 0));
        geometry.faces.push(new Face3(4, 6, 7, normalThatIsOverriddenLater, colors[rightColorIndex], 0));
    }

    if (topColorIndex != null) {
        geometry.faces.push(new Face3(8, 10, 9, normalThatIsOverriddenLater, colors[topColorIndex], 0));
        geometry.faces.push(new Face3(8, 11, 10, normalThatIsOverriddenLater, colors[topColorIndex], 0));
    }

    if (backColorIndex != null) {
        geometry.faces.push(new Face3(12, 14, 13, normalThatIsOverriddenLater, colors[backColorIndex], 0));
        geometry.faces.push(new Face3(12, 15, 14, normalThatIsOverriddenLater, colors[backColorIndex], 0));
    }

    if (leftColorIndex != null) {
        geometry.faces.push(new Face3(16, 18, 17, normalThatIsOverriddenLater, colors[leftColorIndex], 0));
        geometry.faces.push(new Face3(16, 19, 18, normalThatIsOverriddenLater, colors[leftColorIndex], 0));
    }

    if (bottomColorIndex != null) {
        geometry.faces.push(new Face3(20, 21, 22, normalThatIsOverriddenLater, colors[bottomColorIndex], 0));
        geometry.faces.push(new Face3(20, 22, 23, normalThatIsOverriddenLater, colors[bottomColorIndex], 0));
    }

    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

    var mesh = new Mesh(geometry, mat);

    return mesh;
}

function buildAndAddCubelet(scene, frontColorIndex, rightColorIndex, topColorIndex, backColorIndex, leftColorIndex, bottomColorIndex, xOffset, yOffset, zOffset) {
    var mesh = buildCubelet(frontColorIndex, rightColorIndex, topColorIndex, backColorIndex, leftColorIndex, bottomColorIndex);

    var grp = new Group();

    grp.add(mesh);

    grp.position.set(cubeletSize * 2 * xOffset, cubeletSize * 2 * yOffset, cubeletSize * 2 * zOffset);

    scene.add(grp);
}

function buildScene(scene) {
    buildAndAddCubelet(scene,    0, null,    2, null,    4, null, -1,  1,  1); // top left
    buildAndAddCubelet(scene,    0, null,    2, null, null, null,  0,  1,  1); // top middle
    buildAndAddCubelet(scene,    0,    1,    2, null, null, null,  1,  1,  1); // top right
    buildAndAddCubelet(scene,    0, null, null, null,    4, null, -1,  0,  1); // middle left
    buildAndAddCubelet(scene,    0, null, null, null, null, null,  0,  0,  1); // centre
    buildAndAddCubelet(scene,    0,    1, null, null, null, null,  1,  0,  1); // middle left
    buildAndAddCubelet(scene,    0, null, null, null,    4,    5, -1, -1,  1); // bottom left
    buildAndAddCubelet(scene,    0, null, null, null, null,    5,  0, -1,  1); // bottom middle
    buildAndAddCubelet(scene,    0,    1, null, null, null,    5,  1, -1,  1); // top right
}

setupThreeJs();

renderToThreeJs();