const fs = require('fs');
const path = require('path');

// Preset definitions for 10-20
const presets = [
  // 10-14: Regional Prompter variations
  {num: 10, name: 'txt2img_cn4_rp_mask', type: 'txt2img', cn: 'CN-Anytest4_animagine4_A', rp_mode: 'Mask'},
  {num: 11, name: 'img2img_cn3_rp_matrix', type: 'img2img', cn: 'CN-Anytest3_animagine4_A', rp_mode: 'Matrix'},
  {num: 12, name: 'img2img_cn3_rp_mask', type: 'img2img', cn: 'CN-Anytest3_animagine4_A', rp_mode: 'Mask'},
  {num: 13, name: 'img2img_cn4_rp_matrix', type: 'img2img', cn: 'CN-Anytest4_animagine4_A', rp_mode: 'Matrix'},
  {num: 14, name: 'img2img_cn4_rp_mask', type: 'img2img', cn: 'CN-Anytest4_animagine4_A', rp_mode: 'Mask'},
  // 15-20: Utilities
  {num: 15, name: 'utility_png_info', type: 'png-info'},
  {num: 16, name: 'extras_upscale_ultrasharp', type: 'extras', upscaler: '4x_ultrasharp'},
  {num: 17, name: 'extras_upscale_fatal_anime', type: 'extras', upscaler: '4x_fatal_anime_500000_G'},
  {num: 18, name: 'extras_rembg_u2net', type: 'extras', rembg: 'u2net'},
  {num: 19, name: 'extras_rembg_isnet_anime', type: 'extras', rembg: 'isnet_anime'},
  {num: 20, name: 'tagger_wd_eva02', type: 'tagger', model: 'wd-EVA02-Large-v3'}
];

presets.forEach(p => {
  console.log(`Creating ${p.num}_${p.name}.yaml`);
});
