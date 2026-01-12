This directory contains images and GIFs used [in the wiki](https://github.com/Astisme/again-why-salesforce/wiki) and in the browser stores.

Commands to transform .mp4 to .gif
`ffmpeg -i input.mp4 -vf "palettegen" palette.png`
`ffmpeg -i input.mp4 -i palette.png -lavfi "[0:v][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" output.gif`
