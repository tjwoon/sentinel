/***

This script downloads the latest videos from the dash cam when run,
and returns the captured files' paths.

***/

// Imports ---------------------------------------------------------------------

const _ = require('lodash')
const config = require('../config')
const fs = require('fs')
const grabConfig = require('./config')
const moment = require('moment')
const Q = require('q')
const request = require('request')


// Exported API ----------------------------------------------------------------

module.exports = function ()
{
    return Q.Promise((resolve, reject, notify) => {
        getMoviesList()
        .then((movies) => {
            let earliestTime = moment().subtract(grabConfig.minutesToGrab, 'm')
            let withinGrabDuration = movies.filter((m) => {
                return m.startTime
                    .add(grabConfig.minutesPerMovie, 'm')
                    .isAfter(earliestTime)
            })
            return downloadSequentially(withinGrabDuration)
        })
    })
}


// Helpers ---------------------------------------------------------------------

// Grabs list of movie URLs and timestamps, latest movie first.
// Promise is rejected with an error object or resolved with:
// [
//      {
//          url: 'http://...',
//          startTime: <MomentJS>
//      }
// ]
function getMoviesList ()
{
    return Q.Promise((resolve, reject) => {
        request('http://'+grabConfig.yi+'/YICARCAM/MOVIE', (err, resp, body) => {
            if(err) reject(err)
            else {
                resolve(
                    body.replace(/\r/g, '')
                    .split('\n')
                    .filter((line) => {
                        return line.indexOf('<a href') >= 0
                            && line.indexOf('Remove') < 0
                    })
                    .map((line) => {
                        let matches = line.match(/^.*\/YICARCAM\/MOVIE\/([^"]+)".*$/)
                        if(matches) {
                            let url = 'http://' + grabConfig.yi + '/YICARCAM/MOVIE/' + matches[1]
                            // format = 2017_0422_160138_344
                            let m = moment(matches[1], 'YYYY_MMDD_HHmmss')
                            if(!m.isValid()) {
                                console.error('Failed to parse datetime of ' + matches[1])
                            } else {
                                return {
                                    url: url,
                                    startTime: m.subtract(grabConfig.timezoneCorrection, 'm'),
                                }
                            }
                        }
                    })
                    .filter((val) => val) // remove null items
                    .sort((a, b) => {
                        if(a.startTime.isAfter(b.startTime)) return -1
                        else if(a.startTime.isBefore(b.startTime)) return 1
                        else return 0
                    })
                )
            }
        })
    })
}

// Downloads given movies one by one.
// Rejected with any error, or resolved with an array of output paths, in the
// same sequence.
function downloadSequentially (movies)
{
    let outputPaths = []
    return movies.reduce((previous, movie) => {
        return previous.then(() => {
            let outPath = outputPath(movie)
            outputPaths.push(outPath)
            return download(movie.url, outPath)
        })
    }, Q.when(true))
    .then(() => outputPaths)
}

// Download a URL to the given path.
// Rejected with an Error instance, or resolved with undefined.
function download (url, path)
{
    return Q.Promise((resolve, reject) => {
        let hasFinished = false
        let outStream = fs.createWriteStream(path, {
            autoClose: true,
        })

        outStream.on('finish', () => { // TODO change to 'close' event so we
                                       // don't need to wait for fs flush??
            if(hasFinished) return
            hasFinished = true
            resolve()
        })

        outStream.on('error', (err) => {
            if(hasFinished) return
            hasFinished = true
            reject(err)
        })

        request(url).pipe(outStream)
    })
}

function outputPath (movie)
{
    return config.yidashcamOutputDirectory
         + '/' + movie.startTime.format('YYYYMMDD_HHmmss_UTC') + '.mp4'
}
