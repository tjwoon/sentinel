"use strict"

// Imports ---------------------------------------------------------------------

const moment = require("moment")
const Q = require("q")
const sharp = require("sharp")
const v4l2camera = require("v4l2camera")

const camConfig = require("./config")
const config = require("../config")
const exitCodes = require("./exitCodes")


// Globals ---------------------------------------------------------------------

const cameras = []

const compositeChannels = 3
const compositeHeight = camConfig.cameras.reduce((n, cam) => {
    return n + cam.height - cam.skipTop - cam.skipBottom
}, 0)


// Init ------------------------------------------------------------------------

// Interrupt handlers
process.on("SIGINT", cleanup)
process.on("SIGHUP", cleanup)

// Initialise all of our cameras
camConfig.cameras.forEach((conf) => {
    let cam = new v4l2camera.Camera(conf.device)

    let foundConfig = false
    for(let i=0; i<cam.formats.length; i++) {
        let format = cam.formats[i]
        if(
            format.formatName == "MJPG" &&
            format.width == camConfig.width &&
            format.height == conf.height &&
            format.interval.denominator / format.interval.numerator == conf.fps
        ) {
            foundConfig = true
            cam.configSet(format)
            console.log("Camera #"+i+" using format: "+JSON.stringify(format))
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

setTimeout(() => { // wait for cameras to finish starting
    function doOneStep ()
    {
        return saveCompositeFrame()
        .finally(doOneStep)
    }

    // Start saving frames to the filesystem.
    doOneStep()
}, camConfig.camInitDelay)

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
// :: (v4l2camera, int) -> Promise<Object, anything>
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
    .catch((err) => {
        if(err instanceof Error) return err
        else return new Error("Failed to grab frame.")
    })
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
    const widthTimesChannels = camConfig.width * compositeChannels
    let compositeBuffer = Buffer.alloc(compositeHeight * widthTimesChannels)
    let offset = 0
    let hasFrames = false
    let earliest = new Date

    return Q.all(cameras.map((cam) => grabFrameOrError(cam, 200)))
    .then((captures) => {
        captures.forEach((capture, i) => {
            let conf = camConfig.cameras[i]

            let sourceOffset = conf.skipTop * widthTimesChannels
            let copyRows = conf.height - conf.skipTop - conf.skipBottom
            let copyBytes = copyRows * widthTimesChannels
            if(!(capture instanceof Error)) {
                hasFrames = true
                capture.image.copy(
                    compositeBuffer,
                    offset,
                    sourceOffset,
                    sourceOffset + copyBytes
                )
                if(capture.timestamp.getTime() < earliest.getTime()) {
                    earliest = capture.timestamp
                }
            }
            offset += copyBytes
        })

        if(!hasFrames) {
            throw new Error ("No frames captured for composite image.")
        } else {
            return {
                image: sharp(compositeBuffer, {
                    raw: {
                        width: camConfig.width,
                        height: compositeHeight,
                        channels: compositeChannels,
                    },
                }),
                earliest: earliest,
            }
        }
    })
}

function saveCompositeFrame ()
{
    return generateComposite()
    .then(
        (s) => {
            let time = dateToString(s.earliest)
            s.image.jpeg().toFile(config.webcamOutputDirectory + '/' + time + '.jpg')
        },
        (e) => {
            console.error('ERROR Failed to capture a composite frame: ' + e)
        }
    )
}
