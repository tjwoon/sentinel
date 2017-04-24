/***

Note: This is not a JSON file because we want comments, variables, etc!


***/

const camHeight = 360
const USB_NEAR_ETHERNET_BOTTOM = '/dev/v4l/by-path/platform-3f980000.usb-usb-0:1.3:1.0-video-index0'
const USB_NEAR_ETHERNET_TOP =    '/dev/v4l/by-path/platform-3f980000.usb-usb-0:1.2:1.0-video-index0'
const USB_FAR_ETHERNET_BOTTOM =  '/dev/v4l/by-path/platform-3f980000.usb-usb-0:1.5:1.0-video-index0'
const USB_FAR_ETHERNET_TOP =     '/dev/v4l/by-path/platform-3f980000.usb-usb-0:1.4:1.0-video-index0'

const skip = 0

module.exports = {
    width: 640, // All cameras must capture at this width!
    cameras: [
        {
            device: "/dev/v4l/by-path/platform-3f980000.usb-usb-0:1.2:1.0-video-index0",
            height: camHeight,
            skipTop: skip,
            skipBottom: skip,
            fps: 15,
        },
        {
            device: "/dev/v4l/by-path/platform-3f980000.usb-usb-0:1.3:1.0-video-index0",
            height: camHeight,
            skipTop: skip,
            skipBottom: skip,
            fps: 15,
        },
        {
            device: "/dev/v4l/by-path/platform-3f980000.usb-usb-0:1.5:1.0-video-index0",
            height: camHeight,
            skipTop: skip,
            skipBottom: skip,
            fps: 15,
        },
    ],
}
