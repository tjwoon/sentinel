/***

- Nearest Ethernet, bottom:  platform-3f980000.usb-usb-0:1.3:1.0-video-index0
- Nearest Ethernet, top:     platform-3f980000.usb-usb-0:1.2:1.0-video-index0
- Furthest Ethernet, bottom: platform-3f980000.usb-usb-0:1.5:1.0-video-index0
- Furthest Ethernet, top:    platform-3f980000.usb-usb-0:1.4:1.0-video-index0

***/

const camHeight = 360
const skip = 0

module.exports = {
    width: 640, // All cameras must capture at this width!
    cameras: [
        {
            device: "/dev/v4l/by-path/platform-3f980000.usb-usb-0:1.2:1.0-video-index0",
            height: camHeight,
            skipTop: skip,
            skipBottom: skip,
        },
        {
            device: "/dev/v4l/by-path/platform-3f980000.usb-usb-0:1.3:1.0-video-index0",
            height: camHeight,
            skipTop: skip,
            skipBottom: skip,
        },
        {
            device: "/dev/v4l/by-path/platform-3f980000.usb-usb-0:1.5:1.0-video-index0",
            height: camHeight,
            skipTop: skip,
            skipBottom: skip,
        },
    ],
}
