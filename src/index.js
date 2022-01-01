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
    Group,
    BoxGeometry,
    Matrix4
} from 'three';
    
import { OrbitControls } from './OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

var clock = new Clock();

var params = {
    reset: reset,
    startRandomMoves: startRandomMoves
};

var gui = new GUI();
    
gui.add(params, 'reset').name('Reset');
gui.add(params, 'startRandomMoves').name('Random moves');

var renderer;
var stats;
var scene;
var camera;
var controls;

var cubelets = [];

var rotationState = {
    cubeletsToRotate: [],
    rotationAxis: 0,
    rotationDirection: 0,
    currentRotationElapsed: 0,
    rotationInProgress: false
};

const stickerSize = 9;
const cubeletSize = 10;
const cubeletSeparation = cubeletSize * 1.5;

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
    new Color((128 << 24) | ( 24 << 16) | (128 <<  8) | ( 24 <<  0)), // ARGB green
    new Color((128 << 24) | ( 24 << 16) | ( 24 <<  8) | (192 <<  0)), // ARGB blue
    new Color((128 << 24) | (192 << 16) | ( 96 <<  8) | ( 24 <<  0))  // ARGB orange
];

var totalElapsed = 0;
var nextTimeToLog = 1;

function reset() {
    for (var i = 0; i < cubelets.length; i++) {
        cubelets[i].rotation.x = 0;
        cubelets[i].rotation.y = 0;
        cubelets[i].rotation.z = 0;
    }

    rotationState.rotationInProgress = false;
}

function startRandomMoves() {
    reset();

    rotateRandomFaces();
}

function getWorldPosOfCubelet(c) {
    // group for rotation contains
    //    group for positioning contains
    //        mesh for stickers
    //
    // we've been passed the group for rotation. so we go to its first child & ask where it is
    // in world space.
    var worldPos = new Vector3();

    c.children[0].getWorldPosition(worldPos);

    return worldPos;
}

var timeToRotate = 0.75;

// https://easings.net/#easeOutElastic
function easeOutElastic(x) {
    const c4 = (2 * Math.PI) / 3;
    
    return x === 0
      ? 0
      : x === 1
      ? 1
      : Math.pow(2.3, -8 * x) * Math.sin((x * 3 - 0.75) * c4) + 1;
}

