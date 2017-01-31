"use strict"

// Imports ---------------------------------------------------------------------

const Q = require("q")
const sharp = require("sharp")
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
function doIt (i)
{
    if(i >= 10) return
    else {
        console.log((new Date) + "--------------------------------------------")
        generateComposite()
        .then((composite) => {
            composite.toFile("test-"+i+".jpg")
        })
        .then(() => doIt(i+1))
    }
}
doIt(0)

// Helpers ---------------------------------------------------------------------

// :: (void) -> void
function cleanup ()
{
    cameras.forEach((cam) => {
        cam.stop()
    })
}

// Grab a frame from the given camera, with a Promise API.
// :: (v4l2camera) -> Promise<Buffer(JPEG)>
function grabFrame (cam)
{
    return Q.Promise((resolve, reject) => {
        cam.capture((success) => {
            if(success) resolve(new Buffer (cam.frameRaw()))
            else reject()
        })
    })
}

// Grabs a frame from all cameras, then composite them into one large image.
// Returns a promise for the composite image.
// :: (void) -> Promise<sharp>
function generateComposite ()
{
    const outputWidth = config.outputWidth
    const outputHeight = config.outputHeight

    return Q.all(cameras.map(grabFrame))
    .then((frames) => {
        let canvas = createBlankImage(outputWidth, outputHeight)

        let compositeBuffer = frames.reduce((base, overlay, i) => {
            return base.then((buffer) => {
                let cameraConfig = config.cameras[i]

                return sharp(buffer)
                .overlayWith(overlay, {
                    top: cameraConfig.targetY,
                    left: cameraConfig.targetX,
                })
                .jpeg().toBuffer()
            })
        }, canvas.jpeg().toBuffer())

        return compositeBuffer.then((buffer) => sharp(buffer))
    })
}

// Creates a blank canvas with a black background.
// :: (int, int) -> sharp
function createBlankImage (width, height)
{
    const channels = 3
    const buffer = Buffer.alloc(width * height * channels)

    return sharp(buffer, {
        raw: {
            width: width,
            height: height,
            channels: channels,
        }
    })
}
