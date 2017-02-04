"use strict"

// Imports ---------------------------------------------------------------------

const fs = require("fs") // TMP for testing only

const sharp = require("sharp") // MUST require `sharp` before `canvas`!
    // See https://github.com/lovell/sharp/issues/371
const Canvas = require("canvas")
const Image = Canvas.Image
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
// :: (v4l2camera) -> Promise<Image, void>
function grabFrame (cam)
{
    return Q.Promise((resolve, reject) => {
        cam.capture((success) => {
            if(!success) reject()
            else {
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
                    resolve(img)
                })
            }
        })
    })
}

// Grabs a frame from all cameras, then composite them into one large image.
// Returns a promise for the composite image.
// :: (void) -> Promise<Canvas, anything>
function generateComposite ()
{
    let canvas = new Canvas(config.outputWidth, config.outputHeight)
    let ctx = canvas.getContext("2d")

    return Q.all(cameras.map(grabFrame))
    .then((frames) => {
        frames.forEach((frame, i) => {
            let cameraConfig = config.cameras[i]
            ctx.drawImage(
                frame,
                cameraConfig.targetX,
                cameraConfig.targetY,
                cameraConfig.width,
                cameraConfig.height
            )
        })

        return canvas
    })
}
