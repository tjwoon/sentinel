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
function doIt(i)
{
    console.log(new Date + " START " + i + " --------------------") // TMP
    return generateComposite()
    .then((canvas) => {
        console.log(new Date + " Writing to disk") // TMP
        let out = fs.createWriteStream("test-"+i+".jpg")
        canvas.syncJPEGStream().pipe(out)
        console.log(new Date + " DONE!") // TMP

        return Q.Promise((resolve) => {
            out.on("finish", () => resolve())
        })
    })
    .catch((err) => {
        console.log("ERROR: "+err) // TMP
    })
}
doIt(0)
.then(() => doIt(1))
.then(() => doIt(2))
.then(() => doIt(3))
.then(() => doIt(4))
.then(() => doIt(5))
.then(() => doIt(6))
.then(() => doIt(7))
.then(() => doIt(8))
.then(() => doIt(9))

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
                    reject(new Error("Frame capture timed out after "+timeout+"ms."))
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

// Grabs a frame from all cameras, then composite them into one large image.
// Returns a promise for the composite image.
// :: (void) -> Promise<Canvas, anything>
function generateComposite ()
{
    const textMargin = 10 // space between text and edge of image

    let canvas = new Canvas(config.outputWidth, config.outputHeight)
    let ctx = canvas.getContext("2d")
    ctx.antialias = "none"
    ctx.font = "16px normal \"sans-serif\""
    ctx.textDrawingMode = "glyph"

    return Q.all(cameras.map((cam) => grabFrame(cam)))
    .then((captures) => {
        captures.forEach((capture, i) => {
            let cameraConfig = config.cameras[i]
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
            ctx.fillText(
                moment(capture.timestamp).format("YYYY-MM-DD HH:mm:ss.SSS"),
                cameraConfig.targetX + textMargin,
                cameraConfig.targetY + capture.camera.height - textMargin
            )
        })

        return canvas
    })
}
