#include <Wire.h>

void setup() {
  Wire.begin(0x08);  // Endereço I2C
  Wire.onReceive(receiveEvent);
  pinMode(13, OUTPUT);  // LED
}

void loop() {}

void receiveEvent(int howMany) {
  String cmd = "";
  while (Wire.available()) {
    char c = Wire.read();
    cmd += c;
  }

  if (cmd == "ALERT") {
    digitalWrite(13, HIGH);  // Aciona LED
    delay(2000);
    digitalWrite(13, LOW);
  }
}