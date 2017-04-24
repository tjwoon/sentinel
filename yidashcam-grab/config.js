'use strict'

module.exports = {
    yi: '192.168.1.254', // IP address of the Yi dash cam
    minutesToGrab: 5, // minimum number of minutes of video to grab
    minutesPerMovie: 3, // length of each video clip (configured in the Dash Cam
        // settings!)
    timezoneCorrection: 8*60, // Yi Dash Cam's timezone setting, minutes from UTC
        // e.g. Malaysia (GMT+0800) should be configured as 8*60 here.
}
