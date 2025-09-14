/**
 * Test Utilities
 * テスト用のユーティリティ関数とモックデータ
 */

export const mockPresets = {
  txt2img_base: {
    name: 'txt2img_animagine_base',
    type: 'txt2img',
    description: 'AnimagineXL 4.0 with ADetailer face enhancement',
    base_settings: {
      prompt_suffix: ', masterpiece, best quality',
      negative_prompt: 'low quality, worst quality, bad anatomy',
      steps: 20,
      cfg_scale: 7.0,
      width: 1024,
      height: 1024,
      sampler_name: 'DPM++ 2M Karras',
      batch_size: 1,
      seed: -1,
      model: 'animagineXL40_v4Opt'
    },
    extensions: {
      adetailer: {
        enabled: true,
        models: ['face_yolov8n.pt']
      }
    }
  },

  txt2img_cn3: {
    name: 'txt2img_animagine_cn3',
    type: 'txt2img',
    description: 'AnimagineXL 4.0 with ADetailer and ControlNet Anytest3',
    base_settings: {
      prompt_suffix: ', masterpiece, best quality',
      negative_prompt: 'low quality, worst quality, bad anatomy',
      steps: 20,
      cfg_scale: 7.0,
      width: 1024,
      height: 1024,
      sampler_name: 'DPM++ 2M Karras',
      batch_size: 1,
      seed: -1,
      model: 'animagineXL40_v4Opt'
    },
    extensions: {
      adetailer: {
        enabled: true,
        models: ['face_yolov8n.pt']
      },
      controlnet: {
        enabled: true,
        units: [{
          model: 'CN-Anytest3_animagine4_A',
          module: 'none',
          pixel_perfect: true,
          weight: 1.0,
          guidance_start: 0.0,
          guidance_end: 1.0
        }]
      }
    }
  },

  img2img_base: {
    name: 'img2img_animagine_base',
    type: 'img2img',
    description: 'AnimagineXL 4.0 img2img with ADetailer',
    base_settings: {
      prompt_suffix: ', masterpiece, best quality',
      negative_prompt: 'low quality, worst quality, bad anatomy',
      denoising_strength: 0.75,
      resize_mode: 0,
      steps: 20,
      cfg_scale: 7.0,
      width: 1024,
      height: 1024,
      sampler_name: 'DPM++ 2M Karras',
      batch_size: 1,
      seed: -1,
      model: 'animagineXL40_v4Opt'
    },
    extensions: {
      adetailer: {
        enabled: true,
        models: ['face_yolov8n.pt']
      }
    }
  },

  png_info: {
    name: 'png_info',
    type: 'utility',
    subtype: 'png_info',
    description: 'Extract PNG metadata information'
  },

  upscale_ultrasharp: {
    name: 'upscale_ultrasharp',
    type: 'utility',
    subtype: 'upscale',
    description: 'Upscale image with 4x_ultrasharp model',
    settings: {
      upscaler: '4x_ultrasharp',
      scale_factor: 4
    }
  }
};

export const mockApiResponses = {
  txt2img_success: {
    images: ['iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='],
    parameters: {
      prompt: 'test prompt',
      steps: 20,
      cfg_scale: 7.0,
      seed: 12345
    },
    info: JSON.stringify({
      prompt: 'test prompt',
      all_prompts: ['test prompt'],
      negative_prompt: 'low quality',
      seed: 12345,
      width: 1024,
      height: 1024,
      sampler_name: 'DPM++ 2M Karras',
      cfg_scale: 7.0,
      steps: 20
    })
  },

  img2img_success: {
    images: ['iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='],
    parameters: {
      prompt: 'modified image',
      denoising_strength: 0.75,
      steps: 20
    },
    info: JSON.stringify({
      prompt: 'modified image',
      denoising_strength: 0.75,
      seed: 54321
    })
  },

  png_info_response: {
    info: 'parameters: test prompt\\nSteps: 20, Sampler: DPM++ 2M Karras, CFG scale: 7.0, Seed: 12345',
    items: {
      parameters: {
        prompt: 'test prompt',
        steps: '20',
        sampler: 'DPM++ 2M Karras',
        cfg_scale: '7.0',
        seed: '12345'
      }
    }
  },

  error_422: {
    response: {
      status: 422,
      data: {
        detail: [
          {
            loc: ['body', 'prompt'],
            msg: 'field required',
            type: 'value_error.missing'
          }
        ]
      }
    }
  }
};

export function createMockPayload(type: 'txt2img' | 'img2img', overrides = {}) {
  const base = {
    prompt: 'test prompt',
    negative_prompt: 'low quality',
    steps: 20,
    cfg_scale: 7.0,
    width: 1024,
    height: 1024,
    sampler_name: 'DPM++ 2M Karras',
    batch_size: 1,
    seed: -1,
    send_images: true,
    save_images: false
  };

  if (type === 'img2img') {
    return {
      ...base,
      init_images: ['base64_test_image'],
      resize_mode: 0,
      denoising_strength: 0.75,
      ...overrides
    };
  }

  return { ...base, ...overrides };
}

export function createMockADetailerConfig(model = 'face_yolov8n.pt') {
  return {
    ADetailer: {
      args: [
        true,   // ad_enable
        false,  // skip_img2img
        {
          ad_model: model,
          ad_prompt: '',
          ad_negative_prompt: '',
          ad_confidence: 0.3
        }
      ]
    }
  };
}

export function createMockControlNetConfig(model = 'CN-Anytest3_animagine4_A') {
  return {
    ControlNet: {
      args: [{
        image: null,
        mask: null,
        module: 'none',
        model: model,
        weight: 1.0,
        resize_mode: 'Just Resize',
        lowvram: false,
        processor_res: 512,
        threshold_a: 100.0,
        threshold_b: 200.0,
        guidance_start: 0.0,
        guidance_end: 1.0,
        control_mode: 'Balanced',
        pixel_perfect: true,
        enabled: true,
        guessmode: false
      }]
    }
  };
}

export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}