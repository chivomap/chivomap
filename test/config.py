import json
import os

_config_path = os.path.join(os.path.dirname(__file__), "config.json")

with open(_config_path) as f:
    _config = json.load(f)

BASE_URL = _config.get("localEndpoint", "http://localhost:4173")
DEFAULT_TIMEOUT = 10000
