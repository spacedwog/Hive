import SensorApiHandler from "../lib/sensor/SensorApiHandler";

const handlerInstance = new SensorApiHandler();

export default async function handler(req, res) {
  await handlerInstance.handle(req, res);
}