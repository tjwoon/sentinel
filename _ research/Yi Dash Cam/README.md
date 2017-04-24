Yi Dash Cam R&D
===============

This directory contains notes on my research on how to communicate with and
control a Xiaomi Yi Dash Cam.


Model
-----

The Yi Dash Cam researched here is:

- Chinese model, running English firmware
- Firmware version V-1.01.005-US


Saved videos listing
--------------------

The Yi exposes a webpage on port 80, which allows you to:

- Browse saved video clips and images
- Upload "new file"
- Upload "custom file"


### movie_list.html

```
$ curl 'http://192.168.1.254/YICARCAM/MOVIE'
```

Outputs [this file](movie_list.html).

### movie_list_extracted.txt

```
$ curl 'http://192.168.1.254/YICARCAM/MOVIE'                                   \
	| grep '<a href'                                                           \
	| grep -v Remove                                                           \
	| sed -Ee 's/^.*(\/YICARCAM\/MOVIE\/[^"]+)".*$/http:\/\/192.168.1.254\1/'  \
	| sort
```

Outputs [this file](movie_list_extracted.txt).


Autoexec.ash
------------

I tried uploading an [autoexec file](autoexec.ash) as per the Xiaoyi Action
Camera hacking resources, but nothing happened. Suspect the Dash Cam is not
running Linux, as it has paths starting with a drive letter `A:\YICARCAM\...`.


File Size
---------

File size is not affected by Mic:On / Mic:Off setting. Video still has audio
channel either way.


WiFi
----

- Dashcam is always at 192.168.1.254.
- Clients start at 192.168.1.33 and go up from there (multiple clients are
	allowed).
- WiFi network has WPA2 Personal security. PHY mode 802.11n, 2.4GHz.


Reverse Engineering
===================

Yi app MUST be connected to a WiFi network whose name takes the form:
`YICarCam_12345`. Any other format will cause the app to believe it is NOT
connected to a camera.

Server must be at 192.168.1.254.

Yi dash cam ports:

```
Port Scan has started…

Port Scanning host: 192.168.1.254

	 Open TCP Port: 	80     		http
	 Open TCP Port: 	3333   		dec-notes
Port Scan has completed…
```

Note: Open ports change after app successfully connects. See reverse engineering
item #3.

Notes: We should reverse engineer using the `nc` and `telnet` programs. However,
for some reason I can't get any response when masquerading as the Yi App (I
could only get response via `curl`)...

`telnet`:

```
TJs-MacBook-Pro:R&D tjwoon$ telnet 192.168.1.254 80
Trying 192.168.1.254...
Connected to 192.168.1.254.
Escape character is '^]'.
GET /?custom=1&cmd=8001 HTTP/1.1
Host: 192.168.1.254
Accept: */*
Cookie: xAuth_SESSION_ID=6hgI46jl2o06/bz0Z2n1/AA=
User-Agent: car-camera/2.01.048 (iPhone; iOS 10.3.1; Scale/2.00)
Accept-Language: en-MY;q=1
Accept-Encoding: gzip, deflate
Connection: keep-alive

Connection closed by foreign host.
```

Same problem with `nc`:

```
TJs-MacBook-Pro:R&D tjwoon$ nc 192.168.1.254 80
GET /?custom=1&cmd=8001 HTTP/1.1
Host: 192.168.1.254
Accept: */*
Cookie: xAuth_SESSION_ID=6hgI46jl2o06/bz0Z2n1/AA=
User-Agent: car-camera/2.01.048 (iPhone; iOS 10.3.1; Scale/2.00)
Accept-Language: en-MY;q=1
Accept-Encoding: gzip, deflate
Connection: keep-alive

```


Yi app startup sequence
-----------------------

### 1. Loads http://192.168.1.254/?custom=1&cmd=8001

Request from Yi:

```
GET /?custom=1&cmd=8001 HTTP/1.1
Host: 192.168.1.254
Accept: */*
Cookie: xAuth_SESSION_ID=6hgI46jl2o06/bz0Z2n1/AA=
User-Agent: car-camera/2.01.048 (iPhone; iOS 10.3.1; Scale/2.00)
Accept-Language: en-MY;q=1
Accept-Encoding: gzip, deflate
Connection: keep-alive
```

Reverse engineering:

