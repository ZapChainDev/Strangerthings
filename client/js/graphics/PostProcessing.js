/**
 * PostProcessing Class
 * Handles all post-processing effects for cinematic visuals
 * Includes bloom, DOF, color grading, vignette, and film grain
 */

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

/**
 * Custom color grading shader for Stranger Things aesthetic
 * Teal/orange color split, desaturated with moody dark tones
 */
const StrangerThingsColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignetteIntensity: { value: 0.4 },
    uVignetteRadius: { value: 0.8 },
    uFilmGrainIntensity: { value: 0.0 },
    uSaturation: { value: 0.7 },
    uContrast: { value: 1.1 },
    uBrightness: { value: -0.05 },
    uTealOrangeStrength: { value: 0.3 },
    uIsUpsideDown: { value: false },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignetteIntensity;
    uniform float uVignetteRadius;
    uniform float uFilmGrainIntensity;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uBrightness;
    uniform float uTealOrangeStrength;
    uniform bool uIsUpsideDown;
    
    varying vec2 vUv;
    
    // Film grain noise
    float random(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    // Vignette effect
    float vignette(vec2 uv, float radius, float intensity) {
      vec2 center = uv - 0.5;
      float dist = length(center);
      return 1.0 - smoothstep(radius - 0.3, radius + 0.3, dist) * intensity;
    }
    
    // Convert RGB to HSL
    vec3 rgb2hsl(vec3 c) {
      float maxC = max(max(c.r, c.g), c.b);
      float minC = min(min(c.r, c.g), c.b);
      float l = (maxC + minC) / 2.0;
      float s = 0.0;
      float h = 0.0;
      
      if (maxC != minC) {
        float d = maxC - minC;
        s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
        
        if (maxC == c.r) {
          h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
        } else if (maxC == c.g) {
          h = (c.b - c.r) / d + 2.0;
        } else {
          h = (c.r - c.g) / d + 4.0;
        }
        h /= 6.0;
      }
      
      return vec3(h, s, l);
    }
    
    // Teal/Orange color grading
    vec3 tealOrangeGrade(vec3 color, float strength) {
      vec3 hsl = rgb2hsl(color);
      float luminance = hsl.z;
      
      // Shadows get teal tint, highlights get orange
      vec3 teal = vec3(0.0, 0.6, 0.7);
      vec3 orange = vec3(1.0, 0.5, 0.2);
      
      vec3 tint = mix(teal, orange, luminance);
      return mix(color, color * tint, strength);
    }
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // Apply brightness
      color.rgb += uBrightness;
      
      // Apply contrast
      color.rgb = (color.rgb - 0.5) * uContrast + 0.5;
      
      // Apply saturation
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      color.rgb = mix(vec3(gray), color.rgb, uSaturation);
      
      // Apply teal/orange color grading
      color.rgb = tealOrangeGrade(color.rgb, uTealOrangeStrength);
      
      // Upside Down specific grading
      if (uIsUpsideDown) {
        // Same as normal world - no color changes
        // The dark blue sky and red lightning/clouds create the atmosphere
      }
      
      // Apply vignette
      float vig = vignette(vUv, uVignetteRadius, uVignetteIntensity);
      color.rgb *= vig;
      
      // Apply film grain
      float grain = random(vUv + fract(uTime)) * 2.0 - 1.0;
      color.rgb += grain * uFilmGrainIntensity;
      
      // Clamp output
      color.rgb = clamp(color.rgb, 0.0, 1.0);
      
      gl_FragColor = color;
    }
  `,
};

/**
 * Chromatic aberration shader for subtle edge distortion
 */
const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    uIntensity: { value: 0.002 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uIntensity;
    varying vec2 vUv;
    
    void main() {
      vec2 dir = vUv - 0.5;
      float dist = length(dir);
      vec2 offset = dir * dist * uIntensity;
      
      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
};

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.composer = null;
    this.bloomPass = null;
    this.bokehPass = null;
    this.colorGradePass = null;
    this.chromaticPass = null;
    this.time = 0;
    this.isUpsideDown = false;

    // Effect settings
    this.settings = {
      bloom: {
        enabled: true,
        strength: 0.6,
        radius: 0.4,
        threshold: 0.7,
      },
      dof: {
        enabled: true,
        focus: 15.0,
        aperture: 0.00015,
        maxBlur: 0.008,
      },
      colorGrade: {
        vignetteIntensity: 0.4,
        filmGrainIntensity: 0.0,
        saturation: 0.75,
        contrast: 1.1,
        brightness: -0.03,
        tealOrangeStrength: 0.25,
      },
      chromaticAberration: {
        enabled: true,
        intensity: 0.002,
      },
    };

    this.init();
  }

  /**
   * Initialize post-processing pipeline
   */
  init() {
    // Create effect composer
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Render pass (renders scene to texture)
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom pass for glowing lights
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.settings.bloom.strength,
      this.settings.bloom.radius,
      this.settings.bloom.threshold
    );
    this.composer.addPass(this.bloomPass);

    // Depth of Field pass
    this.bokehPass = new BokehPass(this.scene, this.camera, {
      focus: this.settings.dof.focus,
      aperture: this.settings.dof.aperture,
      maxblur: this.settings.dof.maxBlur,
    });
    this.bokehPass.enabled = this.settings.dof.enabled;
    this.composer.addPass(this.bokehPass);

    // Chromatic aberration pass
    this.chromaticPass = new ShaderPass(ChromaticAberrationShader);
    this.chromaticPass.uniforms.uIntensity.value =
      this.settings.chromaticAberration.intensity;
    this.chromaticPass.enabled = this.settings.chromaticAberration.enabled;
    this.composer.addPass(this.chromaticPass);

    // Color grading pass (includes vignette, film grain, saturation)
    this.colorGradePass = new ShaderPass(StrangerThingsColorGradeShader);
    this.updateColorGradeUniforms();
    this.composer.addPass(this.colorGradePass);

    // Output pass (gamma correction)
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    console.log("[PostProcessing] Initialized with cinematic effects");
  }

  /**
   * Update color grade uniforms from settings
   */
  updateColorGradeUniforms() {
    const uniforms = this.colorGradePass.uniforms;
    uniforms.uVignetteIntensity.value =
      this.settings.colorGrade.vignetteIntensity;
    uniforms.uFilmGrainIntensity.value =
      this.settings.colorGrade.filmGrainIntensity;
    uniforms.uSaturation.value = this.settings.colorGrade.saturation;
    uniforms.uContrast.value = this.settings.colorGrade.contrast;
    uniforms.uBrightness.value = this.settings.colorGrade.brightness;
    uniforms.uTealOrangeStrength.value =
      this.settings.colorGrade.tealOrangeStrength;
    uniforms.uIsUpsideDown.value = this.isUpsideDown;
  }

  /**
   * Update post-processing each frame
   */
  update(deltaTime) {
    this.time += deltaTime;
    this.colorGradePass.uniforms.uTime.value = this.time;
  }

  /**
   * Render with post-processing
   */
  render() {
    this.composer.render();
  }

  /**
   * Switch to Upside Down visual state
   */
  setUpsideDown(isUpsideDown) {
    this.isUpsideDown = isUpsideDown;

    if (isUpsideDown) {
      // Same bloom as normal - no changes
      this.bloomPass.strength = this.settings.bloom.strength;
      this.bloomPass.threshold = this.settings.bloom.threshold;

      // Same color settings as normal world
      this.settings.colorGrade.vignetteIntensity = 0.4;
      this.settings.colorGrade.saturation = 0.75;
      this.settings.colorGrade.brightness = -0.03;
      this.settings.colorGrade.filmGrainIntensity = 0.0;

      // Same chromatic aberration
      this.chromaticPass.uniforms.uIntensity.value = 0.002;
    } else {
      // Normal world settings
      this.bloomPass.strength = this.settings.bloom.strength;
      this.bloomPass.threshold = this.settings.bloom.threshold;

      this.settings.colorGrade.vignetteIntensity = 0.4;
      this.settings.colorGrade.saturation = 0.75;
      this.settings.colorGrade.brightness = -0.03;
      this.settings.colorGrade.filmGrainIntensity = 0.0;

      this.chromaticPass.uniforms.uIntensity.value = 0.002;
    }

    this.updateColorGradeUniforms();
  }

  /**
   * Handle window resize
   */
  handleResize(width, height) {
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
  }

  /**
   * Update DOF focus distance
   */
  setFocusDistance(distance) {
    if (this.bokehPass) {
      this.bokehPass.uniforms.focus.value = distance;
    }
  }

  /**
   * Toggle bloom effect
   */
  setBloomEnabled(enabled) {
    this.bloomPass.enabled = enabled;
  }

  /**
   * Toggle DOF effect
   */
  setDOFEnabled(enabled) {
    this.bokehPass.enabled = enabled;
  }

  /**
   * Dispose resources
   */
  dispose() {
    this.composer.dispose();
  }
}
