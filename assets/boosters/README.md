Booster Pack Images

Place your booster pack images in this folder and ensure the filenames match the entries referenced in `fetchCardImages.js` under the Booster Packs section, for example:

- tempest.jpg
- lorwyn.png
- fallout-collector.jpg
- mercadian-masques.jpg
- revised.jpg
- eldraine-collector.jpg
- mkm-collector.jpg
- lci-collector.jpg
- ltr-jumpstart.jpg
- edge-of-eternities.jpg
- foundations-jumpstart.jpg
- aetherdrift-collector.jpg

Notes:
- These assets are served statically from `/assets/boosters/<filename>`.
- If an image is missing, the UI will fall back to the Scryfall set icon for that set when available.
- Only entries with a known Scryfall set code will enable the “Open Pack” button; others will show the tile but keep the button disabled until a valid code is provided.