function setupThreeJs() {
    renderer = 
        new WebGLRenderer({
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
            totalElapsed += delta;
            
            if (Math.floor(totalElapsed) > nextTimeToLog) {
                nextTimeToLog = Math.floor(totalElapsed) + 1;
            }

            controls.update(delta);

            if (rotationState.rotationInProgress) {
                rotationState.currentRotationElapsed += delta;

                var t = rotationState.currentRotationElapsed / timeToRotate;

                t = Math.min(t, 1);

                t = easeOutElastic(t);

                var isRotationComplete = t == 1;

                var rotationToApply = (Math.PI / 2) * t;

                for (var i = 0; i < rotationState.cubeletsToRotate.length; i++) {
                    var c = rotationState.cubeletsToRotate[i];

                    // Reset the cubelet's matrix to the saved (pre-animation) state
                    c.matrixAutoUpdate = false;

                    c.matrix.copy(c.preAnimationMatrix);

                    var rotationMatrix = new Matrix4();
                    switch (rotationState.rotationAxis) {
                        case 0: rotationMatrix.makeRotationX(rotationToApply * rotationState.rotationDirection); break;
                        case 1: rotationMatrix.makeRotationY(rotationToApply * rotationState.rotationDirection); break;
                        case 2: rotationMatrix.makeRotationZ(rotationToApply * rotationState.rotationDirection); break;
                    }

                    c.applyMatrix4(rotationMatrix);
                }

                if (isRotationComplete) {
                    // Stop any further rotation
                    rotationState.rotationInProgress = false;

                    if (rotationState.completionCallback) {
                        rotationState.completionCallback();
                    }
                }
            }

            scene.updateMatrixWorld();
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
    controls.autoRotate = false;
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

    const ShowGreenCore = false;
    if (ShowGreenCore) {
        const geometry = new BoxGeometry( 10, 10, 10 );
        const material = new MeshBasicMaterial( {color: 0x00ff00} );
        const cube = new Mesh( geometry, material );
        scene.add( cube );
    }

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

    var grpThatSetsPosition = new Group();

    grpThatSetsPosition.add(mesh);

    grpThatSetsPosition.position.set(cubeletSize * 2 * xOffset, cubeletSize * 2 * yOffset, cubeletSize * 2 * zOffset);

    var grpThatSetsRotationDuringAnimation = new Group();

    grpThatSetsRotationDuringAnimation.add(grpThatSetsPosition);

    scene.add(grpThatSetsRotationDuringAnimation);
    
    return grpThatSetsRotationDuringAnimation;
}

function startRotation(affectedCubelets, rotationAxis, rotationDirection, completionCallback) {
    rotationState.cubeletsToRotate = affectedCubelets;

    rotationState.rotationAxis = rotationAxis;
    rotationState.rotationDirection = rotationDirection;
    
    rotationState.currentRotationElapsed = 0;

    // Save initial transform matrix for each cubelet
    for (var i = 0; i < cubelets.length; i++) {
        cubelets[i].preAnimationMatrix = cubelets[i].matrix.clone();
    }

    rotationState.rotationInProgress = true;

    rotationState.completionCallback = completionCallback;
}

function rotateCubelets(shouldCubeletBeRotatedBasedOnPosition, axis, direction) {
    return new Promise(resolve => {
        var cubeletsToRotate = [];

        // Find the cubelets on the face that's being rotated
        for (var i = 0; i < cubelets.length; i++) {
            var pos = getWorldPosOfCubelet(cubelets[i]);
    
            if (shouldCubeletBeRotatedBasedOnPosition(pos)) {
                cubeletsToRotate.push(cubelets[i]);
            }
        }
    
        startRotation(cubeletsToRotate, axis, direction, resolve );
    });
}



function rotateRightFaceCW() {
    console.log("rotateRightFaceCW");
    return rotateCubelets(function (p) { return p.x > cubeletSeparation; }, 0, -1);
}

function rotateRightFaceCCW() {
    console.log("rotateRightFaceCCW");
    return rotateCubelets(function (p) { return p.x > cubeletSeparation; }, 0, 1);
}

function rotateLeftFaceCW() {
    console.log("rotateLeftFaceCW");
    return rotateCubelets(function (p) { return p.x < -cubeletSeparation; }, 0, 1);
}

function rotateLeftFaceCCW() {
    console.log("rotateLeftFaceCCW");
    return rotateCubelets(function (p) { return p.x < -cubeletSeparation; }, 0, -1);
}

function rotateTopFaceCW() {
    console.log("rotateTopFaceCW");
    return rotateCubelets(function (p) { return p.y > cubeletSeparation; }, 1, -1);
}

function rotateTopFaceCCW() {
    console.log("rotateTopFaceCCW");
    return rotateCubelets(function (p) { return p.y > cubeletSeparation; }, 1, 1);
}

function rotateBottomFaceCW() {
    console.log("rotateBottomFaceCW");
    return rotateCubelets(function (p) { return p.y < -cubeletSeparation; }, 1, 1);
}

function rotateBottomFaceCCW() {
    console.log("rotateBottomFaceCCW");
    return rotateCubelets(function (p) { return p.y < -cubeletSeparation; }, 1, -1);
}

function rotateFrontFaceCW() {
    console.log("rotateFrontFaceCW");
    return rotateCubelets(function (p) { return p.z > cubeletSeparation; }, 2, -1);
}

function rotateFrontFaceCCW() {
    console.log("rotateFrontFaceCCW");
    return rotateCubelets(function (p) { return p.z > cubeletSeparation; }, 2, 1);
}

function rotateBackFaceCW() {
    console.log("rotateBackFaceCW");
    return rotateCubelets(function (p) { return p.z < -cubeletSeparation; }, 2, 1);
}

function rotateBackFaceCCW() {
    console.log("rotateBackFaceCCW");
    return rotateCubelets(function (p) { return p.z < -cubeletSeparation; }, 2, -1);
}


function rotateRandomFaces() {
    var rotationNumber = Math.floor(Math.random() * 12);

    var promise;

    switch (rotationNumber)
    {
        case 0:  promise = rotateRightFaceCW();   break;
        case 1:  promise = rotateRightFaceCCW();  break;
        case 2:  promise = rotateLeftFaceCW();    break;
        case 3:  promise = rotateLeftFaceCCW();   break;
        case 4:  promise = rotateTopFaceCW();     break;
        case 5:  promise = rotateTopFaceCCW();    break;
        case 6:  promise = rotateBottomFaceCW();  break;
        case 7:  promise = rotateBottomFaceCCW(); break;
        case 8:  promise = rotateFrontFaceCW();   break;
        case 9:  promise = rotateFrontFaceCCW();  break;
        case 10: promise = rotateBackFaceCW();    break;
        case 11: promise = rotateBackFaceCCW();   break;
    }

    promise.then(rotateRandomFaces);
}

function buildScene(scene) {
    cubelets.push(buildAndAddCubelet(scene,    0, null,    2, null,    4, null, -1,  1,  1)); // front top left
    cubelets.push(buildAndAddCubelet(scene,    0, null,    2, null, null, null,  0,  1,  1)); // front top middle
    cubelets.push(buildAndAddCubelet(scene,    0,    1,    2, null, null, null,  1,  1,  1)); // front top right
    cubelets.push(buildAndAddCubelet(scene,    0, null, null, null,    4, null, -1,  0,  1)); // front middle left
    cubelets.push(buildAndAddCubelet(scene,    0, null, null, null, null, null,  0,  0,  1)); // front centre
    cubelets.push(buildAndAddCubelet(scene,    0,    1, null, null, null, null,  1,  0,  1)); // front middle right
    cubelets.push(buildAndAddCubelet(scene,    0, null, null, null,    4,    5, -1, -1,  1)); // front bottom left
    cubelets.push(buildAndAddCubelet(scene,    0, null, null, null, null,    5,  0, -1,  1)); // front bottom middle
    cubelets.push(buildAndAddCubelet(scene,    0,    1, null, null, null,    5,  1, -1,  1)); // front bottom right

    // frontColorIndex, rightColorIndex, topColorIndex, backColorIndex, leftColorIndex, bottomColorIndex, xOffset, yOffset, zOffset
    cubelets.push(buildAndAddCubelet(scene, null, null,    2, null,    4, null, -1,  1,  0)); // middle top left
    cubelets.push(buildAndAddCubelet(scene, null, null,    2, null, null, null,  0,  1,  0)); // middle top middle
    cubelets.push(buildAndAddCubelet(scene, null,    1,    2, null, null, null,  1,  1,  0)); // middle top right
    cubelets.push(buildAndAddCubelet(scene, null, null, null, null,    4, null, -1,  0,  0)); // middle left middle
    // ain't no middle middle middle
    cubelets.push(buildAndAddCubelet(scene, null,    1, null, null, null, null,  1,  0,  0)); // middle right middle    
    cubelets.push(buildAndAddCubelet(scene, null, null, null, null,    4,    5, -1, -1,  0)); // middle bottom left
    cubelets.push(buildAndAddCubelet(scene, null, null, null, null, null,    5,  0, -1,  0)); // middle bottom middle
    cubelets.push(buildAndAddCubelet(scene, null,    1, null, null, null,    5,  1, -1,  0)); // middle bottom right


    cubelets.push(buildAndAddCubelet(scene, null, null, null, null, null,    5,  0, -1,  0)); // middle bottom middle


    cubelets.push(buildAndAddCubelet(scene, null, null,    2,    3,    4, null, -1,  1, -1)); // back top left
    cubelets.push(buildAndAddCubelet(scene, null, null,    2,    3, null, null,  0,  1, -1)); // back top middle
    cubelets.push(buildAndAddCubelet(scene, null,    1,    2,    3, null, null,  1,  1, -1)); // back top right
    cubelets.push(buildAndAddCubelet(scene, null, null, null,    3,    4, null, -1,  0, -1)); // back middle left
    cubelets.push(buildAndAddCubelet(scene, null, null, null,    3, null, null,  0,  0, -1)); // back centre
    cubelets.push(buildAndAddCubelet(scene, null,    1, null,    3, null, null,  1,  0, -1)); // back middle right
    cubelets.push(buildAndAddCubelet(scene, null, null, null,    3,    4,    5, -1, -1, -1)); // back bottom left
    cubelets.push(buildAndAddCubelet(scene, null, null, null,    3, null,    5,  0, -1, -1)); // back bottom middle
    cubelets.push(buildAndAddCubelet(scene, null,    1, null,    3, null,    5,  1, -1, -1)); // back bottom right

//    rotateRandomFaces();

    // Full work out, leaves in same state it started
    // rotateTopFaceCCW()
    //     .then(() => rotateTopFaceCW())
    //     .then(() => rotateBottomFaceCW())
    //     .then(() => rotateBottomFaceCCW())
    //     .then(() => rotateLeftFaceCW())
    //     .then(() => rotateLeftFaceCCW())
    //     .then(() => rotateRightFaceCW())
    //     .then(() => rotateRightFaceCCW())
    //     .then(() => rotateBackFaceCW())
    //     .then(() => rotateBackFaceCCW())
    //     .then(() => rotateFrontFaceCW())
    //     .then(() => rotateFrontFaceCCW());
}

setupThreeJs();

renderToThreeJs();