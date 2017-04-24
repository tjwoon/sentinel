File Grab: Yi Dash Cam
======================

Downloads the latest videos from the Yi Dash Cam.


Usage
-----

Note: The Yi Dash Cam transfers via WiFi quite slowly (around 2MB/s), and each
minute of recorded video is about 100MB-110MB, therefore this command will take
quite a long time...

```javascript
require('./yidashcam-grab')()
.then(
    (savedFilePaths) => {
        console.log('DOWNLOADED')
    },
    (err) => {
        console.log('Error... ' + err)
    }
)
```
