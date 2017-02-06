"use strict"

// Imports ---------------------------------------------------------------------

const fs = require("fs") // TMP for testing only

const moment = require("moment")
const Q = require("q")
const sharp = require("sharp")
const v4l2camera = require("v4l2camera")

const config = require("./config")
const exitCodes = require("./exitCodes")


// Globals ---------------------------------------------------------------------

const cameras = []

const compositeChannels = 3
const compositeHeight = config.cameras.reduce((n, cam) => {
    return n + cam.height - cam.skipTop - cam.skipBottom
}, 0)


// Init ------------------------------------------------------------------------

// Interrupt handlers
process.on("SIGINT", cleanup)
process.on("SIGHUP", cleanup)

// Initialise all of our cameras
config.cameras.forEach((conf) => {
    let cam = new v4l2camera.Camera(conf.device)

    let foundConfig = false
    for(let i=0; i<cam.formats.length; i++) {
        let format = cam.formats[i]
        if(
            format.formatName == "MJPG" &&
            format.width == config.width &&
            format.height == conf.height
        ) {
            foundConfig = true
            cam.configSet(format)
            break
        }
    }
    if(!foundConfig) {
        console.error("Failed to find matching config for camera "+JSON.stringify(conf))
        process.exit(exitCodes.NO_MATCHING_FORMAT)
    }

    cam.start()

    cameras.push(cam)
})


// TMP
function doIt(i)
{
    console.log(new Date + " GRAB  " + i) // TMP
    return generateComposite()
    .then((s) => {
        setTimeout(() => {
            s.image.jpeg().toFile("test-"+dateToString(s.earliest)+".jpg")
        }, 0)
    })
}
setTimeout(() => { // wait for cameras to finish starting
    var i = 0
    function iterate ()
    {
        console.log("FRAME "+i)
        doIt(i++)
        .finally(iterate)
    }
    iterate()
}, 5000)

// Helpers ---------------------------------------------------------------------

// :: (void) -> void
function cleanup ()
{
    cameras.forEach((cam) => {
        cam.stop()
    })
}

// Waits for the promise up to timeout milliseconds. Rejects if the promise is
// not fulfilled within the timeout.
// :: (int, Promise<X>) -> Promise<X, anything>
function promiseWithTimeout (timeout, promise)
{
    return Q.Promise((resolve, reject) => {
        let isDone = false
        var timer

        timer = setTimeout(() => {
            if(!isDone) {
                isDone = true
                reject(new Error("Timed out after " + timeout + "ms."))
            }
        }, timeout)

        promise.then(
            (x) => {
                if(!isDone) {
                    isDone = true
                    clearTimeout(timer)
                    resolve(x)
                }
            },
            reject
        )
    })
}

// Grab a frame from the given camera, with a Promise API.
// If the timeout is reached before the frame is captured, rejects the promise.
// :: (v4l2camera, int) -> Promise<Object, void>
// where Object :: {
//      "camera": v4l2camera,
//      "image": Buffer<RAW>,
//      "width": int,
//      "height": int,
//      "timestamp": Date,
// }
function grabFrame (cam, timeout)
{
    return promiseWithTimeout(timeout, Q.Promise((resolve, reject) => {
        cam.capture((success) => {
            if(!success) reject()
            else {
                let captureTime = new Date

                // We need to use the Sharp library to parse the JPEG from
                // v4l2camera, because:
                // 1. It is an MJPEG frame, which is not entirely valid JPEG.
                // 2. It seems to be slightly broken even if we patch it to JPEG.
                sharp(new Buffer(cam.frameRaw())) // MJPEG buffer
                .raw().toBuffer()
                .then((buffer) => { // RGB buffer
                    resolve({
                        image: buffer,
                        width: cam.width,
                        height: cam.height,
                        timestamp: captureTime,
                        camera: cam,
                    })
                })
                .catch(reject)
            }
        })
    }))
}

// Same as grabFrame(), except the promise will be Resolved with any error
// instead of being rejected.
// :: (...) -> Promise<{Object|Error}>
function grabFrameOrError ()
{
    return grabFrame.apply(this, arguments)
    .catch((err) => err)
}

// Formats a Date or moment-compatible value to a datetime string.
// :: () -> String
// :: (Date) -> String
function dateToString (d)
{
    return moment(d).format("YYYY-MM-DDTHH-mm-ss.SSSZZ")
}

// Grabs a frame from all cameras, then composite them into one large image.
// Returns a promise for the composite image and the timestamp of the earliest
// frame.
// :: (void) -> Promise<Object, anything>
// where Object :: {
//      image: Sharp,
//      earliest: Date,
// }
function generateComposite ()
{
    const widthTimesChannels = config.width * compositeChannels
    let compositeBuffer = Buffer.allocUnsafe(compositeHeight * widthTimesChannels)
    let offset = 0
    let earliest = new Date

    return Q.all(cameras.map((cam) => grabFrameOrError(cam, 200)))
    .then((captures) => {
        captures.forEach((capture, i) => {
            let conf = config.cameras[i]

            let sourceOffset = conf.skipTop * widthTimesChannels
            let copyRows = capture.height - conf.skipTop - conf.skipBottom
            let copyBytes = copyRows * widthTimesChannels
            capture.image.copy(
                compositeBuffer,
                offset,
                sourceOffset,
                sourceOffset + copyBytes
            )
            offset += copyBytes

            if(capture.timestamp.getTime() < earliest.getTime()) {
                earliest = capture.timestamp
            }
        })

        return {
            image: sharp(compositeBuffer, {
                raw: {
                    width: config.width,
                    height: compositeHeight,
                    channels: compositeChannels,
                },
            }),
            earliest: earliest,
        }
    })
}
