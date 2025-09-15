const axios = require('axios');

const API_URL = 'http://192.168.91.2:7863/sdapi/v1';

async function testModelSwitch() {
  try {
    // 1. Get current model
    const currentOptions = await axios.get(`${API_URL}/options`);
    console.log('Current model:', currentOptions.data.sd_model_checkpoint);

    // 2. Get available models
    const models = await axios.get(`${API_URL}/sd-models`);
    const animagineModel = models.data.find(m =>
      m.model_name === 'sd_animagineXL40_v4Opt' ||
      m.title.includes('animagineXL40_v4Opt')
    );

    console.log('Found animagine model:', animagineModel);

    if (animagineModel) {
      // 3. Switch to animagine model
      console.log('Switching to:', animagineModel.title);
      await axios.post(`${API_URL}/options`, {
        sd_model_checkpoint: animagineModel.title
      });

      // 4. Verify switch
      const newOptions = await axios.get(`${API_URL}/options`);
      console.log('New model:', newOptions.data.sd_model_checkpoint);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testModelSwitch();