```
TJs-MacBook-Pro:reverse-engineering tjwoon$ curl -v 'http://192.168.1.254/?custom=1&cmd=8001'
*   Trying 192.168.1.254...
* TCP_NODELAY set
* Connected to 192.168.1.254 (192.168.1.254) port 80 (#0)
> GET /?custom=1&cmd=8001 HTTP/1.1
> Host: 192.168.1.254
> User-Agent: curl/7.51.0
> Accept: */*
>
< HTTP/1.1 200 OK
< Server: hfs/1.00.000
< Cache-Control:no-store, no-cache, must-revalidate
< Pragma: no-cache
< Accept-Ranges: bytes
< Content-length: 97
< Content-type: text/xml
< Connection: close
<
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>8001</Cmd>
<Status>0</Status>
* Curl_http_done: called premature == 0
* Closing connection 0
</Function>
```

Send this response for successful connection in Yi app:

```
HTTP/1.1 200 OK
Server: hfs/1.00.000
Cache-Control:no-store, no-cache, must-revalidate
Pragma: no-cache
Accept-Ranges: bytes
Content-length: 97
Content-type: text/xml
Connection: close

<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>8001</Cmd>
<Status>0</Status>
</Function>
```

### 2. Loads: /?custom=1&cmd=3001&par=1

Request from Yi:

```
GET /?custom=1&cmd=3001&par=1 HTTP/1.1
Host: 192.168.1.254
Accept: */*
Cookie: xAuth_SESSION_ID=6hgI46jl2o06/bz0Z2n1/AA=
User-Agent: car-camera/2.01.048 (iPhone; iOS 10.3.1; Scale/2.00)
Accept-Language: en-MY;q=1
Accept-Encoding: gzip, deflate
Connection: keep-alive
```

Reverse engineering:

(This does not seem correct. Yi app says error after this response. Possibly as
status == -256...)

```
TJs-MacBook-Pro:R&D tjwoon$ curl -v 'http://192.168.1.254/?custom=1&cmd=3001&par=1'
*   Trying 192.168.1.254...
* TCP_NODELAY set
* Connected to 192.168.1.254 (192.168.1.254) port 80 (#0)
> GET /?custom=1&cmd=3001&par=1 HTTP/1.1
> Host: 192.168.1.254
> User-Agent: curl/7.51.0
> Accept: */*
>
< HTTP/1.1 200 OK
< Server: hfs/1.00.000
< Cache-Control:no-store, no-cache, must-revalidate
< Pragma: no-cache
< Accept-Ranges: bytes
< Content-length: 100
< Content-type: text/xml
< Connection: close
<
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>3001</Cmd>
<Status>-256</Status>
* Curl_http_done: called premature == 0
* Closing connection 0
</Function>
```

Send this response for successful connection in Yi app:

```
HTTP/1.1 200 OK
Server: hfs/1.00.000
Cache-Control:no-store, no-cache, must-revalidate
Pragma: no-cache
Accept-Ranges: bytes
Content-length: 97
Content-type: text/xml
Connection: close

<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>3001</Cmd>
<Status>0</Status>
</Function>
```

#### 2B. Command 3034

Sometimes, the Yi app will send the following request before step 3.

```
GET /?custom=1&cmd=3034&str=2017-04-23_22:57:56 HTTP/1.1
Host: 192.168.1.254
Accept: */*
Accept-Language: en-MY;q=1
Connection: keep-alive
Accept-Encoding: gzip, deflate
User-Agent: car-camera/2.01.048 (iPhone; iOS 10.3.1; Scale/2.00)

```

Calling the Yi dash cam on our own yields this:

```
TJs-MacBook-Pro:R&D tjwoon$ curl -v 'http://192.168.1.254/?custom=1&cmd=3034&str=2017-04-23_22:57:56'
*   Trying 192.168.1.254...
* TCP_NODELAY set
* Connected to 192.168.1.254 (192.168.1.254) port 80 (#0)
> GET /?custom=1&cmd=3034&str=2017-04-23_22:57:56 HTTP/1.1
> Host: 192.168.1.254
> User-Agent: curl/7.51.0
> Accept: */*
>
< HTTP/1.1 200 OK
< Server: hfs/1.00.000
< Cache-Control:no-store, no-cache, must-revalidate
< Pragma: no-cache
< Accept-Ranges: bytes
< Content-length: 97
< Content-type: text/xml
< Connection: close
<
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>3034</Cmd>
<Status>0</Status>
* Curl_http_done: called premature == 0
* Closing connection 0
</Function>
```

