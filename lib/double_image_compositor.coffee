im = require("imagemagick")
# exec = require("child_process").exec
fs = require("fs")
EventEmitter = require("events").EventEmitter

IMAGE_HEIGHT = 583
IMAGE_WIDTH = 875
TOTAL_HEIGHT = 2550
TOTAL_WIDTH = 1750 / 2.0

# Composites an array of four images into the final grid-based image asset.
class DoubleImageCompositor


  defaults:
    # overlay_src: "public/images/overlay_david.png"
    tmp_dir: "public/temp"
    output_dir: "public/photos/generated"
    thumb_dir: "public/photos/generated/thumbs"

  constructor: (@opts=null) ->
    # console.log("img_src_list is: #{@img_src_list}")
    @opts = @defaults if @opts is null
    @img_src_list = []

  push: (image) ->
    @img_src_list.push image

  clearImages: ->
    console.log "clearImages"
    @img_src_list.length = 0

  init: ->
    emitter = new EventEmitter()
    emitter.on "composite", (overlay_src) =>
      convertArgs = [ "-size", TOTAL_WIDTH + "x" + TOTAL_HEIGHT, "canvas:white" ]
      utcSeconds = (new Date()).valueOf()
      IMAGE_GEOMETRY = "#{IMAGE_WIDTH}x#{IMAGE_HEIGHT}"
      OUTPUT_FILE_NAME = "#{utcSeconds}.jpg"
      FINAL_OUTPUT_PATH = "#{@opts.output_dir}/gen_#{OUTPUT_FILE_NAME}"
      FINAL_OUTPUT_THUMB_PATH = "#{@opts.thumb_dir}/thumb_#{OUTPUT_FILE_NAME}"

      for i in [0..@img_src_list.length-1] by 1
        convertArgs.push @img_src_list[i]
        convertArgs.push "-geometry"
        convertArgs.push IMAGE_WIDTH + "x" + IMAGE_HEIGHT + "+0+" + i * IMAGE_HEIGHT # TODO: use constants
        convertArgs.push "-composite"

      # convertArgs.push @opts.overlay_src
      # FIXME: remove the need for hardcoded public
      convertArgs.push "public" + overlay_src
      convertArgs.push "-geometry"
      convertArgs.push TOTAL_WIDTH + "x" + TOTAL_HEIGHT + "+0+0"
      convertArgs.push "-composite"

      convertArgs.push "-duplicate"
      convertArgs.push "1"
      convertArgs.push "+append"

      convertArgs.push FINAL_OUTPUT_PATH

      console.log("executing: convert #{convertArgs.join(" ")}")

      im.convert(
        convertArgs,
        (err, stdout, stderr) ->
          throw err  if err
          emitter.emit "composited", FINAL_OUTPUT_PATH
          doGenerateThumb()
      )

      resizeCompressArgs = [ "-size", "25%", "-quality", "20", FINAL_OUTPUT_PATH, FINAL_OUTPUT_THUMB_PATH ]

      doGenerateThumb = =>
        im.convert resizeCompressArgs, (e, out, err) ->
          throw err  if err
          emitter.emit "generated_thumb", FINAL_OUTPUT_THUMB_PATH

    emitter

module.exports = DoubleImageCompositor
