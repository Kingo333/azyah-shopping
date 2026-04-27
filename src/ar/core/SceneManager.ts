/**
 * Three.js scene lifecycle management for the AR pipeline.
 *
 * Owns the WebGLRenderer, Scene, PerspectiveCamera, and lighting. Persists
 * across product switches -- only the loaded 3D model swaps via swapModel().
 *
 * Fix 5: Added setShadowsEnabled() for performance tier switching.
 * Fix 8: Added powerPreference: 'high-performance' to WebGLRenderer.
 *
 * R8 (preserveDrawingBuffer): defaults to FALSE for memory/battery, especially
 * on iOS Safari where leaving it on causes a full-canvas readback every frame.
 * Use captureFrame() (or beginCapture/endCapture for raw access) — these flip
 * the flag to true transiently, render once, snapshot, then flip back.
 */
import * as THREE from 'three';
import { MATERIAL_PRESETS } from '../config/materialPresets';
import type { GarmentType } from '../types';

export class SceneManager {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  dirty = false;

  private currentModel: THREE.Object3D | null = null;
  private cachedMaterials: THREE.Material[] = [];

  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;

  private brightnessCanvas: HTMLCanvasElement;
  private brightnessCtx: CanvasRenderingContext2D;
  private lastBrightnessSample = 0;
  private shadowPlane: THREE.Mesh | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(63, aspect, 0.1, 1000);
    this.camera.position.z = 2;

    // Fix 8: powerPreference for mobile GPU selection
    // R8: preserveDrawingBuffer default FALSE; flipped on transiently for capture.
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    const isMobile =
      window.innerWidth < 768 ||
      (navigator.maxTouchPoints > 0 && screen.width < 1024);
    this.renderer.setPixelRatio(isMobile ? 1.0 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // PBR environment map
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileCubemapShader();
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x888888);
    const envTexture = pmrem.fromScene(envScene, 0, 0.1, 100).texture;
    this.scene.environment = envTexture;
    pmrem.dispose();