### 3. App will talk to server on port 3333

After step 2 above, the open ports on the Yi dash cam become:

```
Port Scan has started…

Port Scanning host: 192.168.1.254

	 Open TCP Port: 	80     		http
	 Open TCP Port: 	554    		rtsp
	 Open TCP Port: 	3333   		dec-notes
	 Open TCP Port: 	8000   		irdmi
Port Scan has completed…
```

App will reuse one connection to port 3333, and keep sending this string:
"02:001:0" at regular intervals (every second?).

e.g. `02:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:0`

App has also been observed to first send "02:002:-1", then switch to "02:001:0":

e.g. `02:002:-102:002:-102:002:-102:002:-102:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:002:001:0`

After no response for a few seconds (10?), app will disconnect.

App will also connect to port 554:

```
OPTIONS rtsp://192.168.1.254:554/xxxx.mp4 RTSP/1.0
CSeq: 1
User-Agent: Lavf56.40.101

```

The RTSP video stream from the Yi Dashcam will become available to all connected
WiFi clients at `rtsp://192.168.1.254:554/xxxx.mp4` once the app successfully
connects.

When connecting on your own (without the Yi app), you can just make the 1st
and 2nd HTTP requests, then start streaming the RTSP stream.

Video info (from VLC player):

- Type: Video
- Codec: H264 - MPEG-4 AVC (Part 10) (h264)
- Resolution: 640x386
- Display Size: 640x360
- Frame Rate: 30
- Decoded Format: Planar 4:2:0 YUV

Video stats sample (from VLC Player):

- Stream bitrate: 1614 kb/s

- Decoded blocks: 1078
- Displayed frames: 1052
- Lost frames: 12


Taking Picture button <a name="taking-picture-button"></a>
---------------------

The `Taking Picture` button in the app sends the following request to port 80:

```
GET /?custom=1&cmd=3014 HTTP/1.1
Host: 192.168.1.254
Accept: */*
Accept-Language: en-MY;q=1
Connection: keep-alive
Accept-Encoding: gzip, deflate
User-Agent: car-camera/2.01.048 (iPhone; iOS 10.3.1; Scale/2.00)

```

Which gives us this result if we try it on the dashcam ourselves:

```
TJs-MacBook-Pro:R&D tjwoon$ curl -v 'http://192.168.1.254/?custom=1&cmd=3014'
*   Trying 192.168.1.254...
* TCP_NODELAY set
* Connected to 192.168.1.254 (192.168.1.254) port 80 (#0)
> GET /?custom=1&cmd=3014 HTTP/1.1
> Host: 192.168.1.254
> User-Agent: curl/7.51.0
> Accept: */*
>
< HTTP/1.1 200 OK
< Server: hfs/1.00.000
< Cache-Control:no-store, no-cache, must-revalidate
< Pragma: no-cache
< Accept-Ranges: bytes
< Content-length: 1012
< Content-type: text/xml
< Connection: close
<
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>1002</Cmd>
<Status>0</Status>
<Cmd>2016</Cmd>
<Status>1</Status>
<Cmd>2002</Cmd>
<Status>0</Status>
<Cmd>2003</Cmd>
<Status>1</Status>
<Cmd>2004</Cmd>
<Status>1</Status>
<Cmd>2005</Cmd>
<Status>6</Status>
<Cmd>2006</Cmd>
<Status>0</Status>
<Cmd>2007</Cmd>
<Status>0</Status>
<Cmd>2008</Cmd>
<Status>1</Status>
<Cmd>2011</Cmd>
<Status>0</Status>
<Cmd>2012</Cmd>
<Status>1</Status>
<Cmd>3007</Cmd>
<Status>0</Status>
<Cmd>3008</Cmd>
<Status>0</Status>
<Cmd>3009</Cmd>
<Status>0</Status>
<Cmd>3012</Cmd>
<Status>V-1.01.005-US</Status>
<Cmd>3032</Cmd>
<Status>0</Status>
<Cmd>3033</Cmd>
<Status>1</Status>
<Cmd>2020</Cmd>
<Status>1</Status>
<Cmd>3041</Cmd>
<Status>1</Status>
<Cmd>3035</Cmd>
<Status>YICARCAM</Status>
<Cmd>3037</Cmd>
<Status>CA21WSUSCR1620
F2C468</Status>
<Cmd>2030</Cmd>
<Status>0</Status>
<Cmd>2031</Cmd>
<Status>0</Status>
<Cmd>2040</Cmd>
<Status>0</Status>
<Cmd>2050</Cmd>
<Status>0</Status>
<Cmd>2051</Cmd>
<Status>1</Status>
</Function>
* Curl_http_done: called premature == 0
* Closing connection 0
```

