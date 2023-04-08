// ThreeJS and Third-party deps
import * as THREE from "three"
import * as dat from 'dat.gui'
import Stats from "three/examples/jsm/libs/stats.module"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

// Core boilerplate code deps
import { createCamera, getDefaultUniforms, createRenderer, runApp } from "./core-utils"
import { loadHDRI } from "./common-utils"

// Other deps
import voronoi from './shaders/voronoi3d_basic.glsl'

global.THREE = THREE
THREE.ColorManagement.enabled = true;

/**************************************************
 * 0. Tweakable parameters for the scene
 *************************************************/
const params = {
  // general scene params
  clearcoat: 0.3,
  ambientLight: 0.3,
  envIntensity: 0.5
}
const uniforms = {
  ...getDefaultUniforms()
}


/**************************************************
 * 1. Initialize core threejs components
 *************************************************/
// Create the scene
let scene = new THREE.Scene()

// Create the renderer via 'createRenderer',
// 1st param receives additional WebGLRenderer properties
// 2nd param receives a custom callback to further configure the renderer
let renderer = createRenderer({ antialias: true }, (_renderer) => {
  // e.g. uncomment below if you want the output to be in sRGB color space
  _renderer.outputEncoding = THREE.sRGBEncoding
  _renderer.debug.onShaderError = (gl, program, glVertexShader, glFragmentShader) => {
    console.log("error")
  }
})

// Create the camera
// Pass in fov, near, far and camera position respectively
let camera = createCamera(45, 1, 1000, { x: 0, y: 0, z: 3 })

/**************************************************
 * 2. Build your scene in this threejs app
 * This app object needs to consist of at least the async initScene() function (it is async so the animate function can wait for initScene() to finish before being called)
 * initScene() is called after a basic threejs environment has been set up, you can add objects/lighting to you scene in initScene()
 * if your app needs to animate things(i.e. not static), include a updateScene(interval, elapsed) function in the app as well
 *************************************************/
