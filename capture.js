"use strict"

// Imports ---------------------------------------------------------------------

const fs = require("fs") // TMP for testing only

const sharp = require("sharp") // MUST require `sharp` before `canvas`!
    // See https://github.com/lovell/sharp/issues/371
const Canvas = require("canvas")
const Image = Canvas.Image
const moment = require("moment")
const Q = require("q")
const v4l2camera = require("v4l2camera")

const config = require("./config")
const exitCodes = require("./exitCodes")


// Globals ---------------------------------------------------------------------

const cameras = []


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
            format.width == conf.width &&
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


// TMP grab 10 frames as performance test
// function doIt (i)
// {
//     if(i >= 10) return
//     else {
//         console.log((new Date) + "--------------------------------------------")
//         Q.all(cameras.map(grabFrame))
//         .then((frames) => {
//             sharp(frames[0]).toFile("test-"+i+".jpg")
//             .then(() => doIt(i+1))
//         })
//     }
// }
// doIt(0)

// TMP
let writeQueue = [] // { buffer:Buffer, frameNo:int }
function doIt(i)
{
    console.log(new Date + " GRAB  " + i) // TMP
    return generateComposite()
    .then((canvas) => {
        // We have to finish reading from this canvas before we start with a
        // new canvas, otherwise we get an error from libuv:
        // `node: ../deps/uv/src/unix/core.c:888: uv__io_stop: Assertion `loop->watchers[w->fd] == w' failed.`
        // See:
        // - https://github.com/libuv/libuv/issues/806
        // - https://github.com/joyent/libuv/issues/1348
        // - https://github.com/nodejs/node/issues/3604
        return Q.Promise((resolve) => {
            let buffers = []
            let jpegStream = canvas.syncJPEGStream()
            jpegStream.on("data", (d) => buffers.push(d))
            jpegStream.on("end", () => {
                let buf = Buffer.concat(buffers)
                writeQueue.push({
                    buffer: buf,
                    frameNo: i,
                })
                resolve()
            })
        })
    })
}
function processWriteQueue ()
{
    if(writeQueue.length) {
        let item = writeQueue.shift()
        fs.writeFileSync("test-"+item.frameNo+".jpg", item.buffer)
        setTimeout(processWriteQueue, 200)
    } else {
        setTimeout(processWriteQueue, 200)
    }
}
processWriteQueue()
setTimeout(() => { // wait for cameras to finish starting
    var i = 0
    function iterate ()
    {
        console.log("FRAME "+i)
        doIt(i++)
        .then(iterate)
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

// Grab a frame from the given camera, with a Promise API.
// If the optional timeout is reached before the frame is captured, rejects
// the promise.
// :: (v4l2camera) -> Promise<Object, void>
// :: (v4l2camera, int) -> Promise<Object, void>
// where Object :: {
//      "camera": v4l2camera,
//      "image": Image,
//      "timestamp": Date,
// }
function grabFrame (cam, timeout)
{
    return Q.Promise((resolve, reject) => {
        let isDone = false
        var timer

        if(timeout != null) {
            timer = setTimeout(() => {
                if(!isDone) {
                    isDone = true
                    reject(
                        new Error(
                            "Frame capture timed out at "
                            + dateToString()
                            + ", after "
                            + timeout
                            + "ms."
                        )
                    )
                }
            }, timeout)
        }

        cam.capture((success) => {
            if(isDone) return
            else {
                if(timer !== undefined) clearTimeout(timer)
                isDone = true

                if(!success) reject()
                else {
                    let captureTime = new Date

                    // We need to use the Sharp library to parse the JPEG from
                    // v4l2camera, because:
                    // 1. It is an MJPEG frame, which is not entirely valid JPEG.
                    // 2. It seems to be slightly broken even if we patch it to JPEG.
                    sharp(new Buffer(cam.frameRaw()))
                    .jpeg().toBuffer()
                    .then((buffer) => {
                        let img = new Image
                        img.src = buffer
                        img.dataMode = Image.MODE_MIME
                        resolve({
                            image: img,
                            timestamp: captureTime,
                            camera: cam,
                        })
                    })
                }
            }
        })
    })
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
    return moment(d).format("YYYY-MM-DD HH:mm:ss.SSS")
}

// Grabs a frame from all cameras, then composite them into one large image.
// Returns a promise for the composite image.
// :: (void) -> Promise<Canvas, anything>
function generateComposite ()
{
    const textMargin = 10 // space between text and edge of image

    let canvas = new Canvas(config.outputWidth, config.outputHeight)
    let ctx = canvas.getContext("2d")
    ctx.antialias = "none"
    ctx.fillStyle = "#ff0000"
    ctx.font = "16px normal \"sans-serif\""
    ctx.textDrawingMode = "glyph"

    return Q.all(cameras.map((cam) => grabFrameOrError(cam, 200)))
    .then((captures) => {
        captures.forEach((capture, i) => {
            let cameraConfig = config.cameras[i]
            let textX = cameraConfig.targetX + textMargin
            let textY = cameraConfig.targetY + cameraConfig.targetHeight - textMargin

            if(capture instanceof Error) {
                ctx.fillText(capture.message, textX, textY)
            } else {
                ctx.drawImage(
                    capture.image,
                    cameraConfig.sourceX,
                    cameraConfig.sourceY,
                    cameraConfig.sourceWidth,
                    cameraConfig.sourceHeight,
                    cameraConfig.targetX,
                    cameraConfig.targetY,
                    cameraConfig.targetWidth,
                    cameraConfig.targetHeight
                )
                ctx.fillText(dateToString(capture.timestamp), textX, textY)
            }
        })

        return canvas
    })
}
