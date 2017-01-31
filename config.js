/***

- Nearest Ethernet, bottom:  platform-3f980000.usb-usb-0:1.3:1.0-video-index0
- Nearest Ethernet, top:     platform-3f980000.usb-usb-0:1.2:1.0-video-index0
- Furthest Ethernet, bottom: platform-3f980000.usb-usb-0:1.5:1.0-video-index0
- Furthest Ethernet, top:    platform-3f980000.usb-usb-0:1.4:1.0-video-index0

***/

const camWidth = 960
const camHeight = 544

module.exports = {
    outputWidth: 1920,
    outputHeight: 1080,
    cameras: [
        {
            device: "/dev/v4l/by-path/platform-3f980000.usb-usb-0:1.2:1.0-video-index0",
            width: camWidth,
            height: camHeight,
            targetX: 0,
            targetY: 0,
        },
        {
            device: "/dev/v4l/by-path/platform-3f980000.usb-usb-0:1.3:1.0-video-index0",
            width: camWidth,
            height: camHeight,
            targetX: 960,
            targetY: 0,
        },
        {
            device: "/dev/v4l/by-path/platform-3f980000.usb-usb-0:1.5:1.0-video-index0",
            width: camWidth,
            height: camHeight,
            targetX: 0,
            targetY: 536,
        },
    ],
}
