express = require "express"
jade = require "jade"
http = require "http"
# sys = require "sys"
# util = require "util"
fs = require "fs"
yaml = require "yaml"
dotenv = require "dotenv"
exec = require("child_process").exec

dotenv.load()

PhotoFileUtils = require("./lib/photo_file_utils")
StubCameraControl = require("./lib/stub_camera_control")
CameraControl = require("./lib/camera_control")
Template = require("./lib/template")

ImageCompositor = require("./lib/image_compositor")
DoubleImageCompositor = require("./lib/double_image_compositor")

exp = express()
web = http.createServer(exp)
template = new Template({overlayImage: "/images/img_photobooth.png", photoView: 'PortraitOneByFour', compositor: new DoubleImageCompositor()})
# template = new Template({overlayImage: "/images/overlay.png", photoView: 'LandscapeTwoByTwo', compositor: new ImageCompositor()})
console.log("printer is: #{template.printerEnabled}")

exp.configure ->
  exp.set "views", __dirname + "/views"
  exp.set "view engine", "jade"
  exp.use express.json()
  exp.use express.methodOverride()
  exp.use exp.router
  exp.use express.static(__dirname + "/public")

exp.get "/", (req, res) ->
  res.render "index",
    title: "shmile"
    extra_css: []

exp.get "/gallery", (req, res) ->
  res.render "gallery",
    title: "gallery!"
    extra_css: [ "photoswipe/photoswipe" ]
    image_paths: PhotoFileUtils.composited_images(true)

# FIXME/ahao This global state is no bueno.
# State = image_src_list: []

ccKlass = if process.env['STUB_CAMERA'] is "true" then StubCameraControl else CameraControl
camera = new ccKlass().init()
# @compositor = new template.compositor().init()

camera.on "photo_saved", (filename, path, web_url) ->
  # FIXME:
  # template.compositor.image_src_list.push path
  template.compositor.push path

io = require("socket.io").listen(web)
web.listen 3000
io.sockets.on "connection", (websocket) ->
  console.log "Web browser connected"

  compositor = template.compositor.init();

  websocket.emit "template", template

  camera.on "camera_begin_snap", ->
    websocket.emit "camera_begin_snap"

  camera.on "camera_snapped", ->
    websocket.emit "camera_snapped"

  camera.on "photo_saved", (filename, path, web_url) ->
    websocket.emit "photo_saved",
      filename: filename
      path: path
      web_url: web_url

  websocket.on "snap", () ->
    camera.emit "snap"

  websocket.on "all_images", ->

  websocket.on "composite", ->
    # compositor = new ImageCompositor(State.image_src_list).init()
    # compositor = new DoubleImageCompositor(State.image_src_list).init()
    # compositor = template.compositor
    compositor.emit "composite", template.overlayImage
    compositor.on "composited", (output_file_path) ->
      console.log "Finished compositing image. Output image is at ", output_file_path
      # State.image_src_list = []
      template.compositor.clearImages()


      # Control this with PRINTER=true or PRINTER=false
      # if process.env.PRINTER_ENABLED is "true"
      if template.printerEnabled
        console.log "Printing image at ", output_file_path
        # exec "lpr -o #{process.env.PRINTER_IMAGE_ORIENTATION} -o media=\"#{process.env.PRINTER_MEDIA}\" #{output_file_path}"
        exec "lpr -o #{template.printer} #{output_file_path}"
      websocket.broadcast.emit "composited_image", PhotoFileUtils.photo_path_to_url(output_file_path)

    compositor.on "generated_thumb", (thumb_path) ->
      websocket.broadcast.emit "generated_thumb", PhotoFileUtils.photo_path_to_url(thumb_path)
