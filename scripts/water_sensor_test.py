"""Exercise the bundled sensor without requiring Raspberry Pi hardware."""

import asyncio
from pathlib import Path
import threading
import runpy
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, PropertyMock, patch


TEMPLATES = (
    Path(__file__).resolve().parents[1]
    / "src/features/settings/custom-actions/templates"
)


class WaterSensorTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.device = Mock()
        self.gpio = Mock(DigitalInputDevice=Mock(return_value=self.device))
        self.sdk = Mock()
        self.sdk.Script.return_value.action.return_value = lambda function: function
        self.sdk.Script.return_value.background.return_value = lambda function: function
        self.reading = SimpleNamespace(publish=AsyncMock())
        self.sdk.Script.return_value.reading.return_value = self.reading
        with patch.dict("sys.modules", {
            "pydantic": SimpleNamespace(BaseModel=object, ConfigDict=dict),
            "gpiozero": self.gpio,
            "manafish_sdk": self.sdk,
        }):
            self.script = runpy.run_path(str(TEMPLATES / "waterSensor.py"))
        self.context = SimpleNamespace(notify=AsyncMock())

    def test_only_water_sensor_is_bundled(self):
        self.assertEqual([path.name for path in TEMPLATES.glob("*.py")], ["waterSensor.py"])
        self.assertNotIn("MANIFEST", self.script)
        self.assertEqual(self.sdk.Script.call_args.args, ("water_sensor",))
        self.assertEqual(self.sdk.Script.return_value.reading.call_args.args, ("wet", bool))
        self.sdk.Script.return_value.background.assert_called_once_with(continue_on_disconnect=True)
        self.sdk.Script.return_value.action.assert_called_once_with(name="Toggle monitoring")
        self.assertEqual(self.sdk.Script.return_value.reading.call_args.kwargs["stale_after"], 2.0)

    async def test_readings_always_publish_but_only_changes_notify(self):
        for wet in (True, True, False, False):
            self.device.value = int(wet)
            await self.script["sample"](self.context)
            self.gpio.DigitalInputDevice.assert_called_with(17)
            self.reading.publish.assert_awaited_with(wet)
            self.device.close.assert_called_once_with()
            self.device.close.reset_mock()
        self.assertEqual(self.reading.publish.await_count, 4)
        self.assertEqual(self.context.notify.await_count, 2)
        self.assertEqual(self.context.notify.await_args_list[0].args, ("Water detected",))
        self.assertEqual(self.context.notify.await_args_list[1].args, ("Water sensor dry",))

    async def test_read_failure_closes_pin_reports_error_and_never_publishes_dry(self):
        type(self.device).value = PropertyMock(side_effect=OSError("GPIO read failed"))
        with self.assertRaisesRegex(RuntimeError, "GPIO read failed"):
            await self.script["sample"](self.context)
        self.device.close.assert_called_once_with()
        self.assert_read_error()

    async def test_open_failure_reports_wiring_error(self):
        self.gpio.DigitalInputDevice.side_effect = OSError("GPIO unavailable")
        with self.assertRaisesRegex(RuntimeError, "GPIO unavailable"):
            await self.script["sample"](self.context)
        self.assert_read_error()

    async def test_monitor_samples_immediately_and_yields_between_reads(self):
        self.device.value = 1
        sleeping = asyncio.Event()
        resume = asyncio.Event()

        async def pause(delay):
            self.assertEqual(delay, 0.25)
            sleeping.set()
            await resume.wait()

        with patch.object(self.script["asyncio"], "sleep", pause):
            task = asyncio.create_task(self.script["monitor"](self.context))
            try:
                await asyncio.wait_for(sleeping.wait(), timeout=2)
                self.reading.publish.assert_awaited_once_with(True)
                sleeping.clear()
                resume.set()
                # Let one further sample finish, then cancel at the next yield.
                await asyncio.wait_for(sleeping.wait(), timeout=2)
                self.assertGreaterEqual(self.reading.publish.await_count, 2)
            finally:
                task.cancel()
                with self.assertRaises(asyncio.CancelledError):
                    await task

    async def test_disable_waits_for_inflight_gpio_cleanup(self):
        started = threading.Event()
        release = threading.Event()

        def read():
            started.set()
            if not release.wait(timeout=2):
                raise TimeoutError("Test did not release GPIO read")
            return 1

        type(self.device).value = PropertyMock(side_effect=read)
        task = asyncio.create_task(self.script["sample"](self.context))
        try:
            self.assertTrue(await asyncio.to_thread(started.wait, 2))
            task.cancel()
            await asyncio.sleep(0)
            self.assertFalse(task.done())
        finally:
            release.set()
            with self.assertRaises(asyncio.CancelledError):
                await task
        self.device.close.assert_called_once_with()
        self.reading.publish.assert_not_awaited()
        self.context.notify.assert_not_awaited()

    async def test_pause_skips_gpio_and_resume_reports_a_fresh_result(self):
        self.device.value = 0
        await self.script["sample"](self.context)
        await self.script["toggle_monitoring"](self.context)
        self.reading.publish.assert_awaited_with(None)
        self.gpio.DigitalInputDevice.reset_mock()
        with patch.object(self.script["asyncio"], "sleep", AsyncMock(side_effect=asyncio.CancelledError)):
            with self.assertRaises(asyncio.CancelledError):
                await self.script["monitor"](self.context)
        self.gpio.DigitalInputDevice.assert_not_called()
        await self.script["toggle_monitoring"](self.context)
        self.assertTrue(self.script["sensor_state"].monitoring_enabled)
        await self.script["sample"](self.context)
        self.reading.publish.assert_awaited_with(False)
        self.context.notify.assert_awaited_with(
            "Water sensor dry", level=self.sdk.NotificationLevel.INFO, key="status"
        )

    async def test_pause_waits_for_inflight_read_then_clears_its_result(self):
        started = threading.Event()
        release = threading.Event()

        def read():
            started.set()
            if not release.wait(timeout=2):
                raise TimeoutError("Test did not release GPIO read")
            return 0

        type(self.device).value = PropertyMock(side_effect=read)
        monitor = asyncio.create_task(self.script["monitor"](self.context))
        toggle = None
        try:
            self.assertTrue(await asyncio.to_thread(started.wait, 2))
            toggle = asyncio.create_task(self.script["toggle_monitoring"](self.context))
            await asyncio.sleep(0)
            self.assertFalse(toggle.done())
            release.set()
            await asyncio.wait_for(toggle, timeout=2)
            self.assertEqual([call.args[0] for call in self.reading.publish.await_args_list], [False, None])
            self.assertFalse(self.script["sensor_state"].monitoring_enabled)
            self.device.close.assert_called_once_with()
        finally:
            release.set()
            monitor.cancel()
            await asyncio.gather(monitor, *([toggle] if toggle else []), return_exceptions=True)

    def assert_read_error(self):
        self.reading.publish.assert_awaited_once_with(None)
        self.context.notify.assert_awaited_once_with(
            "Could not read the water sensor",
            level=self.sdk.NotificationLevel.ERROR,
            description="Check the sensor wiring.",
            key="status",
        )


if __name__ == "__main__":
    unittest.main()