    // Shadow map setup
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);
    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.dirLight.position.set(0, 2, 1);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 512;
    this.dirLight.shadow.mapSize.height = 512;
    this.dirLight.shadow.camera.near = 0.1;
    this.dirLight.shadow.camera.far = 10;
    this.dirLight.shadow.camera.left = -2;
    this.dirLight.shadow.camera.right = 2;
    this.dirLight.shadow.camera.top = 2;
    this.dirLight.shadow.camera.bottom = -2;
    this.dirLight.shadow.bias = -0.001;
    this.scene.add(this.dirLight);

    this.brightnessCanvas = document.createElement('canvas');
    this.brightnessCanvas.width = 32;
    this.brightnessCanvas.height = 16;
    this.brightnessCtx = this.brightnessCanvas.getContext('2d')!;

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('WebGL context lost — AR rendering paused');
    });
    canvas.addEventListener('webglcontextrestored', () => {
      console.info('WebGL context restored — AR rendering resumed');
      this.dirty = true;
    });
  }

  get visibleDims(): { w: number; h: number } {
    const vFov = (this.camera.fov * Math.PI) / 180;
    const h = 2 * Math.tan(vFov / 2) * this.camera.position.z;
    return { w: h * this.camera.aspect, h };
  }

  swapModel(newModel: THREE.Object3D | null): void {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.currentModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            (mesh.material as THREE.Material)?.dispose();
          }
        }
      });
    }

    this.cachedMaterials = [];

    if (newModel) {
      this.scene.add(newModel);
      newModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.transparent = true;
          mat.depthWrite = true;
          mat.side = THREE.DoubleSide;
          this.cachedMaterials.push(mat);
        }
      });
      newModel.renderOrder = 1;
      newModel.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
    }

    this.currentModel = newModel;
    this.dirty = true;
  }

  updateOpacity(opacity: number): void {
    for (const mat of this.cachedMaterials) {
      (mat as any).opacity = opacity;
    }
  }

  enhanceMaterials(garmentType: GarmentType): void {
    const preset = MATERIAL_PRESETS[garmentType];
    if (!preset) return;

    for (const mat of this.cachedMaterials) {
      const stdMat = mat as THREE.MeshStandardMaterial;
      if (stdMat.isMeshStandardMaterial) {
        if (stdMat.roughness === 1.0 && stdMat.metalness === 0.0) {
          stdMat.roughness = preset.roughness;
          stdMat.metalness = preset.metalness;
        }
        if (stdMat.map) {
          stdMat.map.colorSpace = THREE.SRGBColorSpace;
        }
        stdMat.envMapIntensity = 0.4;
        stdMat.needsUpdate = true;
      }
    }
    this.dirty = true;
  }

  updateShadowPlane(floorY: number, garmentType: GarmentType): void {
    if (garmentType === 'headwear' || garmentType === 'accessory') {
      if (this.shadowPlane) { this.shadowPlane.visible = false; }
      return;
    }

    if (!this.shadowPlane) {
      const geo = new THREE.PlaneGeometry(6, 6);
      const mat = new THREE.ShadowMaterial({ opacity: 0.25 });
      this.shadowPlane = new THREE.Mesh(geo, mat);
      this.shadowPlane.rotation.x = -Math.PI / 2;
      this.shadowPlane.receiveShadow = true;
      this.shadowPlane.renderOrder = 0;
      this.scene.add(this.shadowPlane);
    }

    this.shadowPlane.visible = true;
    this.shadowPlane.position.y = floorY;

    const mat = this.shadowPlane.material as THREE.ShadowMaterial;
    if (garmentType === 'abaya' || garmentType === 'pants') {
      mat.opacity = 0.3;
    } else {
      mat.opacity = 0.15;
    }
    this.dirty = true;
  }

  /** Fix 5: Toggle shadow map rendering for performance tier switching. */
  setShadowsEnabled(enabled: boolean): void {
    if (this.renderer.shadowMap.enabled === enabled) return;
    this.renderer.shadowMap.enabled = enabled;
    this.renderer.shadowMap.needsUpdate = true;
    this.dirLight.castShadow = enabled;
    if (this.shadowPlane) {
      this.shadowPlane.visible = enabled;
    }
    this.dirty = true;
    console.log(`[SceneManager] Shadows ${enabled ? 'enabled' : 'disabled'}`);
  }

  updateLightingFromVideo(video: HTMLVideoElement): void {
    const now = performance.now();
    if (now - this.lastBrightnessSample < 500) return;
    this.lastBrightnessSample = now;

    this.brightnessCtx.drawImage(video, 0, 0, 32, 16);
    const imageData = this.brightnessCtx.getImageData(0, 0, 32, 16).data;

    let totalLuminance = 0;
    const pixelCount = 32 * 16;
    for (let i = 0; i < imageData.length; i += 4) {
      totalLuminance += (0.299 * imageData[i] + 0.587 * imageData[i + 1] + 0.114 * imageData[i + 2]) / 255;
    }
    const brightness = totalLuminance / pixelCount;

    this.ambientLight.intensity = 0.3 + brightness * 0.7;
    this.dirLight.intensity = 0.4 + brightness * 0.8;
    this.dirty = true;
  }

  renderIfDirty(): void {
    if (this.dirty) {
      this.renderer.render(this.scene, this.camera);
      this.dirty = false;
    }
  }

  /**
   * R8: Render-and-capture in one synchronous call so preserveDrawingBuffer
   * can stay false. The WebGL back buffer is only valid in the same task as
   * the render() call; toBlob/toDataURL must be invoked before the browser
   * yields. Forces a render even if !dirty so the captured frame is current.
   */
  captureFrame(type: string = 'image/png', quality?: number): Promise<Blob> {
    this.renderer.render(this.scene, this.camera);
    this.dirty = false;
    const canvas = this.renderer.domElement;
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) { resolve(b); return; }
          try {
            const dataUrl = canvas.toDataURL(type);
            const byteStr = atob(dataUrl.split(',')[1]);
            const arr = new Uint8Array(byteStr.length);
            for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
            resolve(new Blob([arr], { type }));
          } catch (err) {
            reject(err);
          }
        },
        type,
        quality,
      );
    });
  }

  handleResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  dispose(): void {
    this.swapModel(null);
    this.renderer.dispose();
  }
}
