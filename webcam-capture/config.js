/***

Note: This is not a JSON file because we want comments, variables, etc!

You can find out your webcam's supported video formats and resolutions via the
command line:

```
$ v4l2-ctl -d /dev/v4l/by-path/platform-3f980000.usb-usb-0:1.3:1.0-video-index0 --list-formats
$ v4l2-ctl -d /dev/v4l/by-path/platform-3f980000.usb-usb-0:1.3:1.0-video-index0 --list-formats-ext
```

***/

const USB_NEAR_ETHERNET_BOTTOM = '/dev/v4l/by-path/platform-3f980000.usb-usb-0:1.3:1.0-video-index0'
const USB_NEAR_ETHERNET_TOP =    '/dev/v4l/by-path/platform-3f980000.usb-usb-0:1.2:1.0-video-index0'
const USB_FAR_ETHERNET_BOTTOM =  '/dev/v4l/by-path/platform-3f980000.usb-usb-0:1.5:1.0-video-index0'
const USB_FAR_ETHERNET_TOP =     '/dev/v4l/by-path/platform-3f980000.usb-usb-0:1.4:1.0-video-index0'

const camHeight = 448
const skip = 0

module.exports = {
    camInitDelay: 5000, // Allow this amount of time for all cameras to complete initialisation
    width: 800, // All cameras must capture at this width!
    cameras: [
        {
            device: USB_NEAR_ETHERNET_TOP,
            height: camHeight,
            skipTop: skip,
            skipBottom: skip,
            fps: 15,
        },
        {
            device: USB_NEAR_ETHERNET_BOTTOM,
            height: camHeight,
            skipTop: skip,
            skipBottom: skip,
            fps: 15,
        },
    ],
}
