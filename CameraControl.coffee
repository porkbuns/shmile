EventEmitter = require("events").EventEmitter
spawn = require("child_process").spawn
exec = require("child_process").exec

###
# Interface to gphoto2 via the command line.
#
# It's highly fragile and prone to failure, so if anyone wants
# to take a crack at redoing the node-gphoto2 bindings, be my
# guest...
###
class CameraControl
  saving_regex: /Saving file as ([^.jpg]+)/g
  captured_success_regex: /New file is in/g

  constructor: (@filename="%m-%y-%d_%H:%M:%S.jpg", @cwd="public/photos", @web_root_path="/photos") ->

  init: ->
    exec "killall PTPCamera"
    emitter = new EventEmitter()
    emitter.on "snap", =>
      emitter.emit "camera_begin_snap"
      console.log "snapping..."
      capture = spawn("gphoto2", [ "--capture-image-and-download", "--force-overwrite", "--filename=" + @filename ],
        cwd: @cwd
      )
      console.log "capture object is " + capture
      capture.stdout.on "data", (data) =>
        if @captured_success_regex.exec(data.toString())
          console.log "camera snapped!"
          emitter.emit "camera_snapped"
        saving = @saving_regex.exec(data.toString())
        if saving
          fname = saving[1] + ".jpg"
          console.log "saved to " + fname
          emitter.emit "photo_saved", fname, @cwd + "/" + fname, @web_root_path + "/" + fname
    emitter

module.exports = CameraControl
