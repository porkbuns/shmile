chai = require("chai").should()
ImageTwiddler = require "../ImageTwiddler"
EventEmitter = require("events").EventEmitter

describe "#constructor", ->
  it "should be a ImageTwiddler", ->
    cc = new ImageTwiddler()
    cc.should.be.instanceof(ImageTwiddler)

describe "#init", ->
  it "returns EventEmitter", ->
    ee = new ImageTwiddler().init()
    ee.should.be.instanceof(EventEmitter)

describe "events", ->
  describe "on 'composite'", ->
    it "emits 'laid_out' when done", ->
      @it = new ImageTwiddler().init([])
      @it.emit "composite"