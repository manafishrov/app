import asyncio
import json
import time
import websockets
import logging
import math
import signal

logging.basicConfig(level=logging.INFO)

clients = set()
shutdown = False

thruster_pin_setup = {
    "identifiers": [5, 4, 3, 1, 2, 7, 6, 8],
    "spinDirections": [1, -1, 1, -1, 1, -1, 1, -1],
}

thruster_allocation = [
    [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0],
]


async def handle_client(websocket):
    global thruster_allocation
    logging.info(f"Client connected from Manafish App at {websocket.remote_address}!")
    clients.add(websocket)

    async def send_status_updates():
        while not shutdown:
            try:
                current_time = time.time()

                pitch = 20 * math.sin(current_time / 2)
                roll = 15 * math.cos(current_time / 3)
                desired_pitch = 25 * math.sin(current_time / 2)
                desired_roll = 20 * math.cos(current_time / 3)
                depth = 10 + 5 * math.sin(current_time / 4)
                temperature = 20 + 5 * math.cos(current_time / 5)
                thruster_erpm_values = [0, 937, 1875, 3750, 7500, 15000, 30000, 60000]

                status_msg = {
                    "type": "status",
                    "payload": {
                        "pitch": round(pitch, 2),
                        "roll": round(roll, 2),
                        "desiredPitch": round(desired_pitch, 2),
                        "desiredRoll": round(desired_roll, 2),
                        "depth": round(depth, 2),
                        "temperature": round(temperature, 2),
                        "thrusterErpms": thruster_erpm_values,
                    },
                }
                await websocket.send(json.dumps(status_msg))
                await asyncio.sleep(1 / 60)
            except Exception as e:
                if not shutdown:
                    logging.error(f"Status update error: {e}")
                break

    async def send_states_updates():
        while not shutdown:
            try:
                states_msg = {
                    "type": "states",
                    "payload": {
                        "pitchStabilization": True,
                        "rollStabilization": True,
                        "depthStabilization": True,
                    },
                }
                await websocket.send(json.dumps(states_msg))
                await asyncio.sleep(0.5)
            except Exception as e:
                if not shutdown:
                    logging.error(f"Settings update error: {e}")
                break

    status_task = asyncio.create_task(send_status_updates())
    settings_task = asyncio.create_task(send_states_updates())

    try:
        async for message in websocket:
            if shutdown:
                break
            try:
                msg_data = json.loads(message)
                msg_type = msg_data.get("type")
                payload = msg_data.get("payload")

                logging.info(
                    f"Received message of type '{msg_type}' with payload: {payload}"
                )

                if msg_type == "getThrusterConfig":
                    logging.info("Sending thruster configuration")
                    pin_setup_msg = {
                        "type": "thrusterPinSetup",
                        "payload": thruster_pin_setup,
                    }
                    allocation_msg = {
                        "type": "thrusterAllocation",
                        "payload": thruster_allocation,
                    }
                    await websocket.send(json.dumps(pin_setup_msg))
                    await websocket.send(json.dumps(allocation_msg))
                elif msg_type == "thrusterPinSetup":
                    thruster_pin_setup.update(payload)
                    logging.info(f"Updated thruster pin setup: {thruster_pin_setup}")
                elif msg_type == "thrusterAllocation":
                    thruster_allocation = payload
                    logging.info(f"Updated thruster allocation: {thruster_allocation}")
                elif msg_type == "testThruster":
                    logging.info(f"Testing thruster with identifier: {payload}")
            except json.JSONDecodeError:
                logging.warning(f"Received non-JSON message: {message}")

    except websockets.exceptions.ConnectionClosed as e:
        if not shutdown:
            logging.info(f"Client disconnected: {e}")
    finally:
        clients.remove(websocket)
        status_task.cancel()
        settings_task.cancel()


async def shutdown_server(server):
    global shutdown
    shutdown = True
    if clients:
        logging.info("Closing client connections...")
        await asyncio.gather(*(ws.close() for ws in clients))
    logging.info("Stopping server...")
    server.close()
    await server.wait_closed()


async def main():
    server = None
    shutdown_event = asyncio.Event()

    def signal_handler():
        logging.info("Shutdown signal received")
        shutdown_event.set()

    try:
        server = await websockets.serve(handle_client, "127.0.0.1", 9000)
        logging.info("Mock server running on 127.0.0.1:9000")
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, signal_handler)
        await shutdown_event.wait()
        await shutdown_server(server)
    except Exception as e:
        logging.error(f"Server error: {e}")
    finally:
        if server and not shutdown:
            await shutdown_server(server)
        logging.info("Server shutdown complete")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
    finally:
        logging.info("Exiting...")
