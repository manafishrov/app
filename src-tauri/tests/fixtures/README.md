# Recording fixture

`recording.mkv` contains one second of synthetic black 16×16 H.264 video and
silent AAC audio. No hardware, personal media, or external assets are used.
The native recording test remuxes both streams into MP4 through `convert`.

Generated with FFmpeg from the development shell:

```sh
ffmpeg -f lavfi -i color=black:s=16x16:r=5 \
  -f lavfi -i anullsrc=r=48000:cl=stereo -t 1 \
  -c:v libx264 -pix_fmt yuv420p -c:a aac \
  -fflags +bitexact -flags:v +bitexact -flags:a +bitexact \
  -map_metadata -1 recording.mkv
```
