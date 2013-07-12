chai = require("chai").should()
CameraControl = require "../CameraControl"
EventEmitter = require("events").EventEmitter

describe "#constructor", ->
  it "should be a CameraControl", ->
    cc = new CameraControl()
    cc.should.be.instanceof(CameraControl)

describe "#init", ->
  it "returns EventEmitter", ->
    ee = new CameraControl().init()
    ee.should.be.instanceof(EventEmitter)

describe "events", ->
  describe "on 'snap'", ->
    it "emits 'camera_begin_snap'", ->
      @cc = new CameraControl().init()
      @cc.emit "snap"