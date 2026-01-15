"""Unit tests for TOML parsing helpers in `passive_logic_simulator.config`."""

import pytest

from passive_logic_simulator.config import _get_bool, _get_float, _get_str, _require_mapping


def test_require_mapping_validates_type() -> None:
    assert _require_mapping({"x": 1}, key_path="root") == {"x": 1}
    with pytest.raises(ValueError, match="Expected table"):
        _require_mapping(123, key_path="root")


def test_get_float_and_defaults() -> None:
    assert _get_float({"a": 1}, "a", key_path="t") == 1.0
    assert _get_float({}, "a", default=2.5, key_path="t") == 2.5
    with pytest.raises(ValueError, match="Missing required key"):
        _get_float({}, "a", key_path="t")
    with pytest.raises(ValueError, match="Expected number"):
        _get_float({"a": "nope"}, "a", key_path="t")


def test_get_bool_and_defaults() -> None:
    assert _get_bool({"a": True}, "a", key_path="t") is True
    assert _get_bool({}, "a", default=False, key_path="t") is False
    with pytest.raises(ValueError, match="Expected boolean"):
        _get_bool({"a": 1}, "a", key_path="t")


def test_get_str_and_defaults() -> None:
    assert _get_str({"a": "x"}, "a", key_path="t") == "x"
    assert _get_str({}, "a", default="y", key_path="t") == "y"
    with pytest.raises(ValueError, match="Expected string"):
        _get_str({"a": 1}, "a", key_path="t")