However, making the HTTP request ourselves does not cause any image to be
saved to the SD card (no PHOTOS directory is created, or if it already
exists, no new file is created. Only the Emergency Record hardware button
on the device seems to save files to the `PHOTOS/` and `EMR/` folders.


List of commands
----------------

From the [Taking Picture](#taking-picture-button) section above, we have a list
of command IDs.

Summary of commands:

`cmd` 	| Effect
--------|-----------------------------------------------------------------------
1002	| ?
2002	| ?
2003	| ?
2004	| ?
2005	| ?
2006	| ?
2007	| ?
2008	| ?
2011	| ?
2012	| ?
2016	| ? Returns extra data `<Value>159</Value>`
2020	| ?
2030	| ?
2031	| ?
2040	| ?
2050	| ? Hangs the camera thereafter...
2051	| Returns the command list, file list, and 2 separate chunks of binary data. Hangs the camera thereafter...
3007	| ?
3008	| ?
3009	| ?
3012	| Returns the firmware version `<String>V-1.01.005-US</String>`
3014	| Takes a picture? Doesn't seem to work...?
3032	| ?
3033	| ?
3035	| Returns the device model name `<String>YICARCAM</String>`
3037	| Returns the serial number + another data `<String>CA21WSUSCR1620\nF2C468</String>`
3041	| ?

Note that I am not aware which command takes additional parameters e.g.
`/?custom=1&cmd=3001&par=1`.


### 1002

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=1002'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>1002</Cmd>
<Status>0</Status>
</Function>
```

### 2016

Seems to return a different value each time.

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=2016'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>2016</Cmd>
<Status>0</Status>
<Value>159</Value>
</Function>
```

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=2016'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>2016</Cmd>
<Status>0</Status>
<Value>37</Value>
</Function>
```

### 2002

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=2002'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>2002</Cmd>
<Status>0</Status>
</Function>
```

### 2003

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=2003'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>2003</Cmd>
<Status>0</Status>
</Function>
```

### 2004

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=2004'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>2004</Cmd>
<Status>0</Status>
</Function>
```

### 2005

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=2005'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>2005</Cmd>
<Status>0</Status>
</Function>
```

### 2006

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=2006'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>2006</Cmd>
<Status>0</Status>
</Function>
```

### 2007

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=2007'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>2007</Cmd>
<Status>0</Status>
</Function>
```

### 2008

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=2008'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>2008</Cmd>
<Status>0</Status>
</Function>
```

### 2011

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=2011'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>2011</Cmd>
<Status>0</Status>
</Function>
```

### 2012

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=2012'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>2012</Cmd>
<Status>0</Status>
</Function>
```

### 3007

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=3007'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>3007</Cmd>
<Status>0</Status>
</Function>
```

### 3008

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=3008'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>3008</Cmd>
<Status>0</Status>
</Function>
```

### 3009

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=3009'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>3009</Cmd>
<Status>0</Status>
</Function>
```

### 3012

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=3012'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>3012</Cmd>
<Status>0</Status>
<String>V-1.01.005-US</String>
</Function>
```

### 3032

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=3032'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>3032</Cmd>
<Status>0</Status>
</Function>
```

### 3033

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=3033'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>3033</Cmd>
<Status>0</Status>
</Function>
```

### 2020

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=2020'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>2020</Cmd>
<Status>0</Status>
</Function>
```

### 3041

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=3041'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>3041</Cmd>
<Status>0</Status>
</Function>
```

### 3035

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=3035'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>3035</Cmd>
<Status>0</Status>
<String>YICARCAM</String>
</Function>
```

### 3037

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=3037'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>3037</Cmd>
<Status>0</Status>
<String>CA21WSUSCR1620
F2C468</String>
</Function>
```

### 2030

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=2030'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>2030</Cmd>
<Status>0</Status>
</Function>
```

### 2031

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=2031'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>2031</Cmd>
<Status>0</Status>
</Function>
```

### 2040

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=2040'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>2040</Cmd>
<Status>0</Status>
</Function>
```

### 2050

Seems to do something bad. Broke my RTSP stream after running this command.
Remained broken even after restart. Fixed after either:

1. WiFi off/on
2. SD card reformat (via camera)

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=2050'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>2050</Cmd>
<Status>0</Status>
</Function>
```

### 2051

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=2051'
```

Returns command list like `/?custom=1&cmd=3001&par=1`,
... followed by a bunch of binary data ...
Followed by some kinda file list like below,
... followed by more binary data ...

```
ME>2017_0423_170242_476.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_170242_476.MP4</FPATH>
<SIZE>335830928</SIZE>
<TIME>2017/04/23 17:02:42</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_165946_475.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_165946_475.MP4</FPATH>
<SIZE>335415052</SIZE>
<TIME>2017/04/23 16:59:46</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_165647_474.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_165647_474.MP4</FPATH>
<SIZE>336056968</SIZE>
<TIME>2017/04/23 16:56:46</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_165348_473.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_165348_473.MP4</FPATH>
<SIZE>335796408</SIZE>
<TIME>2017/04/23 16:53:48</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_165046_472.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_165046_472.MP4</FPATH>
<SIZE>335722796</SIZE>
<TIME>2017/04/23 16:50:46</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_164750_471.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_164750_471.MP4</FPATH>
<SIZE>335780232</SIZE>
<TIME>2017/04/23 16:47:50</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_164446_470.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_164446_470.MP4</FPATH>
<SIZE>335568352</SIZE>
<TIME>2017/04/23 16:44:46</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_141530_469.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_141530_469.MP4</FPATH>
<SIZE>43598404</SIZE>
<TIME>2017/04/23 14:15:30</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_141230_468.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_141230_468.MP4</FPATH>
<SIZE>335686740</SIZE>
<TIME>2017/04/23 14:12:30</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_141103_467.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_141103_467.MP4</FPATH>
<SIZE>158332463</SIZE>
<TIME>2017/04/23 14:11:02</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_141043_466.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_141043_466.MP4</FPATH>
<SIZE>34312927</SIZE>
<TIME>2017/04/23 14:10:42</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_140828_465.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_140828_465.MP4</FPATH>
<SIZE>248432956</SIZE>
<TIME>2017/04/23 14:08:28</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_140805_464.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_140805_464.MP4</FPATH>
<SIZE>40156171</SIZE>
<TIME>2017/04/23 14:08:04</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_140726_463.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_140726_463.MP4</FPATH>
<SIZE>73472960</SIZE>
<TIME>2017/04/23 14:07:26</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_140426_462.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_140426_462.MP4</FPATH>
<SIZE>335648004</SIZE>
<TIME>2017/04/23 14:04:26</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_140155_461.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_140155_461.MP4</FPATH>
<SIZE>276424459</SIZE>
<TIME>2017/04/23 14:01:56</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_140148_460.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_140148_460.MP4</FPATH>
<SIZE>11436668</SIZE>
<TIME>2017/04/23 14:01:48</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_135849_459.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_135849_459.MP4</FPATH>
<SIZE>335671480</SIZE>
<TIME>2017/04/23 13:58:48</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_135738_458.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_135738_458.MP4</FPATH>
<SIZE>128823835</SIZE>
<TIME>2017/04/23 13:57:38</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_135439_457.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_135439_457.MP4</FPATH>
<SIZE>335665675</SIZE>
<TIME>2017/04/23 13:54:38</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_135331_456.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_135331_456.MP4</FPATH>
<SIZE>127662736</SIZE>
<TIME>2017/04/23 13:53:30</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_135032_455.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_135032_455.MP4</FPATH>
<SIZE>335724296</SIZE>
<TIME>2017/04/23 13:50:32</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_134733_454.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_134733_454.MP4</FPATH>
<SIZE>335701928</SIZE>
<TIME>2017/04/23 13:47:32</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_134434_453.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_134434_453.MP4</FPATH>
<SIZE>335737404</SIZE>
<TIME>2017/04/23 13:44:34</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_134135_452.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_134135_452.MP4</FPATH>
<SIZE>335755460</SIZE>
<TIME>2017/04/23 13:41:34</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_133836_451.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_133836_451.MP4</FPATH>
<SIZE>335761620</SIZE>
<TIME>2017/04/23 13:38:36</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_133537_450.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_133537_450.MP4</FPATH>
<SIZE>335775764</SIZE>
<TIME>2017/04/23 13:35:36</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_133238_449.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_133238_449.MP4</FPATH>
<SIZE>335785516</SIZE>
<TIME>2017/04/23 13:32:38</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_132939_448.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_132939_448.MP4</FPATH>
<SIZE>335672292</SIZE>
<TIME>2017/04/23 13:29:38</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_132640_447.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_132640_447.MP4</FPATH>
<SIZE>335758664</SIZE>
<TIME>2017/04/23 13:26:40</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_132341_446.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_132341_446.MP4</FPATH>
<SIZE>335804580</SIZE>
<TIME>2017/04/23 13:23:40</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_132042_445.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_132042_445.MP4</FPATH>
<SIZE>335705336</SIZE>
<TIME>2017/04/23 13:20:42</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_131743_444.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_131743_444.MP4</FPATH>
<SIZE>335797068</SIZE>
<TIME>2017/04/23 13:17:42</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_131444_443.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_131444_443.MP4</FPATH>
<SIZE>335699496</SIZE>
<TIME>2017/04/23 13:14:44</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_131145_442.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_131145_442.MP4</FPATH>
<SIZE>335691820</SIZE>
<TIME>2017/04/23 13:11:44</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_130845_441.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_130845_441.MP4</FPATH>
<SIZE>335658772</SIZE>
<TIME>2017/04/23 13:08:44</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_130823_440.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_130823_440.MP4</FPATH>
<SIZE>37706999</SIZE>
<TIME>2017/04/23 13:08:22</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_130758_439.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_130758_439.MP4</FPATH>
<SIZE>44590924</SIZE>
<TIME>2017/04/23 13:07:58</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_130749_438.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_130749_438.MP4</FPATH>
<SIZE>12480527</SIZE>
<TIME>2017/04/23 13:07:48</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_130736_437.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_130736_437.MP4</FPATH>
<SIZE>22529383</SIZE>
<TIME>2017/04/23 13:07:36</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_130555_436.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_130555_436.MP4</FPATH>
<SIZE>185776720</SIZE>
<TIME>2017/04/23 13:05:54</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_125054_435.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_125054_435.MP4</FPATH>
<SIZE>23093476</SIZE>
<TIME>2017/04/23 12:50:54</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_124813_434.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_124813_434.MP4</FPATH>
<SIZE>283944456</SIZE>
<TIME>2017/04/23 12:48:12</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_124515_433.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_124515_433.MP4</FPATH>
<SIZE>335739592</SIZE>
<TIME>2017/04/23 12:45:14</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_124215_432.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_124215_432.MP4</FPATH>
<SIZE>335743428</SIZE>
<TIME>2017/04/23 12:42:14</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_123916_431.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_123916_431.MP4</FPATH>
<SIZE>335708728</SIZE>
<TIME>2017/04/23 12:39:16</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_123818_430.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_123818_430.MP4</FPATH>
<SIZE>103280467</SIZE>
<TIME>2017/04/23 12:38:18</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_123611_429.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_123611_429.MP4</FPATH>
<SIZE>242489168</SIZE>
<TIME>2017/04/23 12:36:10</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_123312_428.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_123312_428.MP4</FPATH>
<SIZE>335699712</SIZE>
<TIME>2017/04/23 12:33:12</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_123013_427.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_123013_427.MP4</FPATH>
<SIZE>335883160</SIZE>
<TIME>2017/04/23 12:30:12</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_122714_426.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_122714_426.MP4</FPATH>
<SIZE>335667608</SIZE>
<TIME>2017/04/23 12:27:14</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_122415_425.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_122415_425.MP4</FPATH>
<SIZE>335750912</SIZE>
<TIME>2017/04/23 12:24:14</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_122116_424.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_122116_424.MP4</FPATH>
<SIZE>335738764</SIZE>
<TIME>2017/04/23 12:21:16</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_121817_423.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_121817_423.MP4</FPATH>
<SIZE>335721516</SIZE>
<TIME>2017/04/23 12:18:16</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_121518_422.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_121518_422.MP4</FPATH>
<SIZE>335729224</SIZE>
<TIME>2017/04/23 12:15:18</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_121218_421.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_121218_421.MP4</FPATH>
<SIZE>335634984</SIZE>
<TIME>2017/04/23 12:12:18</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_121204_420.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_121204_420.MP4</FPATH>
<SIZE>4925944</SIZE>
<TIME>2017/04/23 12:12:04</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_115309_419.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_115309_419.MP4</FPATH>
<SIZE>163399164</SIZE>
<TIME>2017/04/23 11:53:08</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_115010_418.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_115010_418.MP4</FPATH>
<SIZE>335848608</SIZE>
<TIME>2017/04/23 11:50:10</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_114710_417.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_114710_417.MP4</FPATH>
<SIZE>335659336</SIZE>
<TIME>2017/04/23 11:47:10</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_114640_416.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_114640_416.MP4</FPATH>
<SIZE>19335704</SIZE>
<TIME>2017/04/23 11:46:40</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_114600_415.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_114600_415.MP4</FPATH>
<SIZE>59122084</SIZE>
<TIME>2017/04/23 11:46:00</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_114301_414.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_114301_414.MP4</FPATH>
<SIZE>335792992</SIZE>
<TIME>2017/04/23 11:43:00</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_114002_413.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_114002_413.MP4</FPATH>
<SIZE>335768760</SIZE>
<TIME>2017/04/23 11:40:02</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_113704_412.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_113704_412.MP4</FPATH>
<SIZE>335734580</SIZE>
<TIME>2017/04/23 11:37:04</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_113404_411.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_113404_411.MP4</FPATH>
<SIZE>335705604</SIZE>
<TIME>2017/04/23 11:34:04</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_113301_411.MP4</NAME>
<FPATH>A:\YICarCam\EMR\2017_0423_113301_411.MP4</FPATH>
<SIZE>37421056</SIZE>
<TIME>2017/04/23 11:33:00</TIME>
<ATTR>33</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_113301_001.JPG</NAME>
<FPATH>A:\YICarCam\Photo\2017_0423_113301_001.JPG</FPATH>
<SIZE>257024</SIZE>
<TIME>2017/04/23 11:33:00</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_113215_410.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_113215_410.MP4</FPATH>
<SIZE>130128864</SIZE>
<TIME>2017/04/23 11:32:14</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_112917_409.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_112917_409.MP4</FPATH>
<SIZE>335826580</SIZE>
<TIME>2017/04/23 11:29:16</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_112617_408.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_112617_408.MP4</FPATH>
<SIZE>335834720</SIZE>
<TIME>2017/04/23 11:26:16</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_112318_407.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_112318_407.MP4</FPATH>
<SIZE>335749256</SIZE>
<TIME>2017/04/23 11:23:18</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_112019_406.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_112019_406.MP4</FPATH>
<SIZE>335743096</SIZE>
<TIME>2017/04/23 11:20:18</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_111720_405.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_111720_405.MP4</FPATH>
<SIZE>335650628</SIZE>
<TIME>2017/04/23 11:17:20</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_111443_404.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_111443_404.MP4</FPATH>
<SIZE>370714820</SIZE>
<TIME>2017/04/23 11:14:42</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_111428_403.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_111428_403.MP4</FPATH>
<SIZE>14104180</SIZE>
<TIME>2017/04/23 11:14:28</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_102837_402.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_102837_402.MP4</FPATH>
<SIZE>9161572</SIZE>
<TIME>2017/04/23 10:28:36</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_102538_401.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_102538_401.MP4</FPATH>
<SIZE>455684772</SIZE>
<TIME>2017/04/23 10:25:38</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_102239_400.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_102239_400.MP4</FPATH>
<SIZE>455583764</SIZE>
<TIME>2017/04/23 10:22:38</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_101940_399.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_101940_399.MP4</FPATH>
<SIZE>455622440</SIZE>
<TIME>2017/04/23 10:19:40</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_101641_398.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_101641_398.MP4</FPATH>
<SIZE>455621384</SIZE>
<TIME>2017/04/23 10:16:40</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_101342_397.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_101342_397.MP4</FPATH>
<SIZE>455650908</SIZE>
<TIME>2017/04/23 10:13:42</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_101043_396.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_101043_396.MP4</FPATH>
<SIZE>455636356</SIZE>
<TIME>2017/04/23 10:10:42</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_100744_395.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_100744_395.MP4</FPATH>
<SIZE>455590204</SIZE>
<TIME>2017/04/23 10:07:44</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_100445_394.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_100445_394.MP4</FPATH>
<SIZE>455599368</SIZE>
<TIME>2017/04/23 10:04:44</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_100146_393.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_100146_393.MP4</FPATH>
<SIZE>455623184</SIZE>
<TIME>2017/04/23 10:01:46</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0423_095847_392.MP4</NAME>
<FPATH>A:\YICarCam\Movie\2017_0423_095847_392.MP4</FPATH>
<SIZE>455605136</SIZE>
<TIME>2017/04/23 09:58:46</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0110_195838_001.JPG</NAME>
<FPATH>A:\YICarCam\Photo\2017_0110_195838_001.JPG</FPATH>
<SIZE>167115</SIZE>
<TIME>2017/01/10 19:58:38</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0110_195837_527.MP4</NAME>
<FPATH>A:\YICarCam\EMR\2017_0110_195837_527.MP4</FPATH>
<SIZE>27983872</SIZE>
<TIME>2017/01/10 19:58:38</TIME>
<ATTR>33</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0101_173358_001.JPG</NAME>
<FPATH>A:\YICarCam\Photo\2017_0101_173358_001.JPG</FPATH>
<SIZE>338236</SIZE>
<TIME>2017/01/01 17:33:58</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2017_0101_173358_255.MP4</NAME>
<FPATH>A:\YICarCam\EMR\2017_0101_173358_255.MP4</FPATH>
<SIZE>27983872</SIZE>
<TIME>2017/01/01 17:33:58</TIME>
<ATTR>33</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2016_1230_221746_001.JPG</NAME>
<FPATH>A:\YICarCam\Photo\2016_1230_221746_001.JPG</FPATH>
<SIZE>332709</SIZE>
<TIME>2016/12/30 22:17:46</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2016_1230_221746_226.MP4</NAME>
<FPATH>A:\YICarCam\EMR\2016_1230_221746_226.MP4</FPATH>
<SIZE>28049408</SIZE>
<TIME>2016/12/30 22:17:46</TIME>
<ATTR>33</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2016_1227_074519_001.JPG</NAME>
<FPATH>A:\YICarCam\Photo\2016_1227_074519_001.JPG</FPATH>
<SIZE>260083</SIZE>
<TIME>2016/12/27 07:45:18</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2016_1227_074519_080.MP4</NAME>
<FPATH>A:\YICarCam\EMR\2016_1227_074519_080.MP4</FPATH>
<SIZE>28049408</SIZE>
<TIME>2016/12/27 07:45:18</TIME>
<ATTR>33</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2016_1226_181517_001.JPG</NAME>
<FPATH>A:\YICarCam\Photo\2016_1226_181517_001.JPG</FPATH>
<SIZE>242786</SIZE>
<TIME>2016/12/26 18:15:18</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2016_1226_181517_058.MP4</NAME>
<FPATH>A:\YICarCam\EMR\2016_1226_181517_058.MP4</FPATH>
<SIZE>28114944</SIZE>
<TIME>2016/12/26 18:15:16</TIME>
<ATTR>33</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2016_1226_092144_001.JPG</NAME>
<FPATH>A:\YICarCam\Photo\2016_1226_092144_001.JPG</FPATH>
<SIZE>267139</SIZE>
<TIME>2016/12/26 09:21:44</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2016_1226_092144_041.MP4</NAME>
<FPATH>A:\YICarCam\EMR\2016_1226_092144_041.MP4</FPATH>
<SIZE>28049408</SIZE>
<TIME>2016/12/26 09:21:44</TIME>
<ATTR>33</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2016_1225_211633_001.JPG</NAME>
<FPATH>A:\YICarCam\Photo\2016_1225_211633_001.JPG</FPATH>
<SIZE>292849</SIZE>
<TIME>2016/12/25 21:16:32</TIME>
<ATTR>32</ATTR></File>
</ALLFile>
<ALLFile><File>
<NAME>2016_1225_211633_026.MP4</NAME>
<FPATH>A:\YICarCam\EMR\2016_1225_211633_026.MP4</FPATH>
<SIZE>28049408</SIZE>
<TIME>2016/12/25 21:16:32</TIME>
<ATTR>33</ATTR></File>
</ALLFile>
</LIST
```

### Sample incorrect command / nonexistant command: 20011

```
TJs-MacBook-Pro:R&D tjwoon$ curl 'http://192.168.1.254/?custom=1&cmd=20011'
<?xml version="1.0" encoding="UTF-8" ?>
<Function>
<Cmd>20011</Cmd>
<Status>-256</Status>
</Function>
```
