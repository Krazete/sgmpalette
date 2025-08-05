# Submissions

> The [original submissions page](https://forum.skullgirlsmobile.com/threads/17533) was created on May 8, 2021, and vanished on November 11, 2024.

## How to Create a Custom Palette File

![Palette File Pipeline](sample/create_sprite.png)

1. Choose a raw image `<NAME>_raw.png`.
2. Using the raw image, create the linework layer `<NAME>_line.png`.
   - Soft edges are allowed.
     - If tracing, use the brush tool.
     - If using selections, turn on anti-aliasing.
   - The script only reads the alpha channel here; it does not use any color information.
3. Using the raw image, create the base colors layer `<NAME>_base.png`.
   - Hard edges are recommended.
     - Use the pencil tool instead of the brush.
     - For other tools, turn off anti-aliasing and feathering.
4. Using the base colors layer, create the color areas layer `<NAME>_area.png`.
   - Hard edges are required.
     - ![Edge Example](sample/edges.png)
     - Ignoring this rule will result in unwanted color map areas, which can also cause other issues like color ID overflow.
   - Different items/materials/areas should be different colors.
   - If colors match in this color map, they will match forever.
     - For example, if the hat and the skin are both colored `#A1B2C3` in your `area.png` submission, then the hat will always be skin-colored in the Palette Editor no matter what.
   - If you're picky about color IDs, encode them in the red channel.
     - To match official color maps, reference the Palette Editor. Click on a sprite and you'll see the corresponding color ID as a circled number in the sidebar.

## How to Submit

- Recipient: [krazete@gmail.com](mailto:krazete@gmail.com?subject=%5Bsgmpalette%5D)
- Subject: [sgmpalette]
- Body: Attach the 4 layers: `<NAME>_raw.png`, `<NAME>_line.png`, `<NAME>_base.png`, and `<NAME>_area.png`.
  - Alternatively, instead of `raw` and `base`, you may submit a highlights layer `<NAME>_highlight.png` and a shadows layer `<NAME>_shadow.png`. See the Examples section below.
  - Let me know your username if it isn't apparent. (Custom sprites are sorted into folders by username.)
  - If the art used is not official and is not yours, please credit the artist in your message.

I will process your submitted layers with `create_sprite.sh` and upload the result here.

Please be aware that your submission may be denied, revised, or replaced in the future by me or another submitter without notice for the following reasons:
- poor quality
- redundant content
- uncredited art
- improperly named layers
- because

You may also copy or fork this repo, put your layers in a [custom](custom) subfolder, and run `create_sprite.sh` yourself if you want to use a custom sprite without submitting it for public use.

## Examples

All submissions are recorded in the [custom](custom) folder of this repository.

### Normal Submission

|Raw|Line|Base|Area|
|-|-|-|-|
|<img src="custom/gushen/Annie_redo_raw.png" width="100" alt="Raw Layer">|<img src="custom/gushen/Annie_redo_line.png" width="100" alt="Line Layer">|<img src="custom/gushen/Annie_redo_base.png" width="100" alt="Base Layer">|<img src="custom/gushen/Annie_redo_area.png" width="100" alt="Area Layer">|

Most submissions are like this, letting `create_sprite.py` do the work of extracting highlights and shadows from the `raw` and `base` layers.

### Alternative Submission

|Highlight|Shadow|Line|Area|
|-|-|-|-|
|<img src="custom/gushen/Annie_redo_highlight.png" width="100" alt="Highlight Layer">|<img src="custom/gushen/Annie_redo_shadow.png" width="100" alt="Shadow Layer">|<img src="custom/gushen/Annie_redo_line.png" width="100" alt="Line Layer">|<img src="custom/gushen/Annie_redo_area.png" width="100" alt="Area Layer">|

The `highlight` and `shadow` layers are created by subtracting the `base` layer from the `raw` layer and vice versa respectively. Brightness and contrast can then be adjusted as desired to create more pronounced details in the resulting sprite.

<!--There is yet another option to submit the layers `<NAME>_r.png`, `<NAME>_g.png`, and `<NAME>_b.png` instead. You must have a good understanding of how these palettized sprites work in order to submit these (i.e. you're me).-->
