# BLEMovementDetector
An Arduino sketch for the Genuino 101 to upload movement detection data via BLE to a Raspberry Pi, who will in turn upload to a pubnub channel

The Genuino wil detect motion via the connected PIR sensor. The motion status (motion started/motion ended) is sent via BLE to the Raspberry PI.
The PI will run the nodejs script and will forward themotion information to the applicable PubNub channel.

Connect PIR motion sensor to Genuino 101 in the following way:
- data pin to PIN D3
- power to +5V pin
- ground to ground pin

