Sentinel
========

This is the collection of small programs which let me do and monitor various
things in and around my car.


General Notes
-------------

Developed to run on:

- Raspberry Pi 3
- Node 6.9.4


Setup
-----

### Networking (Computer to Pi)

As the Yi Dash Cam is always using 192.168.1.0/24 network, if your home Ethernet
is also on 192.168.1.0/24, you will need to connect the Pi to your computer
directly, with a DHCP server on your computer, or more simply, use static
addresses.

To set a static IP for the Pi, edit the file `/etc/dhcpcd.conf`. Add something
like the following:

```
interface eth0
static ip_address=192.168.123.2/24
static routers=192.168.123.1
static domain_name_servers=8.8.8.8
```

You should have the following line in your `/etc/network/interfaces`:

```
iface eth0 inet manual
```

The example assumes we have set our computer on IP 192.168.123.1 on the Ethernet
interface, and will set the Pi to 192.168.123.2. You can then restart the Pi and
connect to it via `ssh pi@192.168.123.2`.

### Networking (Pi to Yi Dash Cam)

Ensure `/etc/network/interfaces` contains the following lines:

```
auto wlan0
```

```
allow-hotplug wlan0
iface wlan0 inet manual
    wpa-conf /etc/wpa_supplicant/wpa_supplicant.conf
```

Add the following lines to `/etc/wpa_supplicant/wpa_supplicant.conf` to
configure the Pi for your Yi Dash Cam's WiFi network. You can use the guide at
https://www.raspberrypi.org/documentation/configuration/wireless/wireless-cli.md
to configure it too.

```
network={
	ssid="YOUR_WIFI_SSID_NAME"
	psk="YOUR_WIFI_PASSWORD"
	proto=RSN
	key_mgmt=WPA-PSK
	pairwise=CCMP
	auth_alg=OPEN
}
```

You may have to run the following command just once, the Pi will then
automatically connect to your Yi Dash Cam WIFi automatically after every reboot.

`$ sudo ifup wlan0`

### Bluetooth A2DP & Handset Profile setup

If you want to setup the Raspberry Pi to be an A2DP and HDP Bluetooth host,
follow these instructions: https://gist.github.com/oleq/24e09112b07464acbda1
