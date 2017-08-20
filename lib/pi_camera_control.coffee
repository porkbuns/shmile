EventEmitter = require("events").EventEmitter
spawn = require("child_process").spawn
exec = require("child_process").exec

moment = require("moment")
RaspiCam = require("raspicam");

class PiCameraControl

  constructor: (
    # @filename="%m-%y-%d_%H:%M:%S.jpg",
    @filename='YYYY-MM-DD_HH:mm:ss',
    @cwd="/home/pi/shmile/public/photos",
    @web_root_path="/photos") ->

  init: ->
    emitter = new EventEmitter()
    emitter.on "snap", (onCaptureSuccess, onSaveSuccess) =>
      now = moment()
      formatted = now.format(@filename)
      fname =  @cwd + "/" + formatted + ".jpg"
      camera = new RaspiCam({mode: "photo", output: fname, op:20, t:200});
      emitter.emit "camera_begin_snap"
      camera.start( )


      # listen for the "start" event triggered when the start method has been successfully initiated
      camera.on "start", =>
        emitter.emit "camera_snapped"
        onCaptureSuccess() if onCaptureSuccess?

      camera.on "read", (err, timestamp, filename) =>
        emitter.emit(
          "photo_saved",
          filename,
          @cwd + "/" + filename,
          @web_root_path + "/" + filename
        )
        camera.stop()
        onSaveSuccess() if onSaveSuccess?
    emitter

module.exports = PiCameraControl
