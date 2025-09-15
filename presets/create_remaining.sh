#!/bin/bash

# Create preset 9-14 (Regional Prompter combinations)
for i in 09 10 11 12 13 14; do
  case $i in
    09) name="txt2img_cn4_rp_matrix"; base="03"; mode="Matrix"; type="txt2img"; cn="CN-Anytest4_animagine4_A" ;;
    10) name="txt2img_cn4_rp_mask"; base="03"; mode="Mask"; type="txt2img"; cn="CN-Anytest4_animagine4_A" ;;
    11) name="img2img_cn3_rp_matrix"; base="05"; mode="Matrix"; type="img2img"; cn="CN-Anytest3_animagine4_A" ;;
    12) name="img2img_cn3_rp_mask"; base="05"; mode="Mask"; type="img2img"; cn="CN-Anytest3_animagine4_A" ;;
    13) name="img2img_cn4_rp_matrix"; base="06"; mode="Matrix"; type="img2img"; cn="CN-Anytest4_animagine4_A" ;;
    14) name="img2img_cn4_rp_mask"; base="06"; mode="Mask"; type="img2img"; cn="CN-Anytest4_animagine4_A" ;;
  esac
  echo "Creating preset $i: $name"
done

# Create utility presets 15-20
echo "Creating utility presets..."

