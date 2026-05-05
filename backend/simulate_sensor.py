import paho.mqtt.client as mqtt
import time

BROKER = "test.mosquitto.org"
TOPIC  = "farm/soil_moisture"

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.connect(BROKER, 1883, 60)
client.loop_start()

value     = 25
direction = 5

print(f"Publishing to {BROKER} → {TOPIC}")
try:
    while True:
        client.publish(TOPIC, str(value))
        print(f"  moisture: {value}%")
        value += direction
        if value >= 80: direction = -5
        if value <= 20: direction =  5
        time.sleep(3)
except KeyboardInterrupt:
    print("Stopped.")
    client.loop_stop()
    client.disconnect()