let app = {
  async initScene() {
    // OrbitControls
    this.controls = new OrbitControls(camera, renderer.domElement)
    this.controls.enableDamping = true
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.4

    const light = new THREE.AmbientLight( 0xffffff, params.ambientLight )
    scene.add( light );

    const hdrEquirect = await loadHDRI("https://projects.arkon.digital/threejs/hdr/shanghai_bund_1k.hdr", renderer)

    const sphereGeometry = new THREE.SphereGeometry(1, 64, 64)
    const sphereMaterial = new THREE.MeshPhysicalMaterial({
      // color: new THREE.Color(0xff0000),
      roughness: 0.5,
      // metalness: 0.6,
      clearcoat: params.clearcoat,
      envMap: hdrEquirect,
      envMapIntensity: params.envIntensity
    })
    sphereMaterial.onBeforeCompile = shader => {
      shader.uniforms.time = { value: 0 };

      shader.vertexShader = shader.vertexShader.replace(
        `void main() {`,
        `varying vec3 v_pos;
        varying vec2 vUv;
        void main() {
          v_pos = position;
          vUv = uv;
        `
      )

      shader.fragmentShader = shader.fragmentShader.replace(
        `void main() {`,
        `${voronoi}


        // specifically for this case
        // from 0 on one side to 180 on other side
        float posToTheta(vec3 pos) {
          if (pos.x < 0.) {
            pos.z *= -1.;
          }
          return atan(pos.z/pos.x) + 1.57079632679;
        }

        vec3 rgb2hsv(vec3 c){
          vec4 K=vec4(0.,-1./3.,2./3.,-1.),
               p=mix(vec4(c.bg ,K.wz),vec4(c.gb,K.xy ),step(c.b,c.g)),
               q=mix(vec4(p.xyw,c.r ),vec4(c.r ,p.yzx),step(p.x,c.r));
          float d=q.x-min(q.w,q.y),
                e=1e-10;
          return vec3(abs(q.z+(q.w-q.y)/(6.*d+e)),d/(q.x+e),q.x);
        }

        vec3 hsv2rgb(vec3 c){
          vec4 K=vec4(1.,2./3.,1./3.,3.);
          return c.z*mix(K.xxx,saturate(abs(fract(c.x+K.xyz)*6.-K.w)-K.x),c.y);
        }

        uniform float time;
        varying vec3 v_pos;
        varying vec2 vUv;

        void main() {
        `
      )

      // a few ideas on how to play with diffuse colors
      // 1. use res.x as a mix factor between 2 colors
      // 2. use 3d position as a direct input for the color, tune the hueness
      // 3. use 3-4 colors to play with (e.g. north/south poles vs right/left poles)
      shader.fragmentShader = shader.fragmentShader.replace( //we have to transform the string
        'vec4 diffuseColor = vec4( diffuse, opacity );', //we will swap out this chunk
        `
        vec2 res = voronoi(v_pos*3., time*0.3);
        vec3 mycolor = vec3(1.-res.x) / 2.;
        vec3 nPos = normalize(v_pos);
        // 1. (OK) remap all axis to 0.-1. but overall brighter
        // mycolor = (nPos + vec3(1.0)) / 2.;
        // 2. (NOK) somehow deal with the black region
        // mycolor = nPos;
        // mycolor.y = abs(mycolor.y);
        // 3. (NOK) map HSL to the sphere
        // mycolor = hsv2rgb(vec3(posToTheta(v_pos) / PI, 1., 1.));
        // 4. (OK) map to trigonometry and remap back to rgb
        // mycolor.r = (cos(v_pos.x * PI) + 1.) / 2.;
        // mycolor.g = (sin(v_pos.y * PI) + 1.) / 2.;
        // mycolor.b = (sin(v_pos.z * PI) + 2.) / 3.;
        // 5. (OK) use mix() to mix colors however I want
        // mycolor = mix(vec3(0.0,0.0,1.0), vec3(1.0,0.0,0.0), (v_pos.z+1.0)/2.0);
        // 6. (OK) use smoothstep
        mycolor.r += smoothstep(0.5, 1.0, -v_pos.z) + smoothstep(0.5, 1.0, v_pos.x) + (cos(v_pos.y * PI + PI) + 1.) / 2.;
        mycolor.g += smoothstep(0.5, 1.0, -v_pos.x) + (cos(v_pos.y * PI + PI) + 1.) / 2.;
        mycolor.b += smoothstep(0.5, 1.0, v_pos.z) + smoothstep(0.5, 1.0, -v_pos.z);
        vec4 diffuseColor = vec4( mycolor, opacity );
        `
      )
      
      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <metalnessmap_fragment>`,
        `float metalnessFactor = metalness;
        metalnessFactor = clamp(res.x, 0.2, 1.0);
        `
      )
        
      // shader.fragmentShader = shader.fragmentShader.replace(
      //   `#include <roughnessmap_fragment>`,
      //   `float roughnessFactor = roughness;
      //   roughnessFactor = (1.-res.x)/2.;
      //   `
      // )
  
      // shader.fragmentShader = shader.fragmentShader.replace(
      //   `#include <normal_fragment_maps>`,
      //   `#include <normal_fragment_maps>
      //   float cosRes = dot(res.yzw, normal) / length(res.yzw);
      //   if (cosRes < 0.)
      //   normal = normalize(-res.yzw);
      //   `
      // )
          
      sphereMaterial.userData.shader = shader;
    }
    this.sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    this.sphereMaterial = sphereMaterial
    // this.sphere.rotation.set(-1.0, -1.0, 0.0)
    scene.add(this.sphere)

    // GUI controls
    const gui = new dat.GUI()
    gui.add(params, 'clearcoat', 0.0, 1.0, 0.05).onChange(val => {
      this.sphereMaterial.clearcoat = val
    })
    gui.add(params, 'envIntensity', 0.0, 2.0, 0.1).onChange(val => {
      this.sphereMaterial.envMapIntensity = val
    })
    gui.add(params, 'ambientLight', 0.0, 2.0, 0.1).onChange(val => {
      light.intensity = val
    })

    // Stats - show fps
    this.stats1 = new Stats()
    this.stats1.showPanel(0) // Panel 0 = fps
    this.stats1.domElement.style.cssText = "position:absolute;top:0px;left:0px;"
    // this.container is the parent DOM element of the threejs canvas element
    this.container.appendChild(this.stats1.domElement)
  },
  // @param {number} interval - time elapsed between 2 frames
  // @param {number} elapsed - total time elapsed since app start
  updateScene(interval, elapsed) {
    this.controls.update()
    this.stats1.update()

    const shader = this.sphere.material.userData.shader
    if (shader) {
      shader.uniforms.time.value = elapsed
    }
  }
}

/**************************************************
 * 3. Run the app
 * 'runApp' will do most of the boilerplate setup code for you:
 * e.g. HTML container, window resize listener, mouse move/touch listener for shader uniforms, THREE.Clock() for animation
 * Executing this line puts everything together and runs the app
 * ps. if you don't use custom shaders, pass undefined to the 'uniforms'(2nd-last) param
 * ps. if you don't use post-processing, pass undefined to the 'composer'(last) param
 *************************************************/
runApp(app, scene, renderer, camera, true, uniforms, undefined)
