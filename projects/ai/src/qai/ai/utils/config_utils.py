from typing import Any, Dict


def add_model_params(config: dict[str, Any], in_data: dict[str, Any]) -> None:
    """Add model params to config from in_data"""
    if "model" in in_data:
        config["model"].update(in_data["model"])
    for k, v in in_data.items():
        if k.startswith("model."):
            config["model"][k[6:]] = v


